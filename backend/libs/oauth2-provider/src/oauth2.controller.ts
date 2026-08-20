import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Headers,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public, RawResponse } from '@eims/common';
import { CurrentUser } from '@eims/auth';
import { OAuth2Service } from './oauth2.service';
import { OpenIdService } from './openid.service';
import { AuthorizeDto, AuthorizeConfirmDto } from './dto/authorize.dto';
import { TokenDto, RevokeDto } from './dto/token.dto';

@Controller('oauth')
export class OAuth2Controller {
  constructor(
    private readonly oauth2Service: OAuth2Service,
    private readonly openidService: OpenIdService,
  ) {}

  /**
   * GET /oauth/authorize — Authorization endpoint.
   * Validates the request and redirects to frontend consent page.
   */
  @Public()
  @Get('authorize')
  async authorize(@Query() query: AuthorizeDto, @Res() response: Response) {
    // Validate client and redirect_uri
    const clientInfo = await this.oauth2Service.validateAuthorizeRequest(
      query.client_id,
      query.redirect_uri,
      query.response_type,
      query.scope,
      query.code_challenge,
      query.code_challenge_method,
    );

    // Build consent page URL with all params
    const consentParams = new URLSearchParams({
      client_id: query.client_id,
      redirect_uri: query.redirect_uri,
      scope: query.scope || 'openid',
      state: query.state || '',
      ...(query.code_challenge ? { code_challenge: query.code_challenge } : {}),
      ...(query.code_challenge_method
        ? { code_challenge_method: query.code_challenge_method }
        : {}),
      client_name: clientInfo.name,
    });

    const frontendUrl =
      process.env.EIMS_FRONTEND_URL || 'http://localhost:9527';
    return response.redirect(
      HttpStatus.FOUND,
      `${frontendUrl}/login/oauth-consent?${consentParams.toString()}`,
    );
  }

  /**
   * POST /oauth/authorize — User confirms or denies authorization.
   * Requires JWT authentication (user must be logged in).
   */
  @Post('authorize')
  async authorizeConfirm(
    @Body() dto: AuthorizeConfirmDto,
    @CurrentUser('sub') userId: number,
    @Res() response: Response,
  ) {
    // Re-validate the request
    await this.oauth2Service.validateAuthorizeRequest(
      dto.client_id,
      dto.redirect_uri,
      'code',
      dto.scope,
      dto.code_challenge,
      dto.code_challenge_method,
    );

    // Check if user denied
    if (dto.consent !== 'true') {
      const deniedUrl = new URL(dto.redirect_uri);
      deniedUrl.searchParams.set('error', 'access_denied');
      if (dto.state) deniedUrl.searchParams.set('state', dto.state);
      return response.redirect(HttpStatus.FOUND, deniedUrl.toString());
    }

    // Create authorization code
    const scopes = dto.scope ? dto.scope.split(' ') : ['openid'];
    const code = await this.oauth2Service.createAuthorizationCode(
      dto.client_id,
      userId,
      dto.redirect_uri,
      scopes,
      dto.code_challenge,
      dto.code_challenge_method,
    );

    // Redirect back to client with code
    const callbackUrl = new URL(dto.redirect_uri);
    callbackUrl.searchParams.set('code', code);
    if (dto.state) callbackUrl.searchParams.set('state', dto.state);

    return response.redirect(HttpStatus.FOUND, callbackUrl.toString());
  }

  /**
   * POST /oauth/authorize/confirm — Browser consent confirmation.
   *
   * The frontend stores the EIMS JWT in localStorage, so a native HTML form
   * cannot carry the Authorization header. This endpoint is called through
   * the frontend API client and returns a redirect URL for browser navigation.
   */
  @Post('authorize/confirm')
  async authorizeConfirmForBrowser(
    @Body() dto: AuthorizeConfirmDto,
    @CurrentUser('sub') userId: number,
  ) {
    await this.oauth2Service.validateAuthorizeRequest(
      dto.client_id,
      dto.redirect_uri,
      'code',
      dto.scope,
      dto.code_challenge,
      dto.code_challenge_method,
    );

    if (dto.consent !== 'true') {
      const deniedUrl = new URL(dto.redirect_uri);
      deniedUrl.searchParams.set('error', 'access_denied');
      if (dto.state) deniedUrl.searchParams.set('state', dto.state);
      return { redirectUrl: deniedUrl.toString() };
    }

    const scopes = dto.scope ? dto.scope.split(' ') : ['openid'];
    const code = await this.oauth2Service.createAuthorizationCode(
      dto.client_id,
      userId,
      dto.redirect_uri,
      scopes,
      dto.code_challenge,
      dto.code_challenge_method,
    );
    const callbackUrl = new URL(dto.redirect_uri);
    callbackUrl.searchParams.set('code', code);
    if (dto.state) callbackUrl.searchParams.set('state', dto.state);

    return { redirectUrl: callbackUrl.toString() };
  }

  /**
   * POST /oauth/token — Token endpoint.
   * Exchanges authorization code for tokens.
   */
  @Public()
  @Post('token')
  @RawResponse()
  async token(
    @Body() dto: TokenDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const basicCredentials = this.parseBasicCredentials(authHeader);
    const clientId = basicCredentials?.clientId || dto.client_id;
    const clientSecret = basicCredentials?.clientSecret || dto.client_secret;

    if (dto.grant_type === 'authorization_code') {
      if (!dto.code || !dto.redirect_uri || !clientId || !clientSecret) {
        throw new UnauthorizedException(
          'invalid_request: missing required parameters',
        );
      }
      return this.oauth2Service.exchangeCode(
        dto.code,
        clientId,
        clientSecret,
        dto.redirect_uri,
        dto.code_verifier,
      );
    }

    if (dto.grant_type === 'refresh_token') {
      if (!dto.refresh_token || !clientId || !clientSecret) {
        throw new UnauthorizedException(
          'invalid_request: missing required parameters',
        );
      }
      return this.oauth2Service.refreshAccessToken(
        dto.refresh_token,
        clientId,
        clientSecret,
      );
    }

    throw new UnauthorizedException('unsupported_grant_type');
  }

  /**
   * GET /oauth/userinfo — UserInfo endpoint.
   * Returns user information for a valid access token.
   */
  @Public()
  @Get('userinfo')
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
  @RawResponse()
  async revoke(@Body() dto: RevokeDto) {
    await this.oauth2Service.revokeToken(
      dto.token,
      dto.client_id,
      dto.client_secret,
    );
    return {};
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
