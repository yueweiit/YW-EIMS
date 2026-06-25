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
import { MoldsService } from './molds.service';
import { CreateMoldDto } from './dto/create-mold.dto';
import { UpdateMoldDto } from './dto/update-mold.dto';
import { QueryMoldDto } from './dto/query-mold.dto';

@Controller('mold-product/molds')
export class MoldsController {
  constructor(private readonly moldsService: MoldsService) {}

  @Get('page')
  async findPage(@Query() query: QueryMoldDto) {
    return this.moldsService.findPage(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moldsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateMoldDto) {
    return this.moldsService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMoldDto,
  ) {
    return this.moldsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.moldsService.remove(id);
  }
}
