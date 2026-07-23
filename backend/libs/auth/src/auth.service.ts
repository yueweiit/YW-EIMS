import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@eims/database';
import type { JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { userName: dto.userName },
    });
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status === '2') {
      throw new ForbiddenException('账号已禁用，请联系管理员');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return this.generateTokens(user.id, user.userName);
  }

  async getUserInfo(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, userName: true, roles: true, buttons: true },
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return {
      userId: String(user.id),
      userName: user.userName,
      roles: user.roles,
      buttons: user.buttons,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }
      return this.generateTokens(user.id, user.userName);
    } catch {
      throw new UnauthorizedException('refresh token expired or invalid');
    }
  }

  async findEnabledUserByDingTalkSubjects(subjects: Array<string | undefined>) {
    const normalizedSubjects = [
      ...new Set(
        subjects
          .map(subject => subject?.trim())
          .filter((subject): subject is string => Boolean(subject)),
      ),
    ];
    const users = await this.prisma.user.findMany({
      where: { dingTalkSubject: { in: normalizedSubjects } },
      select: { id: true, status: true },
      take: 2,
    });
    if (users.length === 0) {
      throw new UnauthorizedException('该钉钉账号尚未绑定 EIMS 用户');
    }
    if (users.length > 1) {
      throw new UnauthorizedException('该钉钉账号存在多个 EIMS 绑定，请联系管理员');
    }
    const [user] = users;
    if (user.status === '2') {
      throw new ForbiddenException('EIMS 用户已被禁用');
    }
    return user.id;
  }

  hashLoginTicket(ticket: string) {
    return createHash('sha256').update(ticket).digest('hex');
  }

  async exchangeLoginTicket(ticket: string) {
    const ticketHash = this.hashLoginTicket(ticket);
    const now = new Date();
    const record = await this.prisma.authLoginTicket.findUnique({
      where: { ticketHash },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });

    if (!record || record.consumedAt || record.expiresAt <= now) {
      throw new UnauthorizedException('钉钉登录票据无效或已过期');
    }

    const consumed = await this.prisma.authLoginTicket.updateMany({
      where: {
        id: record.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException('钉钉登录票据已被使用');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      select: { id: true, userName: true, status: true },
    });
    if (!user || user.status === '2') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    return this.generateTokens(user.id, user.userName);
  }

  private async generateTokens(userId: number, userName: string) {
    const payload = { sub: userId, userName };
    const [token, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);
    return { token, refreshToken };
  }
}
