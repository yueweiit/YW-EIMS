import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@eims/database';

@Injectable()
export class SecurityCleanupService {
  private readonly logger = new Logger(SecurityCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 */10 * * * *')
  async cleanup() {
    const now = new Date();
    const old = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oldAudit = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const oldRevoked = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const results = await Promise.all([
      this.prisma.oauth2AuthorizationRequest.deleteMany({
        where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { lt: old } }] },
      }),
      this.prisma.oauth2AuthorizationCode.deleteMany({
        where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { lt: old } }] },
      }),
      this.prisma.oauth2RefreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { revokedAt: { lt: oldRevoked } },
          ],
        },
      }),
      this.prisma.oauth2AccessToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { revokedAt: { lt: oldRevoked } },
          ],
        },
      }),
      this.prisma.authRefreshSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { revokedAt: { lt: oldRevoked } },
          ],
        },
      }),
      this.prisma.authLoginTicket.deleteMany({
        where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { lt: old } }] },
      }),
      this.prisma.dingTalkOAuthState.deleteMany({
        where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { lt: old } }] },
      }),
      this.prisma.securityAuditLog.deleteMany({
        where: { createdAt: { lt: oldAudit } },
      }),
      this.prisma.securityRateLimitBucket.deleteMany({
        where: { resetAt: { lt: now } },
      }),
    ]);
    const removed = results.reduce((sum, result) => sum + result.count, 0);
    if (removed > 0) this.logger.log(`Cleaned ${removed} expired security records`);
  }
}
