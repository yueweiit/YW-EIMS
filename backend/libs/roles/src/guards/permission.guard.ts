import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestWithUser } from '@eims/auth';
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { RoleService } from '../role.service';

/** Server-side guard for menu/function/API permissions. */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.sub;
    if (typeof userId !== 'number' || !Number.isInteger(userId) || userId < 1) {
      throw new UnauthorizedException('token expired or missing');
    }
    if (!(await this.roleService.userHasPermission(userId, requiredPermission))) {
      throw new ForbiddenException('当前用户没有此功能权限');
    }
    return true;
  }
}
