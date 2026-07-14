import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@eims/database';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { DingTalkOAuthService } from './dingtalk-oauth.service';

describe('DingTalkOAuthService', () => {
  const configValues: Record<string, string> = {
    JWT_SECRET: 'state-secret',
    DINGTALK_OAUTH_CLIENT_ID: 'client-id',
    DINGTALK_OAUTH_CLIENT_SECRET: 'client-secret',
    DINGTALK_OAUTH_REDIRECT_URI: 'https://eims.example.com/api/auth/dingtalk/callback',
    DINGTALK_OAUTH_SCOPES: 'openid',
    EIMS_FRONTEND_URL: 'https://eims.example.com',
  };

  function createService() {
    const configService = {
      get: jest.fn((key: string, fallback?: unknown) => configValues[key] ?? fallback),
    } as unknown as ConfigService;
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-state'),
      verifyAsync: jest.fn().mockResolvedValue({ purpose: 'dingtalk-oauth', nonce: 'nonce' }),
    } as unknown as JwtService;
    const httpService = {
      post: jest.fn().mockReturnValue(of({ data: { accessToken: 'user-access-token' } })),
      get: jest.fn().mockReturnValue(of({ data: { unionId: 'ding-union-id' } })),
    } as unknown as HttpService;
    const prisma = {
      authLoginTicket: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;
    const authService = {
      findEnabledUserByDingTalkSubject: jest.fn().mockResolvedValue(7),
      hashLoginTicket: jest.fn().mockReturnValue('ticket-hash'),
    } as unknown as AuthService;

    return {
      service: new DingTalkOAuthService(httpService, configService, jwtService, prisma, authService),
      configService,
      jwtService,
      httpService,
      prisma,
      authService,
    };
  }

  it('builds an authorization URL with a signed state', async () => {
    const { service } = createService();

    const url = new URL(await service.getAuthorizationUrl());

    expect(url.origin).toBe('https://login.dingtalk.com');
    expect(url.pathname).toBe('/oauth2/auth');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://eims.example.com/api/auth/dingtalk/callback',
    );
    expect(url.searchParams.get('state')).toBe('signed-state');
  });

  it('exchanges the code, binds the subject, and creates a one-time ticket', async () => {
    const { service, httpService, authService, prisma } = createService();

    const ticket = await service.handleCallback('authorization-code', 'signed-state');

    expect(ticket).toBeTruthy();
    expect(httpService.post).toHaveBeenCalledWith(
      'https://api.dingtalk.com/v1.0/oauth2/userAccessToken',
      expect.objectContaining({ code: 'authorization-code', grantType: 'authorization_code' }),
    );
    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.dingtalk.com/v1.0/contact/users/me',
      expect.objectContaining({ headers: { 'x-acs-dingtalk-access-token': 'user-access-token' } }),
    );
    expect(authService.findEnabledUserByDingTalkSubject).toHaveBeenCalledWith('ding-union-id');
    expect(prisma.authLoginTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 7 }) }),
    );
  });

  it('rejects a forged or expired state', async () => {
    const { service, jwtService } = createService();
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('invalid state'));

    await expect(service.handleCallback('authorization-code', 'forged-state')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('AuthService OAuth login tickets', () => {
  function createAuthService() {
    const configValues: Record<string, string> = {
      JWT_SECRET: 'jwt-secret',
      JWT_EXPIRES_IN: '2h',
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
    } as unknown as JwtService;
    const configService = {
      get: jest.fn((key: string, fallback?: unknown) => configValues[key] ?? fallback),
    } as unknown as ConfigService;
    const prisma = {
      authLoginTicket: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    } as unknown as PrismaService;

    return {
      service: new AuthService(jwtService, configService, prisma),
      jwtService,
      prisma,
    };
  }

  it('consumes a valid ticket only once', async () => {
    const { service, prisma } = createAuthService();
    const ticket = 'one-time-ticket';
    const ticketRecord = {
      id: 1,
      userId: 7,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    };
    const findUnique = prisma.authLoginTicket.findUnique as jest.Mock;
    const updateMany = prisma.authLoginTicket.updateMany as jest.Mock;
    const findUser = prisma.user.findUnique as jest.Mock;
    findUnique.mockResolvedValue(ticketRecord);
    updateMany.mockResolvedValue({ count: 1 });
    findUser.mockResolvedValue({ id: 7, userName: 'operator', status: '1' });

    const tokens = await service.exchangeLoginTicket(ticket);

    expect(tokens).toEqual({ token: 'jwt-token', refreshToken: 'jwt-token' });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 1, consumedAt: null }),
      }),
    );

    updateMany.mockResolvedValue({ count: 0 });
    await expect(service.exchangeLoginTicket(ticket)).rejects.toThrow('已被使用');
  });

  it('rejects an expired ticket before issuing tokens', async () => {
    const { service, prisma } = createAuthService();
    (prisma.authLoginTicket.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 7,
      expiresAt: new Date(Date.now() - 1_000),
      consumedAt: null,
    });

    await expect(service.exchangeLoginTicket('expired-ticket')).rejects.toThrow('无效或已过期');
    expect(prisma.authLoginTicket.updateMany).not.toHaveBeenCalled();
  });
});
