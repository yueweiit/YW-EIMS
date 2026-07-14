import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@eims/database';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

const USER_SELECT = {
  id: true,
  userName: true,
  realName: true,
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
  constructor(private readonly prisma: PrismaService) {}

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

  async create(dto: CreateUserDto, currentUserName: string) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        userName: dto.userName,
        password: hashedPassword,
        realName: dto.realName,
        roles: dto.roles ?? [],
        buttons: dto.buttons ?? [],
        dingTalkSubject: dto.dingTalkSubject?.trim() || null,
        status: dto.status ?? '1',
        createBy: currentUserName,
      },
      select: USER_SELECT,
    });
  }

  async update(id: number, dto: UpdateUserDto, currentUserName: string) {
    const { password, dingTalkSubject, ...rest } = dto;
    const data: Prisma.UserUpdateInput = {
      ...rest,
      updateBy: currentUserName,
    };
    if (dingTalkSubject !== undefined) {
      data.dingTalkSubject = dingTalkSubject.trim() || null;
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  async remove(id: number) {
    await this.prisma.user.delete({ where: { id } });
    return null;
  }
}
