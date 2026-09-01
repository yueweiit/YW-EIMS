import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
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
    state?: string,
    nonce?: string,
  ) {
    this.assertProviderEnabled();
    if (responseType !== 'code') {
      throw new BadRequestException(
        'unsupported_response_type: only "code" is supported',
      );
    }

    if (!state || state.length > 512) {
      throw new BadRequestException(
        'invalid_request: state is required and must be at most 512 characters',
      );
    }
    if (nonce !== undefined && nonce.length > 255) {
      throw new BadRequestException('invalid_request: nonce is too long');
    }
    if (
      !codeChallenge ||
      codeChallengeMethod !== 'S256' ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)
    ) {
      throw new BadRequestException(
        'invalid_request: S256 code_challenge is required',
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

    if (!client || client.status !== '1') {
      throw new BadRequestException(
        'invalid_client: client not found or disabled',
      );
    }

    if (
      !client.redirectUris.includes(redirectUri) ||
      !this.isAllowedRedirectUri(redirectUri)
    ) {
      throw new BadRequestException(
        'invalid_redirect_uri: redirect_uri does not match registered URIs',
      );
    }

    const requestedScopes = scope
      ? [...new Set(scope.split(/\s+/).filter(Boolean))]
      : ['openid'];
    if (requestedScopes.length === 0) {
      throw new BadRequestException('invalid_scope: at least one scope is required');
    }
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
    return {
      clientId: client.clientId,
      name: client.name,
      requestedScopes,
    };
  }

  /**
   * Store the complete authorization request server-side. The browser only
   * receives the random transaction ID, so it cannot alter redirect_uri,
   * scopes, state, or PKCE values on the consent page.
   */
  async createAuthorizationRequest(
    clientId: string,
    redirectUri: string,
    scopes: string[],
    state: string,
    codeChallenge: string,
    codeChallengeMethod: string,
    browserNonceHash: string,
    nonce?: string,
  ): Promise<string> {
    this.assertProviderEnabled();
    const transactionId = randomBytes(32).toString('base64url');
    const expiresIn =
      this.configService.get<number>('OAUTH2_AUTH_CODE_EXPIRES_IN') || 600;

    await this.prisma.oauth2AuthorizationRequest.create({
      data: {
        transactionId,
        clientId,
        redirectUri,
        scopes,
        state,
        browserNonceHash,
        nonce,
        codeChallenge,
        codeChallengeMethod,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    return transactionId;
  }

  /** Return only consent-screen metadata; sensitive OAuth parameters stay server-side. */
  async getAuthorizationRequest(transactionId: string, browserNonce?: string) {
    const request = await this.loadAuthorizationRequest(
      transactionId,
      browserNonce,
    );
    return {
      transactionId: request.transactionId,
      clientName: request.client.name,
      scopes: request.scopes,
    };
  }

  /** Consume an authorization request exactly once and create its callback URL. */
  async completeAuthorizationRequest(
    transactionId: string,
    userId: number,
    consent: string,
    browserNonce?: string,
  ) {
    this.assertProviderEnabled();
    const request = await this.loadAuthorizationRequest(
      transactionId,
      browserNonce,
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!user || user.status !== '1') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    const now = new Date();
    const consumed = await this.prisma.oauth2AuthorizationRequest.updateMany({
      where: {
        id: request.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) {
      throw new BadRequestException('OAuth 授权请求已使用或已过期');
    }

    const callbackUrl = new URL(request.redirectUri);
    if (consent !== 'true') {
      callbackUrl.searchParams.set('error', 'access_denied');
      callbackUrl.searchParams.set('state', request.state);
      return callbackUrl.toString();
    }

    const code = await this.createAuthorizationCode(
      request.clientId,
      user.id,
      request.redirectUri,
      request.scopes,
      request.codeChallenge,
      request.codeChallengeMethod,
      request.nonce || undefined,
    );
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('state', request.state);
    return callbackUrl.toString();
  }

  /**
   * Create an authorization code and return it.
   */
  async createAuthorizationCode(
    clientId: string,
    userId: number,
    redirectUri: string,
    scopes: string[],
    codeChallenge: string,
    codeChallengeMethod: string,
    nonce?: string,
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
        nonce,
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

    if (!client || client.status !== '1') {
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
        nonce: true,
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
    if (!this.isAllowedRedirectUri(redirectUri)) {
      throw new UnauthorizedException(
        'invalid_grant: redirect_uri must use HTTPS',
      );
    }

    if (
      !authCode.codeChallenge ||
      authCode.codeChallengeMethod !== 'S256' ||
      !codeVerifier ||
      !/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)
    ) {
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

    if (!user || user.status !== '1') {
      throw new UnauthorizedException(
        'invalid_grant: user not found or disabled',
      );
    }

    const accessTokenExpiresIn =
      this.configService.get<number>('OAUTH2_ACCESS_TOKEN_EXPIRES_IN') || 3600;
    const refreshTokenExpiresIn =
      this.configService.get<number>('OAUTH2_REFRESH_TOKEN_EXPIRES_IN') ||
      2592000;
    const familyId = this.createTokenFamilyId();
    const accessTokenJwt = await this.createAccessToken(
      clientId,
      user.id,
      authCode.scopes,
      accessTokenExpiresIn,
      familyId,
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
        familyId,
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
      if (authCode.nonce) idTokenClaims.nonce = authCode.nonce;

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
      client.status !== '1' ||
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
        familyId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!tokenRecord || tokenRecord.expiresAt <= now) {
      throw new UnauthorizedException(
        'invalid_grant: refresh token is invalid or expired',
      );
    }

    if (tokenRecord.clientId !== clientId) {
      throw new UnauthorizedException(
        'invalid_grant: refresh token was not issued to this client',
      );
    }

    if (tokenRecord.revokedAt) {
      await this.revokeRefreshTokenFamily(
        tokenRecord.userId,
        tokenRecord.clientId,
        tokenRecord.familyId,
      );
      throw new UnauthorizedException(
        'invalid_grant: refresh token was already used',
      );
    }

    // Rotate refresh token: revoke old, create new
    const revoked = await this.prisma.oauth2RefreshToken.updateMany({
      where: { id: tokenRecord.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
    if (revoked.count !== 1) {
      await this.revokeRefreshTokenFamily(
        tokenRecord.userId,
        tokenRecord.clientId,
        tokenRecord.familyId,
      );
      throw new UnauthorizedException(
        'invalid_grant: refresh token already used',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId },
      select: { id: true, status: true },
    });
    if (!user || user.status !== '1') {
      throw new UnauthorizedException(
        'invalid_grant: user not found or disabled',
      );
    }

    const accessTokenExpiresIn =
      this.configService.get<number>('OAUTH2_ACCESS_TOKEN_EXPIRES_IN') || 3600;
    const refreshTokenExpiresIn =
      this.configService.get<number>('OAUTH2_REFRESH_TOKEN_EXPIRES_IN') ||
      2592000;
    const familyId = tokenRecord.familyId || this.createTokenFamilyId();

    const accessTokenJwt = await this.createAccessToken(
      clientId,
      tokenRecord.userId,
      tokenRecord.scopes,
      accessTokenExpiresIn,
      familyId,
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
        familyId,
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
      const tokenRecord = await this.prisma.oauth2AccessToken.findUnique({
        where: { tokenHash: this.hashAccessToken(accessToken) },
        select: {
          clientId: true,
          userId: true,
          scopes: true,
          expiresAt: true,
          revokedAt: true,
        },
      });
      if (
        !tokenRecord ||
        tokenRecord.revokedAt ||
        tokenRecord.expiresAt <= new Date() ||
        tokenRecord.clientId !== payload.client_id
      ) {
        throw new UnauthorizedException('invalid_token');
      }
      const client = await this.prisma.oauth2Client.findUnique({
        where: { clientId: payload.client_id },
        select: { status: true },
      });
      if (!client || client.status !== '1')
        throw new UnauthorizedException('invalid_token');
      if (typeof payload.sub !== 'string' || !/^\d+$/.test(payload.sub)) {
        throw new UnauthorizedException('invalid_token: invalid sub claim');
      }
      const userId = parseInt(payload.sub, 10);
      if (tokenRecord.userId !== userId) {
        throw new UnauthorizedException('invalid_token');
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

      if (!user || user.status !== '1') {
        throw new UnauthorizedException(
          'invalid_token: user not found or disabled',
        );
      }

      const scopes = tokenRecord.scopes;
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
    clientId: string,
    clientSecret: string,
  ): Promise<void> {
    this.assertProviderEnabled();
    const client = await this.prisma.oauth2Client.findUnique({
      where: { clientId },
      select: { clientId: true, clientSecret: true, status: true },
    });
    if (
      !client ||
      client.status !== '1' ||
      !(await this.verifyClientSecret(client.clientSecret, clientSecret))
    ) {
      throw new UnauthorizedException('invalid_client');
    }

    const tokenHash = this.hashAccessToken(token);
    const revokedAt = new Date();
    const refreshRecord = await this.prisma.oauth2RefreshToken.findUnique({
      where: { tokenHash },
      select: { userId: true, clientId: true, familyId: true },
    });
    await Promise.all([
      this.prisma.oauth2AccessToken.updateMany({
        where: { tokenHash, clientId, revokedAt: null },
        data: { revokedAt },
      }),
      this.prisma.oauth2RefreshToken.updateMany({
        where: { tokenHash, clientId, revokedAt: null },
        data: { revokedAt },
      }),
    ]);
    if (refreshRecord && refreshRecord.clientId === clientId) {
      await this.revokeRefreshTokenFamily(
        refreshRecord.userId,
        clientId,
        refreshRecord.familyId,
      );
    }
    // Per RFC 7009, always return 200 even if token not found.
  }

  async revokeUserRefreshTokens(userId: number, clientId?: string) {
    const revokedAt = new Date();
    const [refreshTokens, accessTokens] = await Promise.all([
      this.prisma.oauth2RefreshToken.updateMany({
        where: {
          userId,
          ...(clientId ? { clientId } : {}),
          revokedAt: null,
        },
        data: { revokedAt },
      }),
      this.prisma.oauth2AccessToken.updateMany({
        where: {
          userId,
          ...(clientId ? { clientId } : {}),
          revokedAt: null,
        },
        data: { revokedAt },
      }),
    ]);
    return { refreshTokens, accessTokens };
  }

  async isRegisteredPostLogoutRedirect(clientId: string, redirectUri: string) {
    const client = await this.prisma.oauth2Client.findUnique({
      where: { clientId },
      select: { status: true, redirectUris: true },
    });
    return Boolean(
      client?.status === '1' &&
        client.redirectUris.includes(redirectUri) &&
        this.isAllowedRedirectUri(redirectUri),
    );
  }

  private async loadAuthorizationRequest(
    transactionId: string,
    browserNonce?: string,
  ) {
    const request = await this.prisma.oauth2AuthorizationRequest.findUnique({
      where: { transactionId },
      select: {
        id: true,
        transactionId: true,
        clientId: true,
        redirectUri: true,
        scopes: true,
        state: true,
        browserNonceHash: true,
        nonce: true,
        codeChallenge: true,
        codeChallengeMethod: true,
        expiresAt: true,
        consumedAt: true,
        client: { select: { name: true, status: true } },
      },
    });
    if (
      !request ||
      request.consumedAt ||
      request.expiresAt <= new Date() ||
      request.client.status !== '1'
    ) {
      throw new BadRequestException('OAuth 授权请求无效、已使用或已过期');
    }
    if (!browserNonce || !this.matchesHash(browserNonce, request.browserNonceHash)) {
      throw new BadRequestException('OAuth 授权请求不属于当前浏览器');
    }
    return request;
  }

  private async createAccessToken(
    clientId: string,
    userId: number,
    scopes: string[],
    expiresIn: number,
    familyId: string,
  ) {
    const accessToken = this.openidService.signIdToken(
      {
        sub: String(userId),
        client_id: clientId,
        aud: clientId,
        scope: scopes.join(' '),
        token_type: 'access_token',
      },
      expiresIn,
    );
    await this.prisma.oauth2AccessToken.create({
      data: {
        tokenHash: this.hashAccessToken(accessToken),
        clientId,
        userId,
        scopes,
        familyId,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });
    return accessToken;
  }

  private async revokeRefreshTokenFamily(
    userId: number,
    clientId: string,
    familyId?: string | null,
  ) {
    const revokedAt = new Date();
    const familyWhere = {
      userId,
      clientId,
      revokedAt: null,
      ...(familyId ? { familyId } : {}),
    };
    const [refreshTokens, accessTokens] = await Promise.all([
      this.prisma.oauth2RefreshToken.updateMany({
        where: familyWhere,
        data: { revokedAt },
      }),
      this.prisma.oauth2AccessToken.updateMany({
        where: familyWhere,
        data: { revokedAt },
      }),
    ]);
    return { refreshTokens, accessTokens };
  }

  private createTokenFamilyId() {
    return randomBytes(32).toString('base64url');
  }

  private hashAccessToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private matchesHash(value: string, expectedHash: string) {
    const actualHash = createHash('sha256').update(value).digest('hex');
    const actual = Buffer.from(actualHash);
    const expected = Buffer.from(expectedHash);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private isAllowedRedirectUri(redirectUri: string) {
    try {
      const protocol = new URL(redirectUri).protocol;
      return (
        protocol === 'https:' ||
        (protocol === 'http:' &&
          this.configService.get<string>('NODE_ENV') !== 'production')
      );
    } catch {
      return false;
    }
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
    // Do not accept legacy plaintext secrets. Reset the client secret from
    // EIMS administration before re-enabling a legacy client.
    return false;
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
