import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@eims/database';
import type { RequestWithUser } from '../auth.types';

/** Server-side guard for operations that change users or authentication trust. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.sub;
    if (typeof userId !== 'number' || !Number.isInteger(userId) || userId < 1) {
      throw new UnauthorizedException('token expired or missing');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, roles: true },
    });
    if (!user || user.status !== '1') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }
    const activeRoles = await this.prisma.systemRole.findMany({
      where: { code: { in: user.roles }, status: '1' },
      select: { code: true },
    });
    const activeRoleCodes = activeRoles.map((role) => role.code);
    if (!activeRoleCodes.includes('R_SUPER') && !activeRoleCodes.includes('R_ADMIN')) {
      throw new ForbiddenException('仅管理员可以执行此操作');
    }
    if (request.user) {
      request.user.roles = activeRoleCodes;
    }
    return true;
  }
}
