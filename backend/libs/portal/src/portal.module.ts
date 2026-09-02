import { Module } from '@nestjs/common';
import { RoleModule } from '@eims/roles';
import { AuthModule } from '@eims/auth';
import { PortalController } from './portal.controller';
import { PortalAdminController } from './portal-admin.controller';
import { ExternalSystemService } from './external-system.service';

@Module({
  imports: [AuthModule, RoleModule],
  controllers: [PortalController, PortalAdminController],
  providers: [ExternalSystemService],
  exports: [ExternalSystemService],
})
export class PortalModule {}
