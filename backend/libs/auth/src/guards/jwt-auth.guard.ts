import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '@eims/common';
import { PrismaService } from '@eims/database';
import type { JwtPayload, RequestWithUser } from '../auth.types';
import { EIMS_ACCESS_COOKIE, getCookie } from '../auth-cookies';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : getCookie(request, EIMS_ACCESS_COOKIE);
    if (!token) {
      throw new UnauthorizedException('token expired or missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
      if (!Number.isInteger(payload.sub) || payload.sub < 1) {
        throw new UnauthorizedException('token expired or invalid');
      }
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { status: true },
      });
      if (!user || user.status !== '1') {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('token expired or invalid');
    }
  }
}
