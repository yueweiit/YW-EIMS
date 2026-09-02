import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { SecurityCleanupService } from './security-cleanup.service';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor, SecurityCleanupService],
  exports: [AuditService],
})
export class AuditModule {}
