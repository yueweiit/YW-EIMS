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
import { PhoneModelsService } from './phone-models.service';
import { CreatePhoneModelDto } from './dto/create-phone-model.dto';
import { UpdatePhoneModelDto } from './dto/update-phone-model.dto';
import { QueryPhoneModelDto } from './dto/query-phone-model.dto';

@Controller('mold-product/phone-models')
export class PhoneModelsController {
  constructor(private readonly phoneModelsService: PhoneModelsService) {}

  @Get('page')
  async findPage(@Query() query: QueryPhoneModelDto) {
    return this.phoneModelsService.findPage(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.phoneModelsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreatePhoneModelDto) {
    return this.phoneModelsService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePhoneModelDto,
  ) {
    return this.phoneModelsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.phoneModelsService.remove(id);
  }
}
