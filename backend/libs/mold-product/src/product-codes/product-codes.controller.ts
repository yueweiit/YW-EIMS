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
import { ProductCodesService } from './product-codes.service';
import { CreateProductCodeDto } from './dto/create-product-code.dto';
import { UpdateProductCodeDto } from './dto/update-product-code.dto';
import { QueryProductCodeDto } from './dto/query-product-code.dto';

@Controller('mold-product/product-codes')
@UseGuards(PermissionGuard)
@RequirePermission('eims:mold:product-code')
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
  @RequirePermission('eims:mold:product-code:create')
  async create(@Body() dto: CreateProductCodeDto) {
    return this.productCodesService.create(dto);
  }

  @Put(':id')
  @RequirePermission('eims:mold:product-code:update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductCodeDto,
  ) {
    return this.productCodesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('eims:mold:product-code:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.productCodesService.remove(id);
  }
}
