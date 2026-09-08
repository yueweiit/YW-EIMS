import { Module } from '@nestjs/common';
import { AuthModule } from '@eims/auth';
import { RoleModule } from '@eims/roles';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [AuthModule, RoleModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
