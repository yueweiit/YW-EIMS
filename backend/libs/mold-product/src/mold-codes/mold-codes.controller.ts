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
import { MoldCodesService } from './mold-codes.service';
import { CreateMoldCodeDto } from './dto/create-mold-code.dto';
import { UpdateMoldCodeDto } from './dto/update-mold-code.dto';
import { QueryMoldCodeDto } from './dto/query-mold-code.dto';

@Controller('mold-product/mold-codes')
@UseGuards(PermissionGuard)
@RequirePermission('eims:mold:mold-code')
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
  @RequirePermission('eims:mold:mold-code:create')
  async create(@Body() dto: CreateMoldCodeDto) {
    return this.moldCodesService.create(dto);
  }

  @Put(':id')
  @RequirePermission('eims:mold:mold-code:update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMoldCodeDto,
  ) {
    return this.moldCodesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('eims:mold:mold-code:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.moldCodesService.remove(id);
  }
}
