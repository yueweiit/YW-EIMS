import { Controller, Post, Get, Body, Query, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '@eims/common';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { DingTalkExchangeDto } from './dto/dingtalk-exchange.dto';
import { DingTalkOAuthService } from './dingtalk-oauth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly dingTalkOAuthService: DingTalkOAuthService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('getUserInfo')
  async getUserInfo(@CurrentUser('sub') userId: number) {
    return this.authService.getUserInfo(userId);
  }

  @Public()
  @Post('refreshToken')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
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
  async dingTalkExchange(@Body() dto: DingTalkExchangeDto) {
    return this.authService.exchangeLoginTicket(dto.ticket);
  }
}
