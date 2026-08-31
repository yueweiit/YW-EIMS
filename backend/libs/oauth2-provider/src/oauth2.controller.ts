import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  Headers,
  Header,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public, RawResponse } from '@eims/common';
import { AuditService } from '@eims/audit/audit.service';
import {
  AuthService,
  CurrentUser,
  EIMS_ACCESS_COOKIE,
  clearAuthCookies,
  getCookie,
} from '@eims/auth';
import { OAuth2Service } from './oauth2.service';
import { OpenIdService } from './openid.service';
import {
  AuthorizeDto,
  AuthorizeTransactionConfirmDto,
  AuthorizeTransactionQueryDto,
} from './dto/authorize.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { TokenDto, RevokeDto } from './dto/token.dto';

@Controller('oauth')
export class OAuth2Controller {
  constructor(
    private readonly oauth2Service: OAuth2Service,
    private readonly openidService: OpenIdService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * GET /oauth/authorize — Authorization endpoint.
   * Validates the request and redirects to frontend consent page.
   */
  @Public()
  @Get('authorize')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async authorize(
    @Query() query: AuthorizeDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    // Validate client and redirect_uri
    const clientInfo = await this.oauth2Service.validateAuthorizeRequest(
      query.client_id,
      query.redirect_uri,
      query.response_type,
      query.scope,
      query.code_challenge,
      query.code_challenge_method,
      query.state,
      query.nonce,
    );
    await this.auditService.record({
      event: 'oauth.authorize_started',
      clientId: clientInfo.clientId,
      request,
      detail: { scopeCount: clientInfo.requestedScopes.length },
    });

    const transactionId = await this.oauth2Service.createAuthorizationRequest(
      clientInfo.clientId,
      query.redirect_uri,
      clientInfo.requestedScopes,
      query.state,
      query.code_challenge,
      query.code_challenge_method,
      query.nonce,
    );

    // Only the opaque transaction ID is exposed to the browser. The actual
    // redirect URI, state, scopes and PKCE values remain server-side.
    const consentParams = new URLSearchParams({
      transaction_id: transactionId,
    });

    const frontendUrl =
      process.env.EIMS_FRONTEND_URL || 'http://localhost:9527';
    return response.redirect(
      HttpStatus.FOUND,
      `${frontendUrl}/login/oauth-consent?${consentParams.toString()}`,
    );
  }

  /** Return safe consent-screen metadata for an authenticated EIMS user. */
  @Get('authorize/transaction')
  @Header('Cache-Control', 'no-store')
  async authorizationTransaction(
    @Query() query: AuthorizeTransactionQueryDto,
  ) {
    return this.oauth2Service.getAuthorizationRequest(query.transaction_id);
  }

  /**
   * POST /oauth/authorize/confirm — Browser consent confirmation.
   *
   * The frontend calls this endpoint with the browser session cookie and
   * returns a redirect URL for browser navigation.
   */
  @Post('authorize/confirm')
  @Header('Cache-Control', 'no-store')
  async authorizeConfirmForBrowser(
    @Body() dto: AuthorizeTransactionConfirmDto,
    @CurrentUser('sub') userId: number,
    @Req() request: Request,
  ) {
    try {
      const redirectUrl = await this.oauth2Service.completeAuthorizationRequest(
        dto.transaction_id,
        userId,
        dto.consent,
      );
      await this.auditService.record({
        event: dto.consent === 'true' ? 'oauth.consent' : 'oauth.consent_denied',
        userId,
        request,
      });
      return { redirectUrl };
    } catch (error) {
      await this.auditService.record({
        event: 'oauth.consent',
        result: 'failure',
        userId,
        request,
        detail: { reason: error instanceof Error ? error.name : 'error' },
      });
      throw error;
    }
  }

  /**
   * POST /oauth/token — Token endpoint.
   * Exchanges authorization code for tokens.
   */
  @Public()
  @Post('token')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @RawResponse()
  async token(
    @Body() dto: TokenDto,
    @Headers('authorization') authHeader?: string,
    @Req() request?: Request,
  ) {
    const basicCredentials = this.parseBasicCredentials(authHeader);
    const clientId = basicCredentials?.clientId || dto.client_id;
    const clientSecret = basicCredentials?.clientSecret || dto.client_secret;
    try {
      if (dto.grant_type === 'authorization_code') {
        if (!dto.code || !dto.redirect_uri || !clientId || !clientSecret) {
          throw new UnauthorizedException(
            'invalid_request: missing required parameters',
          );
        }
        const result = await this.oauth2Service.exchangeCode(
          dto.code,
          clientId,
          clientSecret,
          dto.redirect_uri,
          dto.code_verifier,
        );
        await this.auditService.record({
          event: 'oauth.token_exchange',
          clientId,
          request,
        });
        return result;
      }

      if (dto.grant_type === 'refresh_token') {
        if (!dto.refresh_token || !clientId || !clientSecret) {
          throw new UnauthorizedException(
            'invalid_request: missing required parameters',
          );
        }
        const result = await this.oauth2Service.refreshAccessToken(
          dto.refresh_token,
          clientId,
          clientSecret,
        );
        await this.auditService.record({
          event: 'oauth.token_refresh',
          clientId,
          request,
        });
        return result;
      }

      throw new UnauthorizedException('unsupported_grant_type');
    } catch (error) {
      await this.auditService.record({
        event: 'oauth.token',
        result: 'failure',
        clientId,
        request,
        detail: { reason: error instanceof Error ? error.name : 'error' },
      });
      throw error;
    }
  }

  /**
   * GET /oauth/userinfo — UserInfo endpoint.
   * Returns user information for a valid access token.
   */
  @Public()
  @Get('userinfo')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @RawResponse()
  async userinfo(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }
    const accessToken = authHeader.substring(7);
    return this.oauth2Service.getUserInfo(accessToken);
  }

