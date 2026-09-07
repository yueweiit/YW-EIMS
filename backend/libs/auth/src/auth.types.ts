import type { Request } from 'express';

export interface JwtPayload {
  sub: number;
  userName: string;
  /** Changes whenever the user signs in or is signed out everywhere. */
  sessionVersion?: number;
  /** Populated from the database by AdminGuard for privileged operations. */
  roles?: string[];
}

export interface RequestWithUser extends Request {
  user?: JwtPayload;
}
