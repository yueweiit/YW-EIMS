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
import { ColorsService } from './colors.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { QueryColorDto } from './dto/query-color.dto';

@Controller('mold-product/colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Get('page')
  async findPage(@Query() query: QueryColorDto) {
    return this.colorsService.findPage(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.colorsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateColorDto) {
    return this.colorsService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateColorDto,
  ) {
    return this.colorsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.colorsService.remove(id);
  }
}
