import type { Request } from 'express';

export interface JwtPayload {
  sub: number;
  userName: string;
  /** Populated from the database by AdminGuard for privileged operations. */
  roles?: string[];
}

export interface RequestWithUser extends Request {
  user?: JwtPayload;
}
