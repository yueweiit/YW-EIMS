import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '@eims/auth';
import { AuditService } from '@eims/audit/audit.service';
import { ExternalSystemService } from './external-system.service';

@Controller('portal')
export class PortalController {
  constructor(
    private readonly externalSystemService: ExternalSystemService,
    private readonly auditService: AuditService,
  ) {}

  @Get('systems')
  async systems(@CurrentUser('sub') userId: number) {
    return this.externalSystemService.getVisibleSystems(userId);
  }

  @Get('me/permissions')
  async permissions(@CurrentUser('sub') userId: number) {
    return this.externalSystemService.getMyPermissions(userId);
  }

  @Post('systems/:code/launch')
  async launch(
    @Param('code') code: string,
    @CurrentUser('sub') userId: number,
    @Req() request: Request,
  ) {
    try {
      const result = await this.externalSystemService.launch(userId, code);
      await this.auditService.record({
        event: 'portal.system_launch',
        userId,
        systemCode: code,
        request,
      });
      return result;
    } catch (error) {
      await this.auditService.record({
        event: 'portal.system_launch',
        result: 'denied',
        userId,
        systemCode: code,
        request,
        detail: { reason: error instanceof Error ? error.name : 'error' },
      });
      throw error;
    }
  }
}
