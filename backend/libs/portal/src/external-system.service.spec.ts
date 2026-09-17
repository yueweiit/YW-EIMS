import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@eims/database';
import { RoleService } from '@eims/roles';
import { ExternalSystemService } from './external-system.service';

describe('ExternalSystemService OAuth2 mode', () => {
  let service: ExternalSystemService;
  const prisma = {
    externalSystem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    oauth2Client: {
      findUnique: jest.fn(),
    },
  };
  const roleService = {
    validateAssignableRoleCodes: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ExternalSystemService,
        { provide: PrismaService, useValue: prisma },
        { provide: RoleService, useValue: roleService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = module.get(ExternalSystemService);
    roleService.validateAssignableRoleCodes.mockResolvedValue([]);
    prisma.externalSystem.findUnique.mockResolvedValue({
      id: 1,
      authMode: 'oauth2',
      oauthClientId: 'eims_budget',
    });
    prisma.externalSystem.update.mockResolvedValue({ id: 1 });
  });

  it('clears a stale OAuth2 application when switching to a normal entry', async () => {
    await service.update(1, { authMode: 'link' }, 'admin');

    expect(prisma.externalSystem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          authMode: 'link',
          oauthClientId: null,
          updateBy: 'admin',
        }),
      }),
    );
    expect(prisma.oauth2Client.findUnique).not.toHaveBeenCalled();
  });
});
