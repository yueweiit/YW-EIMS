import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { CreateBindingDto } from './dto/create-binding.dto';

@Injectable()
export class OAuth2BindingService {
  private readonly logger = new Logger(OAuth2BindingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 分页查询绑定列表
   */
  async findPage(
    current: number = 1,
    size: number = 10,
    ssoUserId?: number,
    clientId?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (ssoUserId) where.ssoUserId = ssoUserId;
    if (clientId) where.clientId = clientId;

    const [records, total] = await Promise.all([
      this.prisma.oauth2UserBinding.findMany({
        where,
        select: {
          id: true,
          ssoUserId: true,
          clientId: true,
          appUserId: true,
          appUsername: true,
          createdAt: true,
          updatedAt: true,
          ssoUser: {
            select: {
              id: true,
              userName: true,
              realName: true,
            },
          },
          client: {
            select: {
              clientId: true,
              name: true,
            },
          },
        },
        skip: (current - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.oauth2UserBinding.count({ where }),
    ]);

    return { records, total, current, size };
  }

  /**
   * 创建绑定
   */
  async create(dto: CreateBindingDto) {
    // 验证 SSO 用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: dto.ssoUserId },
      select: { id: true, userName: true, realName: true },
    });
    if (!user) {
      throw new NotFoundException('SSO 用户不存在');
    }

    // 验证 OAuth2 Client 存在
    const client = await this.prisma.oauth2Client.findUnique({
      where: { clientId: dto.clientId },
      select: { clientId: true, name: true },
    });
    if (!client) {
      throw new NotFoundException('OAuth2 应用不存在');
    }

    // 检查是否已绑定
    const existing = await this.prisma.oauth2UserBinding.findUnique({
      where: {
        ssoUserId_clientId: {
          ssoUserId: dto.ssoUserId,
          clientId: dto.clientId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('该用户已绑定此应用');
    }

    // 检查业务系统用户ID是否已被其他 SSO 用户绑定
    const conflictBinding = await this.prisma.oauth2UserBinding.findUnique({
      where: {
        clientId_appUserId: {
          clientId: dto.clientId,
          appUserId: dto.appUserId,
        },
      },
    });
    if (conflictBinding) {
      throw new ConflictException('该业务系统用户已被其他 SSO 用户绑定');
    }

    const binding = await this.prisma.oauth2UserBinding.create({
      data: {
        ssoUserId: dto.ssoUserId,
        clientId: dto.clientId,
        appUserId: dto.appUserId,
        appUsername: dto.appUsername,
      },
      select: {
        id: true,
        ssoUserId: true,
        clientId: true,
        appUserId: true,
        appUsername: true,
        createdAt: true,
      },
    });

    this.logger.log(
      `Created binding: SSO user ${dto.ssoUserId} → ${dto.clientId} → app user ${dto.appUserId}`,
    );

    return binding;
  }

  /**
   * 删除绑定
   */
  async remove(id: number) {
    const existing = await this.prisma.oauth2UserBinding.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('绑定关系不存在');
    }

    await this.prisma.oauth2UserBinding.delete({ where: { id } });
    return true;
  }

  /**
   * 根据 SSO 用户 ID 和 Client ID 查询绑定
   */
  async findBySsoUserAndClient(ssoUserId: number, clientId: string) {
    return this.prisma.oauth2UserBinding.findUnique({
      where: {
        ssoUserId_clientId: {
          ssoUserId,
          clientId,
        },
      },
      select: {
        id: true,
        ssoUserId: true,
        clientId: true,
        appUserId: true,
        appUsername: true,
      },
    });
  }
}
