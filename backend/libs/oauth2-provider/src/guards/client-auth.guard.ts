import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@eims/database';
import type { Request } from 'express';

interface RequestWithOAuth2Client extends Request {
  oauth2Client?: { clientId: string; name: string };
}

/**
 * Authenticates OAuth2 clients via client_secret_basic (HTTP Basic Auth)
 * or client_secret_post (POST body).
 */
@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithOAuth2Client>();

    let clientId: string | undefined;
    let clientSecret: string | undefined;

    // Try HTTP Basic Auth first
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Basic ')) {
      const decoded = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
      const colonIndex = decoded.indexOf(':');
      if (colonIndex > 0) {
        clientId = decoded.substring(0, colonIndex);
        clientSecret = decoded.substring(colonIndex + 1);
      }
    }

    // Fall back to POST body
    if (!clientId || !clientSecret) {
      clientId = request.body?.client_id;
      clientSecret = request.body?.client_secret;
    }

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('client_id and client_secret are required');
    }

    const client = await this.prisma.oauth2Client.findUnique({
      where: { clientId },
      select: { clientId: true, clientSecret: true, name: true, status: true },
    });

    if (!client || client.status === '2') {
      throw new UnauthorizedException('Invalid client');
    }

    if (client.clientSecret !== clientSecret) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    request.oauth2Client = { clientId: client.clientId, name: client.name };
    return true;
  }
}
