import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, CurrentUser } from '@eims/auth';
import { PermissionGuard, RequirePermission } from '@eims/roles';
import { ExternalSystemService } from './external-system.service';
import { CreateExternalSystemDto } from './dto/create-external-system.dto';
import { UpdateExternalSystemDto } from './dto/update-external-system.dto';

@Controller('portal/admin/systems')
@UseGuards(AdminGuard, PermissionGuard)
@RequirePermission('eims:system:external-system')
export class PortalAdminController {
  constructor(private readonly externalSystemService: ExternalSystemService) {}

  @Get()
  async findPage(
    @Query('current') current?: number,
    @Query('size') size?: number,
    @Query('name') name?: string,
    @Query('status') status?: string,
  ) {
    return this.externalSystemService.findPage(
      current || 1,
      size || 10,
      name,
      status,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.externalSystemService.findOne(id);
  }

  @Post()
  @RequirePermission('eims:system:external-system:create')
  async create(
    @Body() dto: CreateExternalSystemDto,
    @CurrentUser('userName') userName: string,
  ) {
    return this.externalSystemService.create(dto, userName);
  }

  @Put(':id')
  @RequirePermission('eims:system:external-system:update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExternalSystemDto,
    @CurrentUser('userName') userName: string,
  ) {
    return this.externalSystemService.update(id, dto, userName);
  }

  @Delete(':id')
  @RequirePermission('eims:system:external-system:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.externalSystemService.remove(id);
  }
}
