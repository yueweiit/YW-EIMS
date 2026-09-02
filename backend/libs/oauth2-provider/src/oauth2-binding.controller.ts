import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Put,
} from '@nestjs/common';
import { AdminGuard } from '@eims/auth';
import { PermissionGuard, RequirePermission } from '@eims/roles';
import { OAuth2BindingService } from './oauth2-binding.service';
import { CreateBindingDto } from './dto/create-binding.dto';
import { UpdateBindingDto } from './dto/update-binding.dto';

@Controller('oauth2/bindings')
@UseGuards(AdminGuard, PermissionGuard)
@RequirePermission('eims:system:oauth2-binding')
export class OAuth2BindingController {
  constructor(private readonly bindingService: OAuth2BindingService) {}

  @Get()
  async findPage(
    @Query('current') current?: number,
    @Query('size') size?: number,
    @Query('ssoUserId') ssoUserId?: number,
    @Query('clientId') clientId?: string,
  ) {
    return this.bindingService.findPage(
      current || 1,
      size || 10,
      ssoUserId,
      clientId,
    );
  }

  @Post()
  @RequirePermission('eims:system:oauth2-binding:create')
  async create(@Body() dto: CreateBindingDto) {
    return this.bindingService.create(dto);
  }

  @Delete(':id')
  @RequirePermission('eims:system:oauth2-binding:delete')
  async remove(@Param('id') id: number) {
    return this.bindingService.remove(id);
  }

  @Put(':id')
  @RequirePermission('eims:system:oauth2-binding:update')
  async update(@Param('id') id: number, @Body() dto: UpdateBindingDto) {
    return this.bindingService.update(id, dto);
  }
}
