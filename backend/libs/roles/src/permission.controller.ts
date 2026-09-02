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
import { CreatePermissionDto } from './dto/create-permission.dto';
import { QueryPermissionDto } from './dto/query-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { RoleService } from './role.service';

@Controller('permissions')
@UseGuards(AdminGuard, PermissionGuard)
@RequirePermission('eims:system:permission')
export class PermissionController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  findPage(@Query() query: QueryPermissionDto) {
    return this.roleService.findPermissionPage(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findPermissionOne(id);
  }

  @Post()
  @RequirePermission('eims:system:permission:create')
  create(
    @Body() dto: CreatePermissionDto,
    @CurrentUser('userName') userName: string,
  ) {
    return this.roleService.createPermission(dto, userName);
  }

  @Put(':id')
  @RequirePermission('eims:system:permission:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser('userName') userName: string,
  ) {
    return this.roleService.updatePermission(id, dto, userName);
  }

  @Delete(':id')
  @RequirePermission('eims:system:permission:delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.removePermission(id);
  }
}
