import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@eims/database';
import { RoleService } from '@eims/roles';
import { CreateExternalSystemDto } from './dto/create-external-system.dto';
import { UpdateExternalSystemDto } from './dto/update-external-system.dto';

const ACTIVE_STATUS = '1';

const ADMIN_SYSTEM_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  icon: true,
  color: true,
  entryUrl: true,
  authMode: true,
  accessMode: true,
  allowedRoles: true,
  category: true,
  helpUrl: true,
  feedbackUrl: true,
  contact: true,
  oauthClientId: true,
  sort: true,
  status: true,
  createBy: true,
  createTime: true,
  updateBy: true,
  updateTime: true,
  oauthClient: {
    select: {
      clientId: true,
      name: true,
      status: true,
    },
  },
} satisfies Prisma.ExternalSystemSelect;

const PORTAL_SYSTEM_SELECT = {
  code: true,
  status: true,
  name: true,
  description: true,
  icon: true,
  color: true,
  entryUrl: true,
  authMode: true,
  accessMode: true,
  allowedRoles: true,
  category: true,
  helpUrl: true,
  feedbackUrl: true,
  contact: true,
  oauthClientId: true,
  oauthClient: {
    select: {
      clientId: true,
      status: true,
    },
  },
} satisfies Prisma.ExternalSystemSelect;

const PORTAL_BINDING_SELECT = {
  clientId: true,
  appUserId: true,
  appUsername: true,
} satisfies Prisma.Oauth2UserBindingSelect;

type PortalSystem = Prisma.ExternalSystemGetPayload<{
  select: typeof PORTAL_SYSTEM_SELECT;
}>;

type PortalBinding = Prisma.Oauth2UserBindingGetPayload<{
  select: typeof PORTAL_BINDING_SELECT;
}>;

@Injectable()
export class ExternalSystemService {
  private readonly logger = new Logger(ExternalSystemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: RoleService,
  ) {}

