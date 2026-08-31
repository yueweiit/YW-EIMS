import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PermissionGuard, RequirePermission } from '@eims/roles';
import { ErpNextMappingService } from './erpnext-mapping.service';
import { CreateErpNextMappingDto } from './dto/create-erp-next-mapping.dto';
import { UpdateErpNextMappingDto } from './dto/update-erp-next-mapping.dto';
import { QueryErpNextMappingDto } from './dto/query-erp-next-mapping.dto';

@Controller('erpnext-mapping')
@UseGuards(PermissionGuard)
@RequirePermission('eims:mold:erpnext-mapping')
export class ErpNextMappingController {
  constructor(private readonly service: ErpNextMappingService) {}

  @Get('page')
  async findPage(@Query() query: QueryErpNextMappingDto) {
    return this.service.findPage(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission('eims:mold:erpnext-mapping:create')
  async create(@Body() dto: CreateErpNextMappingDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermission('eims:mold:erpnext-mapping:update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateErpNextMappingDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('eims:mold:erpnext-mapping:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