  /**
   * POST /oauth/revoke — Token revocation endpoint.
   */
  @Public()
  @Post('revoke')
  @Header('Cache-Control', 'no-store')
  @RawResponse()
  async revoke(
    @Body() dto: RevokeDto,
    @Headers('authorization') authHeader?: string,
    @Req() request?: Request,
  ) {
    const basicCredentials = this.parseBasicCredentials(authHeader);
    const clientId = basicCredentials?.clientId || dto.client_id;
    const clientSecret = basicCredentials?.clientSecret || dto.client_secret;
    try {
      if (!clientId || !clientSecret) {
        throw new UnauthorizedException('invalid_client');
      }
      await this.oauth2Service.revokeToken(
        dto.token,
        clientId,
        clientSecret,
      );
      await this.auditService.record({
        event: 'oauth.token_revoke',
        clientId,
        request,
      });
      return {};
    } catch (error) {
      await this.auditService.record({
        event: 'oauth.token_revoke',
        result: 'failure',
        clientId,
        request,
        detail: { reason: error instanceof Error ? error.name : 'error' },
      });
      throw error;
    }
  }

  /** OIDC RP-initiated logout / single logout entry point. */
  @Public()
  @Get('logout')
  @Header('Cache-Control', 'no-store')
  async logout(
    @Query() query: EndSessionDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    let hintedUserId: number | undefined;
    let hintedClientId: string | undefined;
    if (query.id_token_hint) {
      try {
        const payload = this.openidService.verifyToken<{
          sub?: string;
          aud?: string;
          token_type?: string;
        }>(query.id_token_hint);
        if (payload.token_type) throw new Error('not an ID token');
        if (payload.sub && /^\d+$/.test(payload.sub)) {
          hintedUserId = Number(payload.sub);
        }
        if (payload.aud) hintedClientId = payload.aud;
      } catch {
        // Logout remains idempotent, but an invalid hint is never used to
        // authorize a redirect or identify another browser session.
      }
    }

    const clientId = query.client_id || hintedClientId;
    if (
      query.client_id &&
      hintedClientId &&
      query.client_id !== hintedClientId
    ) {
      throw new BadRequestException('client_id 与 id_token_hint 不匹配');
    }
    if (query.post_logout_redirect_uri) {
      if (
        !clientId ||
        !(await this.oauth2Service.isRegisteredPostLogoutRedirect(
          clientId,
          query.post_logout_redirect_uri,
        ))
      ) {
        throw new BadRequestException('post_logout_redirect_uri 未注册');
      }
    }

    const cookieUserId = await this.authService.resolveAccessTokenUserId(
      getCookie(request, EIMS_ACCESS_COOKIE),
    );
    const userId = cookieUserId || hintedUserId;
    if (userId) {
      await this.authService.revokeAllSessions(userId);
      await this.oauth2Service.revokeUserRefreshTokens(userId, clientId);
    }
    clearAuthCookies(response);
    await this.auditService.record({
      event: 'oauth.logout',
      userId,
      clientId,
      request,
    });

    const redirectUrl = query.post_logout_redirect_uri
      ? new URL(query.post_logout_redirect_uri)
      : new URL(
          `${process.env.EIMS_FRONTEND_URL || 'http://localhost:9527'}/login`,
        );
    if (query.state) redirectUrl.searchParams.set('state', query.state);
    return response.redirect(HttpStatus.FOUND, redirectUrl.toString());
  }

  /**
   * GET /oauth/.well-known/openid-configuration — OIDC Discovery.
   */
  @Public()
  @Get('.well-known/openid-configuration')
  @RawResponse()
  async configuration() {
    return this.openidService.getConfiguration();
  }

  /**
   * GET /oauth/jwks — JWKS endpoint.
   */
  @Public()
  @Get('jwks')
  @RawResponse()
  async jwks() {
    return this.openidService.getJwks();
  }

  private parseBasicCredentials(authHeader?: string) {
    if (!authHeader?.startsWith('Basic ')) return undefined;

    try {
      const decoded = Buffer.from(authHeader.substring(6), 'base64').toString(
        'utf8',
      );
      const separator = decoded.indexOf(':');
      if (separator <= 0) return undefined;
      return {
        clientId: decoded.substring(0, separator),
        clientSecret: decoded.substring(separator + 1),
      };
    } catch {
      return undefined;
    }
  }
}
