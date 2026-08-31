import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@eims/database';
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

    if (user.status !== '1') {
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
      select: {
        id: true,
        userName: true,
        roles: true,
        buttons: true,
        status: true,
      },
    });
    if (!user || user.status !== '1') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }
    const roles = await this.getActiveRoleCodes(user.roles);
    const permissions = await this.getActivePermissionCodes(roles);
    return {
      userId: String(user.id),
      userName: user.userName,
      roles,
      buttons: user.buttons,
      permissions,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      if (!dto.refreshToken) {
        throw new UnauthorizedException('refresh token missing');
      }
      const refreshToken = dto.refreshToken;
      const now = new Date();
      const session = await this.prisma.authRefreshSession.findUnique({
        where: { tokenHash: this.hashRefreshToken(refreshToken) },
        select: {
          id: true,
          expiresAt: true,
          revokedAt: true,
          user: { select: { id: true, userName: true, status: true } },
        },
      });
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt <= now ||
        session.user.status !== '1'
      ) {
        throw new UnauthorizedException('refresh token expired or invalid');
      }

      const revoked = await this.prisma.authRefreshSession.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });
      if (revoked.count !== 1) {
        throw new UnauthorizedException('refresh token already used');
      }

      return this.generateTokens(session.user.id, session.user.userName);
    } catch {
      throw new UnauthorizedException('refresh token expired or invalid');
    }
  }

  async logout(dto: RefreshTokenDto) {
    if (!dto.refreshToken) return {};
    await this.prisma.authRefreshSession.updateMany({
      where: {
        tokenHash: this.hashRefreshToken(dto.refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return {};
  }

  /** Revoke every EIMS browser session for a user (used by single logout). */
  async revokeAllSessions(userId: number) {
    return this.prisma.authRefreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Resolve a cookie access token without throwing; used by public logout. */
  async resolveAccessTokenUserId(token?: string) {
    if (!token) return undefined;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: number }>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      if (!Number.isInteger(payload.sub) || (payload.sub || 0) < 1) {
        return undefined;
      }
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, status: true },
      });
      return user?.status === '1' ? user.id : undefined;
    } catch {
      return undefined;
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
    if (user.status !== '1') {
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
    if (!user || user.status !== '1') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    return this.generateTokens(user.id, user.userName);
  }

  private async generateTokens(userId: number, userName: string) {
    const payload = { sub: userId, userName };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    });
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.authRefreshSession.create({
      data: {
        tokenHash: this.hashRefreshToken(refreshToken),
        userId,
        expiresAt: new Date(Date.now() + this.getRefreshSessionLifetimeMs()),
      },
    });
    return { token, refreshToken };
  }

  private hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async getActiveRoleCodes(userRoles: string[]) {
    const normalizedRoles = [
      ...new Set(userRoles.map(role => role.trim()).filter(Boolean)),
    ];
    if (normalizedRoles.length === 0) return [];

    const activeRoles = await this.prisma.systemRole.findMany({
      where: { code: { in: normalizedRoles }, status: '1' },
      select: { code: true },
    });
    const activeCodes = new Set(activeRoles.map(role => role.code));
    return normalizedRoles.filter(role => activeCodes.has(role));
  }

  private async getActivePermissionCodes(userRoles: string[]) {
    if (userRoles.includes('R_SUPER')) return ['*'];
    if (userRoles.length === 0) return [];

    const roles = await this.prisma.systemRole.findMany({
      where: { code: { in: userRoles }, status: '1' },
      select: { id: true },
    });
    if (roles.length === 0) return [];

    const links = await this.prisma.systemRolePermission.findMany({
      where: {
        roleId: { in: roles.map(role => role.id) },
        permission: { status: '1' },
      },
      select: { permission: { select: { code: true } } },
    });
    return [...new Set(links.map(link => link.permission.code))];
  }

  private getRefreshSessionLifetimeMs() {
    const configured = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    const match = /^(\d+)\s*([smhd])?$/.exec(configured.trim());
    if (!match) return 7 * 24 * 60 * 60 * 1000;

    const value = Number(match[1]);
    const unit = match[2] || 's';
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * multipliers[unit];
  }
}
