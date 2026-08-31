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
import { MoldMaterialsService } from './mold-materials.service';
import { CreateMoldMaterialDto } from './dto/create-mold-material.dto';
import { UpdateMoldMaterialDto } from './dto/update-mold-material.dto';
import { QueryMoldMaterialDto } from './dto/query-mold-material.dto';

@Controller('mold-product/mold-materials')
@UseGuards(PermissionGuard)
@RequirePermission('eims:mold:mold-material')
export class MoldMaterialsController {
  constructor(private readonly moldMaterialsService: MoldMaterialsService) {}

  @Get('page')
  async findPage(@Query() query: QueryMoldMaterialDto) {
    return this.moldMaterialsService.findPage(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moldMaterialsService.findOne(id);
  }

  @Post()
  @RequirePermission('eims:mold:mold-material:create')
  async create(@Body() dto: CreateMoldMaterialDto) {
    return this.moldMaterialsService.create(dto);
  }

  @Put(':id')
  @RequirePermission('eims:mold:mold-material:update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMoldMaterialDto,
  ) {
    return this.moldMaterialsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('eims:mold:mold-material:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.moldMaterialsService.remove(id);
  }
}
