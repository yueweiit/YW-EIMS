import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { CreateBindingDto } from './dto/create-binding.dto';
import { UpdateBindingDto } from './dto/update-binding.dto';

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
    const appUserId = this.normalizeAppUserId(dto.appUserId);

    // 验证 SSO 用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: dto.ssoUserId },
      select: { id: true, userName: true, realName: true, status: true },
    });
    if (!user || user.status !== '1') {
      throw new NotFoundException('SSO 用户不存在');
    }

    // 验证 OAuth2 Client 存在
    const client = await this.prisma.oauth2Client.findUnique({
      where: { clientId: dto.clientId },
      select: { clientId: true, name: true, status: true },
    });
    if (!client || client.status !== '1') {
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
          appUserId,
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
        appUserId,
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
      `Created binding: SSO user ${dto.ssoUserId} → ${dto.clientId} → app user ${appUserId}`,
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

  /** 更新业务系统账号，不改变 EIMS 用户和 OAuth2 应用。 */
  async update(id: number, dto: UpdateBindingDto) {
    const appUserId = this.normalizeAppUserId(dto.appUserId);

    const existing = await this.prisma.oauth2UserBinding.findUnique({
      where: { id },
      select: { id: true, clientId: true, appUserId: true },
    });
    if (!existing) throw new NotFoundException('绑定关系不存在');

    if (existing.appUserId !== appUserId) {
      const conflictBinding = await this.prisma.oauth2UserBinding.findUnique({
        where: {
          clientId_appUserId: {
            clientId: existing.clientId,
            appUserId,
          },
        },
        select: { id: true },
      });
      if (conflictBinding && conflictBinding.id !== id) {
        throw new ConflictException('该业务系统用户已被其他 SSO 用户绑定');
      }
    }

    return this.prisma.oauth2UserBinding.update({
      where: { id },
      data: {
        appUserId,
        appUsername: dto.appUsername?.trim() || null,
      },
      select: {
        id: true,
        ssoUserId: true,
        clientId: true,
        appUserId: true,
        appUsername: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 外部系统账号 ID 是不透明标识符：即使原始值是数字，也必须按字符串保存和比较。
   * 去掉首尾空白可以避免同一个账号因录入格式不同产生重复绑定；控制字符禁止进入数据库。
   */
  private normalizeAppUserId(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException('业务系统用户ID不能为空');
    }
    if (normalized.length > 255) {
      throw new BadRequestException('业务系统用户ID长度不能超过255个字符');
    }
    if (/[\u0000-\u001F\u007F]/.test(normalized)) {
      throw new BadRequestException('业务系统用户ID不能包含控制字符');
    }
    return normalized;
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
