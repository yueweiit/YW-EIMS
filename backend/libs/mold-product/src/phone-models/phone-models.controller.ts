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
import { PhoneModelsService } from './phone-models.service';
import { CreatePhoneModelDto } from './dto/create-phone-model.dto';
import { UpdatePhoneModelDto } from './dto/update-phone-model.dto';
import { QueryPhoneModelDto } from './dto/query-phone-model.dto';
import { BatchDeletePhoneModelDto } from './dto/batch-delete-phone-model.dto';

@Controller('mold-product/phone-models')
@UseGuards(PermissionGuard)
@RequirePermission('eims:mold:phone-model')
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
  @RequirePermission('eims:mold:phone-model:create')
  async create(@Body() dto: CreatePhoneModelDto) {
    return this.phoneModelsService.create(dto);
  }

  @Put(':id')
  @RequirePermission('eims:mold:phone-model:update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePhoneModelDto,
  ) {
    return this.phoneModelsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('eims:mold:phone-model:delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.phoneModelsService.remove(id);
  }

  @Post('batch-delete')
  @RequirePermission('eims:mold:phone-model:batch-delete')
  async batchRemove(@Body() dto: BatchDeletePhoneModelDto) {
    return this.phoneModelsService.batchRemove(dto);
  }
}
