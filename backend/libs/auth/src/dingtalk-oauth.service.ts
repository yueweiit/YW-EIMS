import { randomBytes } from 'node:crypto';
import {
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '@eims/database';
import { AuthService } from './auth.service';

interface DingTalkStatePayload {
  purpose: 'dingtalk-oauth';
  nonce: string;
}

interface DingTalkUserAccessTokenResponse {
  accessToken?: string;
  access_token?: string;
}

interface DingTalkAppAccessTokenResponse {
  accessToken?: string;
  expireIn?: number;
}

interface DingTalkUserByUnionIdResponse {
  errcode?: number;
  errmsg?: string;
  result?: {
    userid?: string;
    userId?: string;
  };
}

interface DingTalkCurrentUserResponse {
  unionId?: string;
  openId?: string;
  userId?: string;
  userid?: string;
}

@Injectable()
export class DingTalkOAuthService {
  private readonly logger = new Logger(DingTalkOAuthService.name);
  private readonly stateSecret: string;
  private appAccessTokenCache?: { token: string; expiresAt: number };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {
    this.stateSecret =
      this.configService.get<string>('JWT_SECRET') || 'development-state-secret';
  }

  async getAuthorizationUrl(): Promise<string> {
    this.assertConfigured();

    const state = await this.jwtService.signAsync<DingTalkStatePayload>(
      {
        purpose: 'dingtalk-oauth',
        nonce: randomBytes(16).toString('hex'),
      },
      {
        secret: this.stateSecret,
        expiresIn: '10m',
      },
    );

    const url = new URL('https://login.dingtalk.com/oauth2/auth');
    url.searchParams.set('redirect_uri', this.getRedirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.getClientId());
    url.searchParams.set('scope', this.getScopes());
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'consent');
    return url.toString();
  }

  async handleCallback(code: string, state: string): Promise<string> {
    this.assertConfigured();

    try {
      const payload = await this.jwtService.verifyAsync<DingTalkStatePayload>(state, {
        secret: this.stateSecret,
      });
      if (payload.purpose !== 'dingtalk-oauth' || !payload.nonce) {
        throw new UnauthorizedException('钉钉授权状态无效');
      }
    } catch {
      throw new UnauthorizedException('钉钉授权状态无效或已过期');
    }

    const identity = await this.fetchDingTalkIdentity(code);
    if (this.isDebugEnabled()) {
      this.logger.debug(
        `DingTalk OAuth identity: subject=${identity.subject}, unionId=${identity.unionId || '-'}, openId=${identity.openId || '-'}, userId=${identity.userId || '-'}`,
      );
    }

    const userId = await this.authService.findEnabledUserByDingTalkSubjects([
      identity.userId,
      identity.unionId,
      identity.openId,
      identity.subject,
    ]);
    const rawTicket = randomBytes(32).toString('base64url');
    const ticketHash = this.hashTicket(rawTicket);

    await this.prisma.authLoginTicket.create({
      data: {
        ticketHash,
        userId,
        expiresAt: new Date(Date.now() + 60 * 1000),
      },
    });

    return rawTicket;
  }

  getFrontendRedirect(params: Record<string, string>): string {
    const url = new URL('/login', this.getFrontendUrl());
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  }

  hashTicket(ticket: string): string {
    return this.authService.hashLoginTicket(ticket);
  }

  private async fetchDingTalkIdentity(code: string): Promise<{
    subject: string;
    unionId?: string;
    openId?: string;
    userId?: string;
  }> {
    try {
      const { data: tokenData } = await firstValueFrom(
        this.httpService.post<DingTalkUserAccessTokenResponse>(
          'https://api.dingtalk.com/v1.0/oauth2/userAccessToken',
          {
            clientId: this.getClientId(),
            clientSecret: this.getClientSecret(),
            code,
            grantType: 'authorization_code',
          },
        ),
      );

      const accessToken = tokenData.accessToken || tokenData.access_token;
      if (!accessToken) {
        throw new UnprocessableEntityException('钉钉未返回用户访问令牌');
      }

      const { data: userData } = await firstValueFrom(
        this.httpService.get<DingTalkCurrentUserResponse>(
          'https://api.dingtalk.com/v1.0/contact/users/me',
          { headers: { 'x-acs-dingtalk-access-token': accessToken } },
        ),
      );

      const returnedUserId = userData.userId || userData.userid;
      const userId =
        returnedUserId ||
        (userData.unionId ? await this.fetchDingTalkUserId(userData.unionId) : undefined);
      const subject = userData.unionId || userData.openId || userId;
      if (!subject) {
        throw new UnprocessableEntityException('钉钉未返回用户标识');
      }
      return {
        subject,
        unionId: userData.unionId,
        openId: userData.openId,
        userId,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof UnprocessableEntityException) {
        throw error;
      }
      this.logger.warn(`DingTalk OAuth user lookup failed: ${this.getErrorMessage(error)}`);
      throw new UnauthorizedException('钉钉授权失败');
    }
  }

  private async fetchDingTalkUserId(unionId: string): Promise<string> {
    const appAccessToken = await this.getDingTalkAppAccessToken();
    const url = new URL('https://oapi.dingtalk.com/topapi/user/getbyunionid');
    url.searchParams.set('access_token', appAccessToken);

    const { data } = await firstValueFrom(
      this.httpService.post<DingTalkUserByUnionIdResponse>(url.toString(), {
        unionid: unionId,
      }),
    );
    const userId = data.result?.userid || data.result?.userId;
    if (data.errcode !== undefined && data.errcode !== 0) {
      this.logger.warn(
        `DingTalk unionId lookup failed: errcode=${data.errcode}, errmsg=${data.errmsg || '-'}`,
      );
      throw new UnprocessableEntityException('钉钉无法根据 unionId 获取 userId');
    }
    if (!userId) {
      throw new UnprocessableEntityException('钉钉未返回 userId');
    }
    return userId;
  }

  private async getDingTalkAppAccessToken(): Promise<string> {
    if (
      this.appAccessTokenCache &&
      this.appAccessTokenCache.expiresAt > Date.now()
    ) {
      return this.appAccessTokenCache.token;
    }

    const { data } = await firstValueFrom(
      this.httpService.post<DingTalkAppAccessTokenResponse>(
        'https://api.dingtalk.com/v1.0/oauth2/accessToken',
        {
          appKey: this.getClientId(),
          appSecret: this.getClientSecret(),
        },
      ),
    );
    if (!data.accessToken) {
      throw new UnprocessableEntityException('钉钉未返回应用访问凭证');
    }

    const cacheSeconds = Math.max((data.expireIn ?? 7200) - 300, 0);
    this.appAccessTokenCache = {
      token: data.accessToken,
      expiresAt: Date.now() + cacheSeconds * 1000,
    };
    return data.accessToken;
  }

  private assertConfigured() {
    if (!this.getClientId() || !this.getClientSecret() || !this.getRedirectUri()) {
      throw new UnprocessableEntityException('钉钉 OAuth 登录尚未配置');
    }
  }

  private getClientId() {
    return this.configService.get<string>('DINGTALK_OAUTH_CLIENT_ID', '').trim();
  }

  private getClientSecret() {
    return this.configService.get<string>('DINGTALK_OAUTH_CLIENT_SECRET', '').trim();
  }

  private getRedirectUri() {
    return this.configService.get<string>('DINGTALK_OAUTH_REDIRECT_URI', '').trim();
  }

  private getScopes() {
    return this.configService.get<string>('DINGTALK_OAUTH_SCOPES', 'openid').trim() || 'openid';
  }

  private isDebugEnabled() {
    return this.configService.get<string>('DINGTALK_OAUTH_DEBUG', 'false') === 'true';
  }

  private getFrontendUrl() {
    return this.configService.get<string>('EIMS_FRONTEND_URL', 'http://localhost:9527');
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
