import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  HttpStatus,
  Header,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '@eims/common';
import { AuditService } from '@eims/audit/audit.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { DingTalkExchangeDto } from './dto/dingtalk-exchange.dto';
import { DingTalkOAuthService } from './dingtalk-oauth.service';
import {
  EIMS_REFRESH_COOKIE,
  EIMS_ACCESS_COOKIE,
  clearAuthCookies,
  getCookie,
  setAuthCookies,
} from './auth-cookies';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly dingTalkOAuthService: DingTalkOAuthService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Post('login')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const tokens = await this.authService.login(dto);
      setAuthCookies(response, tokens);
      await this.auditService.record({
        event: 'auth.login',
        userName: dto.userName,
        request,
      });
      return { authenticated: true };
    } catch (error) {
      await this.auditService.record({
        event: 'auth.login',
        result: 'failure',
        userName: dto.userName,
        request,
        detail: { reason: error instanceof Error ? error.name : 'error' },
      });
      throw error;
    }
  }

  @Get('getUserInfo')
  async getUserInfo(@CurrentUser('sub') userId: number) {
    return this.authService.getUserInfo(userId);
  }

  @Public()
  @Post('refreshToken')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = dto?.refreshToken || getCookie(request, EIMS_REFRESH_COOKIE);
    if (!refreshToken) throw new UnauthorizedException('refresh token missing');
    try {
      const tokens = await this.authService.refreshToken({ refreshToken });
      setAuthCookies(response, tokens);
      await this.auditService.record({ event: 'auth.refresh', request });
      return { authenticated: true };
    } catch (error) {
      await this.auditService.record({
        event: 'auth.refresh',
        result: 'failure',
        request,
        detail: { reason: error instanceof Error ? error.name : 'error' },
      });
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @Header('Cache-Control', 'no-store')
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = dto.refreshToken || getCookie(request, EIMS_REFRESH_COOKIE);
    const userId = await this.authService.resolveAccessTokenUserId(
      getCookie(request, EIMS_ACCESS_COOKIE),
    );
    await this.authService.logout(
      { refreshToken },
      getCookie(request, EIMS_ACCESS_COOKIE),
    );
    clearAuthCookies(response);
    await this.auditService.record({ event: 'auth.logout', userId, request });
    return { authenticated: false };
  }

  @Public()
  @Get('dingtalk/authorize')
  async dingTalkAuthorize(@Res() response: Response) {
    const url = await this.dingTalkOAuthService.getAuthorizationUrl();
    return response.redirect(HttpStatus.FOUND, url);
  }

  @Public()
  @Get('dingtalk/callback')
  async dingTalkCallback(
    @Query('code') code: string | undefined,
    @Query('authCode') authCode: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    if (error || !state || !(code || authCode)) {
      return response.redirect(
        this.dingTalkOAuthService.getFrontendRedirect({ dingtalk_error: 'authorization_denied' }),
      );
    }

    try {
      const ticket = await this.dingTalkOAuthService.handleCallback(code || authCode || '', state);
      return response.redirect(
        this.dingTalkOAuthService.getFrontendRedirect({ dingtalk_ticket: ticket }),
      );
    } catch {
      return response.redirect(
        this.dingTalkOAuthService.getFrontendRedirect({ dingtalk_error: 'login_failed' }),
      );
    }
  }

  @Public()
  @Post('dingtalk/exchange')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async dingTalkExchange(
    @Body() dto: DingTalkExchangeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const tokens = await this.authService.exchangeLoginTicket(dto.ticket);
      setAuthCookies(response, tokens);
      await this.auditService.record({ event: 'auth.dingtalk_exchange', request });
      return { authenticated: true };
    } catch (error) {
      await this.auditService.record({
        event: 'auth.dingtalk_exchange',
        result: 'failure',
        request,
        detail: { reason: error instanceof Error ? error.name : 'error' },
      });
      throw error;
    }
  }
}
