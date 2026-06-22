import type { Request } from 'express';

export interface JwtPayload {
  sub: number;
  userName: string;
}

export interface RequestWithUser extends Request {
  user?: JwtPayload;
}
