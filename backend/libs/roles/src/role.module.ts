import { Global, Module } from '@nestjs/common';
import { AuthModule } from '@eims/auth';
import { PermissionController } from './permission.controller';
import { RoleController } from './role.controller';
import { PermissionGuard } from './guards/permission.guard';
import { RoleService } from './role.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [RoleController, PermissionController],
  providers: [RoleService, PermissionGuard],
  exports: [RoleService, PermissionGuard],
})
export class RoleModule {}
