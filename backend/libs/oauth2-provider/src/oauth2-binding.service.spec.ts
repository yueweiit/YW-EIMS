import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@eims/database';
import { OAuth2BindingService } from './oauth2-binding.service';

describe('OAuth2BindingService conflicts', () => {
  let service: OAuth2BindingService;
  const prisma = {
    user: { findUnique: jest.fn() },
    oauth2Client: { findUnique: jest.fn() },
    oauth2UserBinding: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const dto = { ssoUserId: 7, clientId: 'erp', appUserId: 'ERP-007' };
  const binding = { id: 10, ...dto };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: 7, status: '1' });
    prisma.oauth2Client.findUnique.mockResolvedValue({
      clientId: 'erp',
      status: '1',
    });
    prisma.oauth2UserBinding.findUnique.mockResolvedValue(null);
    const module = await Test.createTestingModule({
      providers: [
        OAuth2BindingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(OAuth2BindingService);
  });

  it('directs duplicate user/application bindings to editing without overwriting', async () => {
    prisma.oauth2UserBinding.findUnique.mockResolvedValueOnce(binding);

    await expect(service.create(dto)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('编辑已有绑定'),
    });
    expect(prisma.oauth2UserBinding.create).not.toHaveBeenCalled();
    expect(prisma.oauth2UserBinding.update).not.toHaveBeenCalled();
  });

  it('rejects a target account already assigned to another user', async () => {
    prisma.oauth2UserBinding.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...binding, ssoUserId: 8 });

    await expect(service.create(dto)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('其他SSO用户'),
    });
    expect(prisma.oauth2UserBinding.create).not.toHaveBeenCalled();
  });

  it('creates an available binding and keeps the target ID case intact', async () => {
    prisma.oauth2UserBinding.create.mockResolvedValue(binding);

    await expect(
      service.create({ ...dto, appUserId: ' ERP-007 ' }),
    ).resolves.toEqual(binding);
    expect(prisma.oauth2UserBinding.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining(dto) }),
    );
  });

  it.each([
    [['sso_user_id', 'client_id'], '编辑已有绑定'],
    [['client_id', 'app_user_id'], '其他SSO用户'],
  ])(
    'returns an actionable 409 for a concurrent create conflict on %j',
    async (target, message) => {
      prisma.oauth2UserBinding.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6',
          meta: { target },
        }),
      );

      await expect(service.create(dto)).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining(message),
      });
      expect(prisma.oauth2UserBinding.update).not.toHaveBeenCalled();
    },
  );

  it("rejects editing a binding to another user's target account", async () => {
    prisma.oauth2UserBinding.findUnique
      .mockResolvedValueOnce(binding)
      .mockResolvedValueOnce({ id: 11 });

    await expect(
      service.update(10, { appUserId: 'occupied' }),
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('其他SSO用户'),
    });
    expect(prisma.oauth2UserBinding.update).not.toHaveBeenCalled();
  });

  it('returns a 409 when another request claims the target during an update', async () => {
    prisma.oauth2UserBinding.findUnique.mockResolvedValueOnce(binding);
    prisma.oauth2UserBinding.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6',
        meta: { target: ['client_id', 'app_user_id'] },
      }),
    );

    await expect(
      service.update(10, { appUserId: 'occupied' }),
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('其他SSO用户'),
    });
  });

  it('allows editing the display name without changing the account binding', async () => {
    prisma.oauth2UserBinding.findUnique.mockResolvedValueOnce(binding);
    prisma.oauth2UserBinding.update.mockResolvedValue(binding);

    await expect(
      service.update(10, {
        appUserId: dto.appUserId,
        appUsername: ' finance ',
      }),
    ).resolves.toEqual(binding);
    expect(prisma.oauth2UserBinding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: { appUserId: dto.appUserId, appUsername: 'finance' },
      }),
    );
  });

  it('does not disguise unrelated database failures as binding conflicts', async () => {
    const error = new Error('Database unavailable');
    prisma.oauth2UserBinding.create.mockRejectedValue(error);
    await expect(service.create(dto)).rejects.toBe(error);
  });
});
