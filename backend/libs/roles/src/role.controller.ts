import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, CurrentUser } from '@eims/auth';
import { RequirePermission } from './decorators/require-permission.decorator';
import { PermissionGuard } from './guards/permission.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { UpdateRoleAccessDto } from './dto/update-role-access.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleService } from './role.service';

@Controller('roles')
@UseGuards(AdminGuard, PermissionGuard)
@RequirePermission('eims:system:role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  findPage(@Query() query: QueryRoleDto) {
    return this.roleService.findPage(query);
  }

  @Get('options')
  findOptions() {
    return this.roleService.findOptions();
  }

  @Get('catalog')
  getAccessCatalog() {
    return this.roleService.getAccessCatalog();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }

  @Post()
  @RequirePermission('eims:system:role:create')
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser('userName') userName: string,
  ) {
    return this.roleService.create(dto, userName);
  }

  @Put(':id')
  @RequirePermission('eims:system:role:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('userName') userName: string,
    @CurrentUser('roles') roles?: string[],
  ) {
    return this.roleService.update(id, dto, userName, roles || []);
  }

  @Put(':id/access')
  @RequirePermission('eims:system:role:access')
  updateAccess(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleAccessDto,
    @CurrentUser('roles') roles?: string[],
  ) {
    return this.roleService.updateAccess(id, dto, roles || []);
  }

  @Delete(':id')
  @RequirePermission('eims:system:role:delete')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('roles') roles?: string[],
  ) {
    return this.roleService.remove(id, roles || []);
  }
}
