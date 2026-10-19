import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@eims/database';
import { OAuth2BindingService } from './oauth2-binding.service';

describe('OAuth2BindingService conflicts', () => {
  let service: OAuth2BindingService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    oauth2Client: { findUnique: jest.fn() },
    oauth2UserBinding: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
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
      externalSystem: { authMode: 'oauth2' },
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

  it('groups every application binding under its EIMS user', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 7,
        userName: 'zhangsan',
        realName: '张三',
        status: '1',
        oauth2UserBindings: [binding],
      },
    ]);
    prisma.user.count.mockResolvedValue(1);

    await expect(
      service.findUserPage({
        current: 1,
        size: 10,
        keyword: '张三',
        clientId: 'erp',
      }),
    ).resolves.toEqual({
      records: [
        {
          id: 7,
          userName: 'zhangsan',
          realName: '张三',
          status: '1',
          bindings: [binding],
        },
      ],
      total: 1,
      current: 1,
      size: 10,
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            {
              userName: {
                contains: '张三',
                mode: 'insensitive',
              },
            },
            {
              realName: {
                contains: '张三',
                mode: 'insensitive',
              },
            },
          ],
          oauth2UserBindings: {
            some: {
              clientId: {
                contains: 'erp',
                mode: 'insensitive',
              },
              client: {
                externalSystem: {
                  is: { authMode: 'oauth2' },
                },
              },
            },
          },
        },
      }),
    );
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

  it('requires confirmation before sharing an account without writing', async () => {
    prisma.oauth2UserBinding.findFirst.mockResolvedValue({ id: 11 });

    await expect(service.create(dto)).rejects.toMatchObject({
      status: 409,
      message: 'OAUTH2_SHARED_ACCOUNT_CONFIRMATION_REQUIRED',
    });
    expect(prisma.oauth2UserBinding.create).not.toHaveBeenCalled();
    expect(prisma.oauth2UserBinding.findFirst).toHaveBeenCalledWith({
      where: { clientId: 'erp', appUserId: 'ERP-007' },
      select: { id: true },
    });
  });

  it('allows sharing after confirmation without changing the other binding', async () => {
    prisma.oauth2UserBinding.create.mockResolvedValue(binding);
    await expect(
      service.create({ ...dto, confirmSharedAccount: true }),
    ).resolves.toEqual(binding);
    expect(prisma.oauth2UserBinding.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining(dto) }),
    );
    expect(prisma.oauth2UserBinding.update).not.toHaveBeenCalled();
  });

  it('still rejects a duplicate user/application even with confirmation', async () => {
    prisma.oauth2UserBinding.findUnique.mockResolvedValue(binding);
    await expect(
      service.create({ ...dto, confirmSharedAccount: true }),
    ).rejects.toMatchObject({ status: 409 });
    expect(prisma.oauth2UserBinding.create).not.toHaveBeenCalled();
  });

  it('rejects binding an application that is not configured for an OAuth2 system', async () => {
    prisma.oauth2Client.findUnique.mockResolvedValueOnce({
      clientId: 'erp',
      status: '1',
      externalSystem: { authMode: 'link' },
    });

    await expect(service.create(dto)).rejects.toMatchObject({
      status: 404,
      message: expect.stringContaining('OAuth2 外部系统'),
    });
    expect(prisma.oauth2UserBinding.findUnique).not.toHaveBeenCalled();
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
    [['client_id', 'app_user_id'], '数据库迁移'],
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

  it('requires confirmation when changing to a shared account', async () => {
    prisma.oauth2UserBinding.findUnique.mockResolvedValueOnce(binding);
    prisma.oauth2UserBinding.findFirst.mockResolvedValue({ id: 11 });

    await expect(
      service.update(10, { appUserId: 'occupied' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'OAUTH2_SHARED_ACCOUNT_CONFIRMATION_REQUIRED',
    });
    expect(prisma.oauth2UserBinding.update).not.toHaveBeenCalled();
    expect(prisma.oauth2UserBinding.findFirst).toHaveBeenCalledWith({
      where: { clientId: 'erp', appUserId: 'occupied', id: { not: 10 } },
      select: { id: true },
    });
  });

  it('explains a missing database migration instead of falsely reporting success', async () => {
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
      message: expect.stringContaining('数据库迁移'),
    });
  });

  it('updates to a shared account after confirmation and preserves the binding owner', async () => {
    prisma.oauth2UserBinding.findUnique.mockResolvedValueOnce(binding);
    prisma.oauth2UserBinding.update.mockResolvedValue({
      ...binding,
      appUserId: 'shared',
    });
    await expect(
      service.update(10, { appUserId: ' shared ', confirmSharedAccount: true }),
    ).resolves.toMatchObject({
      ssoUserId: 7,
      clientId: 'erp',
      appUserId: 'shared',
    });
    expect(prisma.oauth2UserBinding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: { appUserId: 'shared', appUsername: null },
      }),
    );
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
    expect(prisma.oauth2UserBinding.findFirst).not.toHaveBeenCalled();
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
