import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@eims/database';
import { RoleService } from '@eims/roles';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

const USER_SELECT = {
  id: true,
  userName: true,
  realName: true,
  email: true,
  roles: true,
  buttons: true,
  dingTalkSubject: true,
  status: true,
  createBy: true,
  createTime: true,
  updateBy: true,
  updateTime: true,
};

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: RoleService,
  ) {}

  async findPage(query: QueryUserDto) {
    const { current = 1, size = 10, userName, status } = query;
    const where: Prisma.UserWhereInput = {};
    if (userName) where.userName = { contains: userName };
    if (status) where.status = status;

    const [records, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip: (current - 1) * size,
        take: size,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async create(
    dto: CreateUserDto,
    currentUserName: string,
    currentUserRoles: string[] = [],
  ) {
    this.assertCanManageSuperAdminRole(dto.roles, currentUserRoles);
    const roles = dto.roles
      ? await this.roleService.validateAssignableRoleCodes(dto.roles)
      : [];
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        userName: dto.userName,
        password: hashedPassword,
        realName: dto.realName,
        email: this.normalizeEmail(dto.email),
        roles,
        buttons: dto.buttons ?? [],
        dingTalkSubject: dto.dingTalkSubject?.trim() || null,
        status: dto.status ?? '1',
        createBy: currentUserName,
      },
      select: USER_SELECT,
    });
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    currentUserName: string,
    currentUserRoles: string[] = [],
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { roles: true },
    });
    if (!existing) throw new NotFoundException('用户不存在');
    const roles =
      dto.roles === undefined
        ? undefined
        : await this.roleService.validateAssignableRoleCodes(dto.roles);
    if (
      !this.isSuperAdmin(currentUserRoles) &&
      (existing.roles.includes('R_SUPER') || roles?.includes('R_SUPER'))
    ) {
      throw new ForbiddenException('普通管理员不能操作超级管理员或授予超级管理员角色');
    }

    const { password, dingTalkSubject, email, ...rest } = dto;
    const data: Prisma.UserUpdateInput = {
      ...rest,
      updateBy: currentUserName,
    };
    if (dingTalkSubject !== undefined) {
      data.dingTalkSubject = dingTalkSubject.trim() || null;
    }
    if (email !== undefined) {
      data.email = this.normalizeEmail(email);
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    if (roles !== undefined) data.roles = roles;

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  async remove(id: number, currentUserRoles: string[] = []) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { roles: true },
    });
    if (!existing) throw new NotFoundException('用户不存在');
    if (
      !this.isSuperAdmin(currentUserRoles) &&
      existing.roles.includes('R_SUPER')
    ) {
      throw new ForbiddenException('普通管理员不能删除超级管理员');
    }
    await this.prisma.user.delete({ where: { id } });
    return null;
  }

  private assertCanManageSuperAdminRole(
    roles: string[] | undefined,
    currentUserRoles: string[],
  ) {
    if (!this.isSuperAdmin(currentUserRoles) && roles?.includes('R_SUPER')) {
      throw new ForbiddenException('普通管理员不能授予超级管理员角色');
    }
  }

  private isSuperAdmin(roles: string[]) {
    return roles.includes('R_SUPER');
  }

  private normalizeEmail(email?: string) {
    return email?.trim().toLowerCase() || null;
  }
}
