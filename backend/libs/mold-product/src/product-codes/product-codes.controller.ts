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
import { ProductCodesService } from './product-codes.service';
import { CreateProductCodeDto } from './dto/create-product-code.dto';
import { UpdateProductCodeDto } from './dto/update-product-code.dto';
import { QueryProductCodeDto } from './dto/query-product-code.dto';

@Controller('mold-product/product-codes')
export class ProductCodesController {
  constructor(private readonly productCodesService: ProductCodesService) {}

  @Get('page')
  async findPage(@Query() query: QueryProductCodeDto) {
    return this.productCodesService.findPage(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productCodesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateProductCodeDto) {
    return this.productCodesService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductCodeDto,
  ) {
    return this.productCodesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.productCodesService.remove(id);
  }
}
