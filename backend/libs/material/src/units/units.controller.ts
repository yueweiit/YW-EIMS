import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { QueryUnitDto } from './dto/query-unit.dto';

@Controller('unit')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get('page')
  async findPage(@Query() query: QueryUnitDto) {
    return this.unitsService.findPage(query);
  }

  @Get(':unitCode')
  async findOne(@Param('unitCode') unitCode: string) {
    return this.unitsService.findOne(unitCode);
  }

  @Post()
  async create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Put(':unitCode')
  async update(
    @Param('unitCode') unitCode: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.unitsService.update(unitCode, dto);
  }

  @Delete(':unitCode')
  async remove(@Param('unitCode') unitCode: string) {
    return this.unitsService.remove(unitCode);
  }
}
