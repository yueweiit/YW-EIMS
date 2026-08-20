import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@eims/database';
import { OpenIdService } from './openid.service';
import type {
  OAuth2TokenResponse,
  OAuth2UserInfo,
} from './interfaces/oauth2.interface';

@Injectable()
export class OAuth2Service {
  private readonly logger = new Logger(OAuth2Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly openidService: OpenIdService,
  ) {}

  /**
   * Validate the authorize request parameters and return client info.
   */
  async validateAuthorizeRequest(
    clientId: string,
    redirectUri: string,
    responseType: string,
    scope?: string,
    codeChallenge?: string,
    codeChallengeMethod?: string,
  ) {
    this.assertProviderEnabled();
    if (responseType !== 'code') {
      throw new BadRequestException(
        'unsupported_response_type: only "code" is supported',
      );
    }

    const client = await this.prisma.oauth2Client.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        name: true,
        redirectUris: true,
        scopes: true,
        status: true,
      },
    });

    if (!client || client.status === '2') {
      throw new BadRequestException(
        'invalid_client: client not found or disabled',
      );
    }

    if (!client.redirectUris.includes(redirectUri)) {
      throw new BadRequestException(
        'invalid_redirect_uri: redirect_uri does not match registered URIs',
      );
    }

    const requestedScopes = scope ? scope.split(' ') : ['openid'];
    const allowedScopes =
      client.scopes.length > 0 ? client.scopes : ['openid', 'profile', 'email'];
    const invalidScopes = requestedScopes.filter(
      (s) => !allowedScopes.includes(s),
    );
    if (invalidScopes.length > 0) {
      throw new BadRequestException(
        `invalid_scope: scopes not allowed: ${invalidScopes.join(', ')}`,
      );
    }
    if (codeChallenge && codeChallengeMethod !== 'S256') {
      throw new BadRequestException(
        'invalid_request: only S256 code_challenge_method is supported',
      );
    }
    if (codeChallengeMethod && !codeChallenge) {
      throw new BadRequestException(
        'invalid_request: code_challenge is required',
      );
    }

    return {
      clientId: client.clientId,
      name: client.name,
      requestedScopes,
    };
  }

  /**
   * Create an authorization code and return it.
   */
  async createAuthorizationCode(
    clientId: string,
    userId: number,
    redirectUri: string,
    scopes: string[],
    codeChallenge?: string,
    codeChallengeMethod?: string,
  ): Promise<string> {
    this.assertProviderEnabled();
    const rawCode = randomBytes(32).toString('base64url');
    const codeHash = createHash('sha256').update(rawCode).digest('hex');
    const codeExpiresIn =
      this.configService.get<number>('OAUTH2_AUTH_CODE_EXPIRES_IN') || 600;

    await this.prisma.oauth2AuthorizationCode.create({
      data: {
        code: codeHash,
        clientId,
        userId,
        redirectUri,
        scopes,
        codeChallenge,
        codeChallengeMethod,
        expiresAt: new Date(Date.now() + codeExpiresIn * 1000),
      },
    });

    return rawCode;
  }

  /**
   * Exchange an authorization code for tokens.
   */
  async exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<OAuth2TokenResponse> {
    this.assertProviderEnabled();
    // Verify client credentials
    const client = await this.prisma.oauth2Client.findUnique({
      where: { clientId },
      select: { clientId: true, clientSecret: true, status: true },
    });

    if (!client || client.status === '2') {
      throw new UnauthorizedException('invalid_client');
    }

    if (!(await this.verifyClientSecret(client.clientSecret, clientSecret))) {
      throw new UnauthorizedException('invalid_client');
    }

    // Find and validate the authorization code
    const codeHash = createHash('sha256').update(code).digest('hex');
    const now = new Date();

    const authCode = await this.prisma.oauth2AuthorizationCode.findUnique({
      where: { code: codeHash },
      select: {
        id: true,
        clientId: true,
        userId: true,
        redirectUri: true,
        scopes: true,
        codeChallenge: true,
        codeChallengeMethod: true,
        expiresAt: true,
        consumedAt: true,
      },
    });

    if (!authCode || authCode.consumedAt || authCode.expiresAt <= now) {
      throw new UnauthorizedException(
        'invalid_grant: authorization code is invalid or expired',
      );
    }

    if (authCode.clientId !== clientId) {
      throw new UnauthorizedException(
        'invalid_grant: authorization code was not issued to this client',
      );
    }

    if (authCode.redirectUri !== redirectUri) {
      throw new UnauthorizedException('invalid_grant: redirect_uri mismatch');
    }

    if (authCode.codeChallenge) {
      if (!codeVerifier || authCode.codeChallengeMethod !== 'S256') {
        throw new UnauthorizedException(
          'invalid_grant: code_verifier is required',
        );
      }
      const verifierHash = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
      if (verifierHash !== authCode.codeChallenge) {
        throw new UnauthorizedException(
          'invalid_grant: code_verifier is invalid',
        );
      }
    }

    // Atomically consume the code
    const consumed = await this.prisma.oauth2AuthorizationCode.updateMany({
      where: {
        id: authCode.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    if (consumed.count !== 1) {
      throw new UnauthorizedException(
        'invalid_grant: authorization code already used',
      );
    }

    // Generate tokens
    const user = await this.prisma.user.findUnique({
      where: { id: authCode.userId },
      select: {
        id: true,
        userName: true,
        realName: true,
        email: true,
        status: true,
      },
    });

    if (!user || user.status === '2') {
      throw new UnauthorizedException(
        'invalid_grant: user not found or disabled',
      );
    }

    const accessTokenExpiresIn =
      this.configService.get<number>('OAUTH2_ACCESS_TOKEN_EXPIRES_IN') || 3600;
    const refreshTokenExpiresIn =
      this.configService.get<number>('OAUTH2_REFRESH_TOKEN_EXPIRES_IN') ||
      2592000;
    const issuer =
      this.configService.get<string>('OAUTH2_ISSUER') ||
      'http://localhost:3006';

    const accessTokenJwt = this.openidService.signIdToken(
      {
        sub: String(user.id),
        client_id: clientId,
        aud: clientId,
        scope: authCode.scopes.join(' '),
        token_type: 'access_token',
      },
      accessTokenExpiresIn,
    );

    // Generate refresh token
    const rawRefreshToken = randomBytes(32).toString('base64url');
    const refreshTokenHash = createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    await this.prisma.oauth2RefreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        clientId,
        userId: user.id,
        scopes: authCode.scopes,
        expiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
      },
    });

    // Generate ID Token if openid scope is present
    let idToken: string | undefined;
    if (authCode.scopes.includes('openid')) {
      const idTokenClaims: Record<string, unknown> = {
        sub: String(user.id),
        aud: clientId,
      };

      if (authCode.scopes.includes('profile')) {
        idTokenClaims.name = user.realName || user.userName;
        idTokenClaims.preferred_username = user.userName;
        if (user.realName) {
          // Try to split Chinese name: first char as family, rest as given
          idTokenClaims.family_name = user.realName.charAt(0);
          idTokenClaims.given_name = user.realName.substring(1);
        }
      }

      if (authCode.scopes.includes('email') && user.email) {
        idTokenClaims.email = user.email;
      }

      const idTokenExpiresIn =
        this.configService.get<number>('OAUTH2_ACCESS_TOKEN_EXPIRES_IN') ||
        3600;
      idToken = this.openidService.signIdToken(idTokenClaims, idTokenExpiresIn);
    }

    return {
      access_token: accessTokenJwt,
      token_type: 'Bearer',
      expires_in: accessTokenExpiresIn,
      refresh_token: rawRefreshToken,
      id_token: idToken,
    };
  }

  /**
   * Refresh an access token using a refresh token.
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ): Promise<OAuth2TokenResponse> {
    this.assertProviderEnabled();
    // Verify client credentials
    const client = await this.prisma.oauth2Client.findUnique({
      where: { clientId },
      select: { clientId: true, clientSecret: true, status: true },
    });

    if (
      !client ||
      client.status === '2' ||
      !(await this.verifyClientSecret(client.clientSecret, clientSecret))
    ) {
      throw new UnauthorizedException('invalid_client');
    }

    // Validate refresh token
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const now = new Date();

    const tokenRecord = await this.prisma.oauth2RefreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        clientId: true,
        userId: true,
        scopes: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt <= now) {
      throw new UnauthorizedException(
        'invalid_grant: refresh token is invalid or expired',
      );
    }

    if (tokenRecord.clientId !== clientId) {
      throw new UnauthorizedException(
        'invalid_grant: refresh token was not issued to this client',
      );
    }

    // Rotate refresh token: revoke old, create new
    const revoked = await this.prisma.oauth2RefreshToken.updateMany({
      where: { id: tokenRecord.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
    if (revoked.count !== 1) {
      throw new UnauthorizedException(
        'invalid_grant: refresh token already used',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId },
      select: { id: true, status: true },
    });
    if (!user || user.status === '2') {
      throw new UnauthorizedException(
        'invalid_grant: user not found or disabled',
      );
    }

    const accessTokenExpiresIn =
      this.configService.get<number>('OAUTH2_ACCESS_TOKEN_EXPIRES_IN') || 3600;
    const refreshTokenExpiresIn =
      this.configService.get<number>('OAUTH2_REFRESH_TOKEN_EXPIRES_IN') ||
      2592000;

    const accessTokenJwt = this.openidService.signIdToken(
      {
        sub: String(tokenRecord.userId),
        client_id: clientId,
        aud: clientId,
        scope: tokenRecord.scopes.join(' '),
        token_type: 'access_token',
      },
      accessTokenExpiresIn,
    );

    const rawRefreshToken = randomBytes(32).toString('base64url');
    const newRefreshTokenHash = createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    await this.prisma.oauth2RefreshToken.create({
      data: {
        tokenHash: newRefreshTokenHash,
        clientId,
        userId: tokenRecord.userId,
        scopes: tokenRecord.scopes,
        expiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
      },
    });

    return {
      access_token: accessTokenJwt,
      token_type: 'Bearer',
      expires_in: accessTokenExpiresIn,
      refresh_token: rawRefreshToken,
    };
  }

  /**
   * Get user info for a valid access token.
   */
  async getUserInfo(accessToken: string): Promise<OAuth2UserInfo> {
    this.assertProviderEnabled();
    try {
      const payload = this.openidService.verifyToken<{
        sub: string;
        client_id?: string;
        aud?: string;
        scope?: string;
        token_type?: string;
      }>(accessToken);
      if (
        payload.token_type !== 'access_token' ||
        !payload.client_id ||
        payload.aud !== payload.client_id
      ) {
        throw new UnauthorizedException('invalid_token');
      }
      const client = await this.prisma.oauth2Client.findUnique({
        where: { clientId: payload.client_id },
        select: { status: true },
      });
      if (!client || client.status === '2')
        throw new UnauthorizedException('invalid_token');
      const userId = parseInt(payload.sub, 10);
      if (isNaN(userId)) {
        throw new UnauthorizedException('invalid_token: invalid sub claim');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          userName: true,
          realName: true,
          email: true,
          status: true,
        },
      });

      if (!user || user.status === '2') {
        throw new UnauthorizedException(
          'invalid_token: user not found or disabled',
        );
      }

      const scope = payload.scope || '';
      const scopes = scope.split(' ');
      const userInfo: OAuth2UserInfo = {
        sub: String(user.id),
      };

      if (scopes.includes('profile')) {
        userInfo.name = user.realName || user.userName;
        userInfo.preferred_username = user.userName;
        if (user.realName) {
          userInfo.family_name = user.realName.charAt(0);
          userInfo.given_name = user.realName.substring(1);
        }
      }

      if (scopes.includes('email') && user.email) {
        userInfo.email = user.email;
      }

      // 查询账号绑定，返回业务系统用户信息
      const clientId = payload.client_id;
      if (clientId) {
        const binding = await this.prisma.oauth2UserBinding.findUnique({
          where: {
            ssoUserId_clientId: {
              ssoUserId: userId,
              clientId,
            },
          },
          select: { appUserId: true, appUsername: true },
        });
        if (binding) {
          userInfo.app_user_id = binding.appUserId;
          userInfo.app_username = binding.appUsername || undefined;
        }
      }

      return userInfo;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('invalid_token');
    }
  }

  /**
   * Revoke a refresh token.
   */
  async revokeToken(
    token: string,
    clientId?: string,
    clientSecret?: string,
  ): Promise<void> {
    this.assertProviderEnabled();
    if (clientId && clientSecret) {
      const client = await this.prisma.oauth2Client.findUnique({
        where: { clientId },
        select: { clientId: true, clientSecret: true },
      });
      if (
        !client ||
        !(await this.verifyClientSecret(client.clientSecret, clientSecret))
      ) {
        throw new UnauthorizedException('invalid_client');
      }
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.oauth2RefreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, revokedAt: true },
    });

    if (record && !record.revokedAt) {
      await this.prisma.oauth2RefreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });
    }
    // Per RFC 7009, always return 200 even if token not found
  }

  private async verifyClientSecret(
    storedSecret: string,
    providedSecret: string,
  ): Promise<boolean> {
    if (
      storedSecret.startsWith('$2a$') ||
      storedSecret.startsWith('$2b$') ||
      storedSecret.startsWith('$2y$')
    ) {
      return bcrypt.compare(providedSecret, storedSecret);
    }
    return storedSecret === providedSecret;
  }

  private assertProviderEnabled() {
    if (
      this.configService.get<string>('OAUTH2_PROVIDER_ENABLED', 'true') !==
      'true'
    ) {
      throw new ForbiddenException('OAuth2 provider is disabled');
    }
  }
}
