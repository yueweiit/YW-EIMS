import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@eims/database';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { QueryPermissionDto } from './dto/query-permission.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { UpdateRoleAccessDto } from './dto/update-role-access.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const ACTIVE_STATUS = '1';

const ROLE_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  builtIn: true,
  sort: true,
  status: true,
  createBy: true,
  createTime: true,
  updateBy: true,
  updateTime: true,
} satisfies Prisma.SystemRoleSelect;

const PERMISSION_SELECT = {
  id: true,
  code: true,
  name: true,
  type: true,
  systemCode: true,
  parentCode: true,
  routePath: true,
  description: true,
  sort: true,
  status: true,
  createBy: true,
  createTime: true,
  updateBy: true,
  updateTime: true,
} satisfies Prisma.SystemPermissionSelect;

type RoleRecord = Prisma.SystemRoleGetPayload<{
  select: typeof ROLE_SELECT;
}>;

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(query: QueryRoleDto) {
    const current = query.current || 1;
    const size = query.size || 10;
    const where: Prisma.SystemRoleWhereInput = {};
    if (query.name?.trim()) {
      where.OR = [
        { name: { contains: query.name.trim(), mode: 'insensitive' } },
        { code: { contains: query.name.trim().toUpperCase(), mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;

    const [records, total] = await Promise.all([
      this.prisma.systemRole.findMany({
        where,
        select: ROLE_SELECT,
        skip: (current - 1) * size,
        take: size,
        orderBy: [{ sort: 'asc' }, { createTime: 'asc' }],
      }),
      this.prisma.systemRole.count({ where }),
    ]);

    const access = await this.getAccessMaps(records.map((role) => role.id));
    return {
      records: records.map((role) => this.withAccess(role, access)),
      total,
      current,
      size,
    };
  }

  async findOne(id: number) {
    const role = await this.prisma.systemRole.findUnique({
      where: { id },
      select: ROLE_SELECT,
    });
    if (!role) throw new NotFoundException('角色不存在');

    const access = await this.getAccessMaps([id]);
    return this.withAccess(role, access);
  }

  async findOptions() {
    return this.prisma.systemRole.findMany({
      where: { status: ACTIVE_STATUS },
      select: { id: true, code: true, name: true, status: true },
      orderBy: [{ sort: 'asc' }, { createTime: 'asc' }],
    });
  }

  async getAccessCatalog() {
    const [systems, permissions] = await Promise.all([
      this.prisma.externalSystem.findMany({
        select: {
          code: true,
          name: true,
          status: true,
          accessMode: true,
          sort: true,
        },
        orderBy: [{ sort: 'asc' }, { createTime: 'asc' }],
      }),
      this.prisma.systemPermission.findMany({
        select: PERMISSION_SELECT,
        orderBy: [{ type: 'asc' }, { sort: 'asc' }, { createTime: 'asc' }],
      }),
    ]);
    return { systems, permissions };
  }

  async create(dto: CreateRoleDto, currentUserName: string) {
    const code = this.normalizeRoleCode(dto.code);
    const data: Prisma.SystemRoleUncheckedCreateInput = {
      code,
      name: this.requireText(dto.name, '角色名称'),
      description: this.normalizeOptionalText(dto.description),
      builtIn: false,
      sort: dto.sort ?? 0,
      status: dto.status ?? ACTIVE_STATUS,
      createBy: currentUserName,
    };

    try {
      return await this.prisma.systemRole.create({
        data,
        select: ROLE_SELECT,
      });
    } catch (error) {
      this.throwUniqueConflict(error, '角色编码已存在');
      throw error;
    }
  }

  async update(
    id: number,
    dto: UpdateRoleDto,
    currentUserName: string,
    currentUserRoles: string[] = [],
  ) {
    const existing = await this.getRole(id);
    this.assertBuiltInCanBeChanged(existing, currentUserRoles);
    if (existing.code === 'R_SUPER' && dto.status === '2') {
      throw new ForbiddenException('超级管理员角色不能禁用');
    }

    const data: Prisma.SystemRoleUncheckedUpdateInput = {
      updateBy: currentUserName,
    };
    if (dto.name !== undefined) data.name = this.requireText(dto.name, '角色名称');
    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalText(dto.description);
    }
    if (dto.sort !== undefined) data.sort = dto.sort;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.systemRole.update({
      where: { id },
      data,
      select: ROLE_SELECT,
    });
  }

  async remove(id: number, currentUserRoles: string[] = []) {
    const existing = await this.getRole(id);
    this.assertBuiltInCanBeChanged(existing, currentUserRoles);

    const [assignedUser, assignedSystem] = await Promise.all([
      this.prisma.user.findFirst({
        where: { roles: { has: existing.code } },
        select: { id: true },
      }),
      this.prisma.externalSystem.findFirst({
        where: {
          accessMode: 'roles',
          allowedRoles: { has: existing.code },
        },
        select: { id: true },
      }),
    ]);
    if (assignedUser) {
      throw new ConflictException('该角色仍分配给用户，请先移除用户角色');
    }
    if (assignedSystem) {
      throw new ConflictException('该角色仍用于系统访问，请先移除系统权限');
    }

    await this.prisma.systemRole.delete({ where: { id } });
    return true;
  }

  async updateAccess(
    id: number,
    dto: UpdateRoleAccessDto,
    currentUserRoles: string[] = [],
  ) {
    const role = await this.getRole(id);
    this.assertBuiltInCanBeChanged(role, currentUserRoles);

    const systemCodes =
      dto.systemCodes === undefined
        ? undefined
        : this.normalizeCodeList(dto.systemCodes, '系统编码');
    const permissionCodes =
      dto.permissionCodes === undefined
        ? undefined
        : this.normalizeCodeList(dto.permissionCodes, '权限编码');

    const [systems, permissions] = await Promise.all([
      systemCodes === undefined
        ? Promise.resolve([])
        : this.prisma.externalSystem.findMany({
            where: { code: { in: systemCodes } },
            select: { id: true, code: true },
          }),
      permissionCodes === undefined
        ? Promise.resolve([])
        : this.prisma.systemPermission.findMany({
            where: { code: { in: permissionCodes } },
            select: { id: true, code: true },
          }),
    ]);

    if (systemCodes && systems.length !== systemCodes.length) {
      throw new BadRequestException('包含不存在的业务系统');
    }
    if (permissionCodes && permissions.length !== permissionCodes.length) {
      throw new BadRequestException('包含不存在的功能权限');
    }

    await this.prisma.$transaction(async (transaction) => {
      if (systemCodes !== undefined) {
        const allSystems = await transaction.externalSystem.findMany({
          select: { id: true, code: true, accessMode: true, allowedRoles: true },
        });
        const selected = new Set(systemCodes);
        for (const system of allSystems) {
          if (system.accessMode !== 'roles') continue;
          const nextRoles = selected.has(system.code)
            ? [...new Set([...system.allowedRoles, role.code])]
            : system.allowedRoles.filter((code) => code !== role.code);
          if (nextRoles.length !== system.allowedRoles.length || nextRoles.some((code) => !system.allowedRoles.includes(code))) {
            await transaction.externalSystem.update({
              where: { id: system.id },
              data: { allowedRoles: nextRoles },
            });
          }
        }
      }

      if (permissionCodes !== undefined) {
        await transaction.systemRolePermission.deleteMany({ where: { roleId: id } });
        if (permissions.length > 0) {
          await transaction.systemRolePermission.createMany({
            data: permissions.map((permission) => ({
              roleId: id,
              permissionId: permission.id,
            })),
          });
        }
      }
    });

    return this.findOne(id);
  }

  async findPermissionPage(query: QueryPermissionDto) {
    const current = query.current || 1;
    const size = query.size || 10;
    const where: Prisma.SystemPermissionWhereInput = {};
    if (query.name?.trim()) {
      where.OR = [
        { name: { contains: query.name.trim(), mode: 'insensitive' } },
        { code: { contains: query.name.trim(), mode: 'insensitive' } },
      ];
    }
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const [records, total] = await Promise.all([
      this.prisma.systemPermission.findMany({
        where,
        select: PERMISSION_SELECT,
        skip: (current - 1) * size,
        take: size,
        orderBy: [{ type: 'asc' }, { sort: 'asc' }, { createTime: 'asc' }],
      }),
      this.prisma.systemPermission.count({ where }),
    ]);
    return { records, total, current, size };
  }

  async findPermissionOne(id: number) {
    const permission = await this.prisma.systemPermission.findUnique({
      where: { id },
      select: PERMISSION_SELECT,
    });
    if (!permission) throw new NotFoundException('功能权限不存在');
    return permission;
  }

  async createPermission(dto: CreatePermissionDto, currentUserName: string) {
    const data = await this.preparePermissionCreateData(dto, currentUserName);
    try {
      return await this.prisma.systemPermission.create({
        data,
        select: PERMISSION_SELECT,
      });
    } catch (error) {
      this.throwUniqueConflict(error, '权限编码已存在');
      throw error;
    }
  }

  async updatePermission(
    id: number,
    dto: UpdatePermissionDto,
    currentUserName: string,
  ) {
    const existing = await this.findPermissionOne(id);
    const systemCode =
      dto.systemCode === undefined
        ? existing.systemCode
        : this.normalizeOptionalCode(dto.systemCode);
    await this.validateSystemCode(systemCode);

    const data: Prisma.SystemPermissionUncheckedUpdateInput = {
      updateBy: currentUserName,
    };
    if (dto.name !== undefined) data.name = this.requireText(dto.name, '权限名称');
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.systemCode !== undefined) data.systemCode = systemCode;
    if (dto.parentCode !== undefined) {
      data.parentCode = this.normalizeOptionalCode(dto.parentCode);
    }
    if (dto.routePath !== undefined) {
      data.routePath = this.normalizeOptionalText(dto.routePath);
    }
    if (dto.description !== undefined) {
      data.description = this.normalizeOptionalText(dto.description);
    }
    if (dto.sort !== undefined) data.sort = dto.sort;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.systemPermission.update({
      where: { id },
      data,
      select: PERMISSION_SELECT,
    });
  }

  async removePermission(id: number) {
    await this.findPermissionOne(id);
    await this.prisma.systemPermission.delete({ where: { id } });
    return true;
  }

  async getActiveRoleCodes(userRoles: string[]) {
    const normalizedRoles = [
      ...new Set(userRoles.map((role) => role.trim()).filter(Boolean)),
    ];
    if (normalizedRoles.length === 0) return [];
    const activeRoles = await this.prisma.systemRole.findMany({
      where: { code: { in: normalizedRoles }, status: ACTIVE_STATUS },
      select: { code: true },
    });
    const activeCodes = new Set(activeRoles.map((role) => role.code));
    return normalizedRoles.filter((role) => activeCodes.has(role));
  }

  async getActivePermissionCodes(userRoles: string[]) {
    const activeRoles = await this.prisma.systemRole.findMany({
      where: {
        code: { in: [...new Set(userRoles.map((role) => role.trim()).filter(Boolean))] },
        status: ACTIVE_STATUS,
      },
      select: { id: true, code: true },
    });
    if (activeRoles.some((role) => role.code === 'R_SUPER')) return ['*'];
    if (activeRoles.length === 0) return [];

    const links = await this.prisma.systemRolePermission.findMany({
      where: {
        roleId: { in: activeRoles.map((role) => role.id) },
        permission: { status: ACTIVE_STATUS },
      },
      select: { permission: { select: { code: true } } },
    });
    return [...new Set(links.map((link) => link.permission.code))];
  }

  async validateAssignableRoleCodes(roleCodes: string[]) {
    const normalized = [...new Set(roleCodes.map((role) => role.trim()).filter(Boolean))];
    if (normalized.length === 0) return [];
    const active = await this.getActiveRoleCodes(normalized);
    if (active.length !== normalized.length) {
      throw new BadRequestException('包含不存在或已停用的角色');
    }
    return active;
  }

  async userHasPermission(userId: number, permissionCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, roles: true },
    });
    if (!user || user.status !== ACTIVE_STATUS) return false;
    const permissions = await this.getActivePermissionCodes(user.roles);
    return permissions.includes('*') || permissions.includes(permissionCode);
  }

  private async getRole(id: number) {
    const role = await this.prisma.systemRole.findUnique({
      where: { id },
      select: ROLE_SELECT,
    });
    if (!role) throw new NotFoundException('角色不存在');
    return role;
  }

  private async getAccessMaps(roleIds: number[]) {
    const [systems, roleRecords, links] = await Promise.all([
      this.prisma.externalSystem.findMany({
        select: { code: true, accessMode: true, allowedRoles: true },
      }),
      this.prisma.systemRole.findMany({
        where: { id: { in: roleIds } },
        select: { id: true, code: true },
      }),
      roleIds.length
        ? this.prisma.systemRolePermission.findMany({
            where: { roleId: { in: roleIds } },
            select: { roleId: true, permission: { select: { code: true } } },
          })
        : Promise.resolve([]),
    ]);

    const systemsByRole = new Map<string, string[]>();
    for (const system of systems) {
      const roleCodes =
        system.accessMode === 'all'
          ? roleRecords
              .map((role) => role.code)
          : system.allowedRoles;
      for (const roleCode of roleCodes) {
        const roleSystems = systemsByRole.get(roleCode) || [];
        roleSystems.push(system.code);
        systemsByRole.set(roleCode, roleSystems);
      }
    }

    const permissionsByRole = new Map<number, string[]>();
    for (const link of links) {
      const rolePermissions = permissionsByRole.get(link.roleId) || [];
      rolePermissions.push(link.permission.code);
      permissionsByRole.set(link.roleId, rolePermissions);
    }
    return { systemsByRole, permissionsByRole };
  }

  private withAccess(
    role: RoleRecord,
    access: {
      systemsByRole: Map<string, string[]>;
      permissionsByRole: Map<number, string[]>;
    },
  ) {
    return {
      ...role,
      systemCodes: [...new Set(access.systemsByRole.get(role.code) || [])],
      permissionCodes: [...new Set(access.permissionsByRole.get(role.id) || [])],
    };
  }

  private async preparePermissionCreateData(
    dto: CreatePermissionDto,
    currentUserName: string,
  ): Promise<Prisma.SystemPermissionUncheckedCreateInput> {
    const code = this.normalizePermissionCode(dto.code);
    const systemCode = this.normalizeOptionalCode(dto.systemCode);
    await this.validateSystemCode(systemCode);
    return {
      code,
      name: this.requireText(dto.name, '权限名称'),
      type: dto.type || 'menu',
      systemCode,
      parentCode: this.normalizeOptionalCode(dto.parentCode),
      routePath: this.normalizeOptionalText(dto.routePath),
      description: this.normalizeOptionalText(dto.description),
      sort: dto.sort ?? 0,
      status: dto.status ?? ACTIVE_STATUS,
      createBy: currentUserName,
    };
  }

  private async validateSystemCode(systemCode: string | null) {
    if (!systemCode) return;
    const system = await this.prisma.externalSystem.findUnique({
      where: { code: systemCode },
      select: { code: true },
    });
    if (!system) throw new NotFoundException('关联的业务系统不存在');
  }

  private assertBuiltInCanBeChanged(
    role: RoleRecord,
    currentUserRoles: string[],
  ) {
    if (role.builtIn && !currentUserRoles.includes('R_SUPER')) {
      throw new ForbiddenException('内置角色只能由超级管理员维护');
    }
  }

  private normalizeRoleCode(code: string) {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9:_-]{1,49}$/.test(normalized)) {
      throw new BadRequestException(
        '角色编码只能包含大写字母、数字、冒号、下划线或中划线，长度为 2-50 位',
      );
    }
    return normalized;
  }

  private normalizePermissionCode(code: string) {
    const normalized = code.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9:._/-]{1,99}$/.test(normalized)) {
      throw new BadRequestException('权限编码格式无效');
    }
    return normalized;
  }

  private normalizeCodeList(values: string[], label: string) {
    const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
    if (normalized.length > 200) {
      throw new BadRequestException(`${label}数量不能超过 200 个`);
    }
    return normalized;
  }

  private normalizeOptionalCode(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private requireText(value: string, label: string) {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException(`${label}不能为空`);
    return normalized;
  }

  private throwUniqueConflict(error: unknown, message: string): void {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: unknown }).code
        : undefined;
    if (errorCode === 'P2002') throw new ConflictException(message);
  }
}
