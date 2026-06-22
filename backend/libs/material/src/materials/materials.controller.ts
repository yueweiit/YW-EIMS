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

@Controller('material')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get('page')
  async findPage(@Query() query: QueryMaterialDto) {
    return this.materialsService.findPage(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.materialsService.findOne(id);
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