  async findPage(current = 1, size = 10, name?: string, status?: string) {
    const where: Prisma.ExternalSystemWhereInput = {};
    if (name?.trim()) {
      where.name = { contains: name.trim(), mode: 'insensitive' };
    }
    if (status) where.status = status;

    const page = Math.max(1, current);
    const pageSize = Math.min(100, Math.max(1, size));
    const [records, total] = await Promise.all([
      this.prisma.externalSystem.findMany({
        where,
        select: ADMIN_SYSTEM_SELECT,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sort: 'asc' }, { createTime: 'desc' }],
      }),
      this.prisma.externalSystem.count({ where }),
    ]);

    return { records, total, current: page, size: pageSize };
  }

  async findOne(id: number) {
    const system = await this.prisma.externalSystem.findUnique({
      where: { id },
      select: ADMIN_SYSTEM_SELECT,
    });
    if (!system) throw new NotFoundException('外部系统不存在');
    return system;
  }

  async create(dto: CreateExternalSystemDto, currentUserName: string) {
    const code = this.normalizeCode(dto.code);
    const existing = await this.prisma.externalSystem.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existing) throw new ConflictException('系统编码已存在');

    const data = await this.prepareCreateData(dto);
    try {
      const system = await this.prisma.externalSystem.create({
        data: {
          ...data,
          createBy: currentUserName,
        },
        select: ADMIN_SYSTEM_SELECT,
      });
      this.logger.log(
        `Created portal system ${system.code} by ${currentUserName}`,
      );
      return system;
    } catch (error) {
      this.throwUniqueConflict(error);
      throw error;
    }
  }

  async update(
    id: number,
    dto: UpdateExternalSystemDto,
    currentUserName: string,
  ) {
    const existing = await this.prisma.externalSystem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('外部系统不存在');

    const authMode = dto.authMode ?? existing.authMode;
    const oauthClientId =
      dto.oauthClientId === undefined
        ? existing.oauthClientId
        : this.normalizeOptionalText(dto.oauthClientId);
    const accessMode = dto.accessMode ?? existing.accessMode;
    await this.validateOauthClient(authMode, oauthClientId);

    const data: Prisma.ExternalSystemUncheckedUpdateInput = {
      updateBy: currentUserName,
    };
    if (dto.name !== undefined)
      data.name = this.requireText(dto.name, '系统名称');
    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalText(dto.description);
    }
    if (dto.icon !== undefined) data.icon = this.requireText(dto.icon, '图标');
    if (dto.color !== undefined) data.color = this.normalizeColor(dto.color);
    if (dto.entryUrl !== undefined) {
      data.entryUrl = this.normalizeHttpUrl(dto.entryUrl, '入口地址');
    }
    if (dto.authMode !== undefined) data.authMode = authMode;
    if (dto.accessMode !== undefined) {
      data.accessMode = accessMode;
    }
    if (accessMode === 'all') {
      data.allowedRoles = [];
    } else if (dto.allowedRoles !== undefined) {
      data.allowedRoles = this.normalizeRoles(dto.allowedRoles);
    }
    if (dto.category !== undefined) {
      data.category = this.requireText(dto.category, '系统分类');
    }
    if (dto.helpUrl !== undefined) {
      data.helpUrl = this.normalizeOptionalUrl(dto.helpUrl, '说明地址', [
        'http:',
        'https:',
      ]);
    }
    if (dto.feedbackUrl !== undefined) {
      data.feedbackUrl = this.normalizeOptionalUrl(
        dto.feedbackUrl,
        '反馈地址',
        ['http:', 'https:', 'mailto:'],
      );
    }
    if (dto.contact !== undefined) {
      data.contact = this.normalizeOptionalText(dto.contact);
    }
    if (dto.oauthClientId !== undefined) data.oauthClientId = oauthClientId;
    if (dto.sort !== undefined) data.sort = dto.sort;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.externalSystem.update({
      where: { id },
      data,
      select: ADMIN_SYSTEM_SELECT,
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.externalSystem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('外部系统不存在');
    await this.prisma.externalSystem.delete({ where: { id } });
    return true;
  }

  async getVisibleSystems(userId: number) {
    const user = await this.getActiveUser(userId);
    const activeRoles = await this.roleService.getActiveRoleCodes(user.roles);
    const systems = await this.prisma.externalSystem.findMany({
      where: { status: ACTIVE_STATUS },
      select: PORTAL_SYSTEM_SELECT,
      orderBy: [{ sort: 'asc' }, { createTime: 'asc' }],
    });
    const visibleSystems = systems.filter((system) =>
      this.hasSystemAccess(system.accessMode, system.allowedRoles, activeRoles),
    );
    const clientIds = visibleSystems
      .map((system) => system.oauthClientId)
      .filter((clientId): clientId is string => Boolean(clientId));
    const bindings = clientIds.length
      ? await this.prisma.oauth2UserBinding.findMany({
          where: { ssoUserId: user.id, clientId: { in: clientIds } },
          select: PORTAL_BINDING_SELECT,
        })
      : [];
    const bindingMap = new Map(
      bindings.map((binding) => [binding.clientId, binding]),
    );

    return visibleSystems.map((system) =>
      this.toPortalSystem(
        system,
        activeRoles,
        bindingMap.get(system.oauthClientId || ''),
      ),
    );
  }

  async getMyPermissions(userId: number) {
    const user = await this.getActiveUser(userId);
    const roles = await this.roleService.getActiveRoleCodes(user.roles);
    return {
      roles,
      buttons: user.buttons,
      permissions: await this.roleService.getActivePermissionCodes(roles),
      systems: await this.getVisibleSystems(userId),
    };
  }

  async launch(userId: number, code: string) {
    const user = await this.getActiveUser(userId);
    const activeRoles = await this.roleService.getActiveRoleCodes(user.roles);
    const system = await this.prisma.externalSystem.findUnique({
      where: { code },
      select: PORTAL_SYSTEM_SELECT,
    });
    if (!system || system.status !== ACTIVE_STATUS) {
      throw new NotFoundException('外部系统不存在或已停用');
    }
    if (!this.hasSystemAccess(system.accessMode, system.allowedRoles, activeRoles)) {
      throw new ForbiddenException('当前用户没有访问此系统的权限');
    }

    let binding: PortalBinding | undefined;
    if (system.authMode === 'oauth2') {
      if (!system.oauthClientId || !system.oauthClient) {
        throw new BadRequestException('该系统尚未配置 OAuth2 应用');
      }
      if (system.oauthClient.status !== ACTIVE_STATUS) {
        throw new BadRequestException('该系统的 OAuth2 应用已停用');
      }
      const foundBinding = await this.prisma.oauth2UserBinding.findUnique({
        where: {
          ssoUserId_clientId: {
            ssoUserId: user.id,
            clientId: system.oauthClientId,
          },
        },
        select: PORTAL_BINDING_SELECT,
      });
      if (!foundBinding) {
        throw new BadRequestException(
          '当前用户尚未绑定该系统账号，请联系管理员',
        );
      }
      binding = foundBinding;
    }

    return {
      code: system.code,
      name: system.name,
      url: this.normalizeHttpUrl(system.entryUrl, '入口地址'),
      authMode: system.authMode,
      bindingStatus: system.authMode === 'oauth2' ? 'bound' : 'not_required',
      appUserId: binding?.appUserId ?? null,
      appUsername: binding?.appUsername ?? null,
    };
  }

  private async getActiveUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, roles: true, buttons: true, status: true },
    });
    if (!user || user.status !== ACTIVE_STATUS) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }
    return user;
  }

  private toPortalSystem(
    system: PortalSystem,
    userRoles: string[],
    binding?: PortalBinding,
  ) {
    const bindingStatus = this.getBindingStatus(system, binding);
    return {
      code: system.code,
      name: system.name,
      description: system.description,
      icon: system.icon,
      color: system.color,
      category: system.category,
      authMode: system.authMode,
      roles:
        system.accessMode === 'all'
          ? userRoles
          : system.allowedRoles.filter((role) => userRoles.includes(role)),
      bindingStatus,
      canLaunch: bindingStatus === 'bound' || bindingStatus === 'not_required',
      appUserId: binding?.appUserId ?? null,
      appUsername: binding?.appUsername ?? null,
      helpUrl: system.helpUrl,
      feedbackUrl: system.feedbackUrl,
      contact: system.contact,
    };
  }

  private getBindingStatus(system: PortalSystem, binding?: PortalBinding) {
    if (system.authMode !== 'oauth2') return 'not_required';
    if (!system.oauthClientId || !system.oauthClient) return 'not_configured';
    if (system.oauthClient.status !== ACTIVE_STATUS) return 'not_configured';
    return binding ? 'bound' : 'unbound';
  }

  private hasSystemAccess(
    accessMode: string,
    allowedRoles: string[],
    userRoles: string[],
  ) {
    if (userRoles.includes('R_SUPER')) return true;
    if (accessMode === 'all') return true;
    return accessMode === 'roles' && allowedRoles.some((role) => userRoles.includes(role));
  }

  private async prepareCreateData(dto: CreateExternalSystemDto) {
    const authMode = dto.authMode || 'link';
    const accessMode = dto.accessMode || 'roles';
    const oauthClientId = this.normalizeOptionalText(dto.oauthClientId);
    await this.validateOauthClient(authMode, oauthClientId);
    return {
      code: this.normalizeCode(dto.code),
      name: this.requireText(dto.name, '系统名称'),
      description: this.normalizeOptionalText(dto.description),
      icon: dto.icon
        ? this.requireText(dto.icon, '图标')
        : 'mdi:application-outline',
      color: dto.color ? this.normalizeColor(dto.color) : '#2080f0',
      entryUrl: this.normalizeHttpUrl(dto.entryUrl, '入口地址'),
      authMode,
      accessMode,
      allowedRoles:
        accessMode === 'all' ? [] : this.normalizeRoles(dto.allowedRoles),
      category: dto.category
        ? this.requireText(dto.category, '系统分类')
        : '业务系统',
      helpUrl: this.normalizeOptionalUrl(dto.helpUrl, '说明地址', [
        'http:',
        'https:',
      ]),
      feedbackUrl: this.normalizeOptionalUrl(dto.feedbackUrl, '反馈地址', [
        'http:',
        'https:',
        'mailto:',
      ]),
      contact: this.normalizeOptionalText(dto.contact),
      oauthClientId,
      sort: dto.sort ?? 0,
      status: dto.status || ACTIVE_STATUS,
    } satisfies Prisma.ExternalSystemUncheckedCreateInput;
  }

  private async validateOauthClient(
    authMode: string,
    oauthClientId: string | null,
  ) {
    if (authMode === 'oauth2' && !oauthClientId) {
      throw new BadRequestException('OAuth2 系统必须绑定一个 OAuth2 应用');
    }
    if (!oauthClientId) return;
    const client = await this.prisma.oauth2Client.findUnique({
      where: { clientId: oauthClientId },
      select: { clientId: true },
    });
    if (!client) throw new NotFoundException('关联的 OAuth2 应用不存在');
  }

  private normalizeCode(code: string) {
    return code.trim().toLowerCase();
  }

  private requireText(value: string, label: string) {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException(`${label}不能为空`);
    return normalized;
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private normalizeColor(color: string) {
    const normalized = this.requireText(color, '颜色');
    if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      throw new BadRequestException('颜色必须是六位十六进制颜色值');
    }
    return normalized;
  }

  private normalizeRoles(roles?: string[]) {
    const normalized = [
      ...new Set((roles || []).map((role) => role.trim()).filter(Boolean)),
    ];
    if (normalized.some((role) => !/^[A-Za-z0-9:_-]{1,50}$/.test(role))) {
      throw new BadRequestException(
        '访问角色只能包含字母、数字、冒号、下划线或中划线',
      );
    }
    return normalized;
  }

  private normalizeHttpUrl(value: string, label: string) {
    return this.normalizeUrl(value, label, ['http:', 'https:']);
  }

  private normalizeOptionalUrl(
    value: string | null | undefined,
    label: string,
    protocols: string[],
  ) {
    const normalized = this.normalizeOptionalText(value);
    return normalized ? this.normalizeUrl(normalized, label, protocols) : null;
  }

  private normalizeUrl(value: string, label: string, protocols: string[]) {
    let parsed: URL;
    try {
      parsed = new URL(value.trim());
    } catch {
      throw new BadRequestException(`${label}格式无效`);
    }
    if (
      !protocols.includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.hash
    ) {
      throw new BadRequestException(`${label}只允许安全的 URL 地址`);
    }
    return parsed.toString();
  }

  private throwUniqueConflict(error: unknown): void {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: unknown }).code
        : undefined;
    if (errorCode === 'P2002')
      throw new ConflictException('系统编码或 OAuth2 应用已被占用');
  }
}
