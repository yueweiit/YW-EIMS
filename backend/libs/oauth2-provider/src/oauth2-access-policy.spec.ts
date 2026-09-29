import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PrismaService } from '@eims/database';
import { RoleService } from '@eims/roles';
import { OpenIdService } from './openid.service';
import { OAuth2Service } from './oauth2.service';

describe('OAuth2Service portal access policy', () => {
  const prisma = {
    oauth2AuthorizationRequest: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    oauth2AuthorizationCode: { create: jest.fn() },
    oauth2AccessToken: { findUnique: jest.fn() },
    oauth2Client: { findUnique: jest.fn() },
    externalSystem: { findUnique: jest.fn() },
    oauth2UserBinding: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const config = { get: jest.fn() };
  const openid = { verifyToken: jest.fn() };
  const roles = { getActiveRoleCodes: jest.fn() };
  const service = new OAuth2Service(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
    openid as unknown as OpenIdService,
    roles as unknown as RoleService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockImplementation((key: string, fallback?: unknown) =>
      key === 'OAUTH2_PROVIDER_ENABLED' ? 'true' : fallback,
    );
    prisma.oauth2AuthorizationRequest.findUnique.mockResolvedValue({
      id: 11,
      clientId: 'payment-client',
      redirectUri: 'https://payment.example.test/callback',
      scopes: ['openid', 'profile'],
      state: 'client-state',
      browserNonceHash: createHash('sha256')
        .update('browser-nonce')
        .digest('hex'),
      nonce: null,
      codeChallenge: null,
      codeChallengeMethod: null,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      client: { status: '1', name: 'Payment' },
    });
    prisma.oauth2AuthorizationRequest.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.oauth2AuthorizationCode.create.mockResolvedValue({ id: 12 });
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      status: '1',
      roles: ['R_OTHER'],
    });
    prisma.externalSystem.findUnique.mockResolvedValue({
      status: '1',
      authMode: 'oauth2',
      allowedRoles: ['R_PAYMENT'],
    });
    prisma.oauth2UserBinding.findUnique.mockResolvedValue({ id: 13 });
    roles.getActiveRoleCodes.mockResolvedValue(['R_OTHER']);
  });

  const authorize = () =>
    service.completeAuthorizationRequest(
      'transaction',
      7,
      'true',
      'browser-nonce',
    );

  it('rejects a bound user whose active role is not allowed before issuing a code', async () => {
    await expect(authorize()).rejects.toThrow(ForbiddenException);
    expect(prisma.oauth2AuthorizationRequest.updateMany).not.toHaveBeenCalled();
    expect(prisma.oauth2AuthorizationCode.create).not.toHaveBeenCalled();
  });

  it('allows a bound user with an allowed active role', async () => {
    roles.getActiveRoleCodes.mockResolvedValue(['R_PAYMENT']);
    const redirect = await authorize();
    expect(redirect).toContain('code=');
    expect(prisma.oauth2AuthorizationCode.create).toHaveBeenCalledTimes(1);
  });

  it('still rejects an unbound user with an allowed role', async () => {
    roles.getActiveRoleCodes.mockResolvedValue(['R_PAYMENT']);
    prisma.oauth2UserBinding.findUnique.mockResolvedValue(null);
    await expect(authorize()).rejects.toThrow(ForbiddenException);
    expect(prisma.oauth2AuthorizationCode.create).not.toHaveBeenCalled();
  });

  it('keeps the portal superuser rule for a bound account', async () => {
    roles.getActiveRoleCodes.mockResolvedValue(['R_SUPER']);
    prisma.externalSystem.findUnique.mockResolvedValue({
      status: '1',
      authMode: 'oauth2',
      allowedRoles: [],
    });
    await expect(authorize()).resolves.toContain('code=');
  });

  it('rejects a disabled portal system', async () => {
    prisma.externalSystem.findUnique.mockResolvedValue({
      status: '0',
      authMode: 'oauth2',
      allowedRoles: ['R_PAYMENT'],
    });
    await expect(authorize()).rejects.toThrow(ForbiddenException);
  });

  it('retains existing behavior for an OAuth client without a portal entry', async () => {
    prisma.externalSystem.findUnique.mockResolvedValue(null);
    await expect(authorize()).resolves.toContain('code=');
    expect(roles.getActiveRoleCodes).not.toHaveBeenCalled();
  });

  it('rejects UserInfo after the portal role has been revoked', async () => {
    openid.verifyToken.mockReturnValue({
      sub: '7',
      client_id: 'payment-client',
      aud: 'payment-client',
      token_type: 'access_token',
    });
    prisma.oauth2AccessToken.findUnique.mockResolvedValue({
      clientId: 'payment-client',
      userId: 7,
      scopes: ['openid', 'profile'],
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    prisma.oauth2Client.findUnique.mockResolvedValue({ status: '1' });
    await expect(service.getUserInfo('token')).rejects.toThrow('invalid_token');
  });
});
