import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, CurrentUser } from '@eims/auth';
import { PermissionGuard, RequirePermission } from '@eims/roles';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Controller('user')
@UseGuards(AdminGuard, PermissionGuard)
@RequirePermission('eims:system:user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('page')
  async findPage(@Query() query: QueryUserDto) {
    return this.userService.findPage(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(Number(id));
  }

  @Post()
  @RequirePermission('eims:system:user:create')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('userName') userName: string,
    @CurrentUser('roles') userRoles?: string[],
  ) {
    return this.userService.create(dto, userName, userRoles || []);
  }

  @Put(':id')
  @RequirePermission('eims:system:user:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('userName') userName: string,
    @CurrentUser('roles') userRoles?: string[],
  ) {
    return this.userService.update(Number(id), dto, userName, userRoles || []);
  }

  @Delete(':id')
  @RequirePermission('eims:system:user:delete')
  async remove(
    @Param('id') id: string,
    @CurrentUser('roles') userRoles?: string[],
  ) {
    return this.userService.remove(Number(id), userRoles || []);
  }
}
