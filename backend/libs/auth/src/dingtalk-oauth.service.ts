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

    const subject = await this.fetchDingTalkSubject(code);
    const userId = await this.authService.findEnabledUserByDingTalkSubject(subject);
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

  private async fetchDingTalkSubject(code: string): Promise<string> {
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

      const subject = userData.unionId || userData.openId || userData.userId || userData.userid;
      if (!subject) {
        throw new UnprocessableEntityException('钉钉未返回用户标识');
      }
      return subject;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof UnprocessableEntityException) {
        throw error;
      }
      this.logger.warn(`DingTalk OAuth user lookup failed: ${this.getErrorMessage(error)}`);
      throw new UnauthorizedException('钉钉授权失败');
    }
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

  private getFrontendUrl() {
    return this.configService.get<string>('EIMS_FRONTEND_URL', 'http://localhost:9527');
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
