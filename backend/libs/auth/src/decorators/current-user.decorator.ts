import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload, RequestWithUser } from '../auth.types';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
