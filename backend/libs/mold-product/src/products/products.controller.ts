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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ImportProductDto } from './dto/import-product.dto';

@Controller('mold-product/products')
@UseGuards(PermissionGuard)
@RequirePermission('eims:mold:product')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('page')
  async findPage(@Query() query: QueryProductDto) {
    return this.productsService.findPage(query);
  }

  @Post('import')
  @RequirePermission('eims:mold:product:import')
  async import(@Body() dto: ImportProductDto) {
    return this.productsService.batchCreate(dto.rows);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  @RequirePermission('eims:mold:product:create')
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @RequirePermission('eims:mold:product:update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('eims:mold:product:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
