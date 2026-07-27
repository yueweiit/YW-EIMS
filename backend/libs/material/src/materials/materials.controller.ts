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
} from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';
import { ImportMaterialDto } from './dto/import-material.dto';
import type { ImportExistingMaterialRow } from './materials.service';

@Controller('material')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get('page')
  async findPage(@Query() query: QueryMaterialDto) {
    return this.materialsService.findPage(query);
  }

  /** 按物料编码查詢（本地优先 → ERP 兜底） */
  @Get('lookup/:code')
  async lookup(@Param('code') code: string) {
    return this.materialsService.lookupByCode(code);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.materialsService.findOne(id);
  }

  @Post('import')
  async import(@Body() dto: ImportMaterialDto) {
    return this.materialsService.batchCreate(dto.rows);
  }

  /** 从 ERP 同步全部物料到本地 */
  @Post('sync-from-erp')
  async syncFromErp() {
    return this.materialsService.syncFromErp();
  }

  /** 导入已有编码的物料（不生成新编码，已存在跳过） */
  @Post('import-existing')
  async importExisting(@Body() rows: ImportExistingMaterialRow[]) {
    return this.materialsService.importExisting(rows);
  }

  @Post()
  async create(@Body() dto: CreateMaterialDto) {
    return this.materialsService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.materialsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.materialsService.remove(id);
  }
}
