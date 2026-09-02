import { Module } from '@nestjs/common';
import { RoleModule } from '@eims/roles';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [RoleModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
