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
import { MoldCodesService } from './mold-codes.service';
import { CreateMoldCodeDto } from './dto/create-mold-code.dto';
import { UpdateMoldCodeDto } from './dto/update-mold-code.dto';
import { QueryMoldCodeDto } from './dto/query-mold-code.dto';

@Controller('mold-product/mold-codes')
export class MoldCodesController {
  constructor(private readonly moldCodesService: MoldCodesService) {}

  @Get('page')
  async findPage(@Query() query: QueryMoldCodeDto) {
    return this.moldCodesService.findPage(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moldCodesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateMoldCodeDto) {
    return this.moldCodesService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMoldCodeDto,
  ) {
    return this.moldCodesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.moldCodesService.remove(id);
  }
}
