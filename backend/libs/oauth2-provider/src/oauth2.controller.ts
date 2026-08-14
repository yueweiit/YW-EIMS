import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Req,
  Headers,
  UseGuards,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Public } from '@eims/common';
import { CurrentUser } from '@eims/auth';
import { OAuth2Service } from './oauth2.service';
import { OpenIdService } from './openid.service';
import { AuthorizeDto, AuthorizeConfirmDto } from './dto/authorize.dto';
import { TokenDto, RevokeDto } from './dto/token.dto';
import { ClientAuthGuard } from './guards/client-auth.guard';

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
    );

    // Build consent page URL with all params
    const consentParams = new URLSearchParams({
      client_id: query.client_id,
      redirect_uri: query.redirect_uri,
      scope: query.scope || 'openid',
      state: query.state || '',
      client_name: clientInfo.name,
    });

    const frontendUrl = process.env.EIMS_FRONTEND_URL || 'http://localhost:9527';
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
    );

    // Redirect back to client with code
    const callbackUrl = new URL(dto.redirect_uri);
    callbackUrl.searchParams.set('code', code);
    if (dto.state) callbackUrl.searchParams.set('state', dto.state);

    return response.redirect(HttpStatus.FOUND, callbackUrl.toString());
  }

  /**
   * POST /oauth/token — Token endpoint.
   * Exchanges authorization code for tokens.
   */
  @Public()
  @Post('token')
  async token(@Body() dto: TokenDto) {
    if (dto.grant_type === 'authorization_code') {
      if (!dto.code || !dto.redirect_uri || !dto.client_id || !dto.client_secret) {
        throw new UnauthorizedException('invalid_request: missing required parameters');
      }
      return this.oauth2Service.exchangeCode(
        dto.code,
        dto.client_id,
        dto.client_secret,
        dto.redirect_uri,
      );
    }

    if (dto.grant_type === 'refresh_token') {
      if (!dto.refresh_token || !dto.client_id || !dto.client_secret) {
        throw new UnauthorizedException('invalid_request: missing required parameters');
      }
      return this.oauth2Service.refreshAccessToken(
        dto.refresh_token,
        dto.client_id,
        dto.client_secret,
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
  async revoke(@Body() dto: RevokeDto) {
    await this.oauth2Service.revokeToken(dto.token, dto.client_id, dto.client_secret);
    return {};
  }

  /**
   * GET /oauth/.well-known/openid-configuration — OIDC Discovery.
   */
  @Public()
  @Get('.well-known/openid-configuration')
  async configuration() {
    return this.openidService.getConfiguration();
  }

  /**
   * GET /oauth/jwks — JWKS endpoint.
   */
  @Public()
  @Get('jwks')
  async jwks() {
    return this.openidService.getJwks();
  }
}
