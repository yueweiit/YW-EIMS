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
import { ErpNextMappingService } from './erpnext-mapping.service';
import { CreateErpNextMappingDto } from './dto/create-erp-next-mapping.dto';
import { UpdateErpNextMappingDto } from './dto/update-erp-next-mapping.dto';
import { QueryErpNextMappingDto } from './dto/query-erp-next-mapping.dto';

@Controller('erpnext-mapping')
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
  async create(@Body() dto: CreateErpNextMappingDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateErpNextMappingDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
