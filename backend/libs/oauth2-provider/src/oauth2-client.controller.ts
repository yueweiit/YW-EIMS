import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, CurrentUser } from '@eims/auth';
import { PermissionGuard, RequirePermission } from '@eims/roles';
import { OAuth2ClientService } from './oauth2-client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('oauth2/clients')
@UseGuards(AdminGuard, PermissionGuard)
@RequirePermission('eims:system:oauth2-client')
export class OAuth2ClientController {
  constructor(private readonly clientService: OAuth2ClientService) {}

  @Get()
  async findPage(
    @Query('current') current?: number,
    @Query('size') size?: number,
    @Query('name') name?: string,
  ) {
    return this.clientService.findPage(current || 1, size || 10, name);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.clientService.findOne(id);
  }

  @Post()
  @RequirePermission('eims:system:oauth2-client:create')
  async create(
    @Body() dto: CreateClientDto,
    @CurrentUser('userName') userName: string,
  ) {
    return this.clientService.create(dto, userName);
  }

  @Put(':id')
  @RequirePermission('eims:system:oauth2-client:update')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateClientDto,
    @CurrentUser('userName') userName: string,
  ) {
    return this.clientService.update(id, dto, userName);
  }

  @Delete(':id')
  @RequirePermission('eims:system:oauth2-client:delete')
  async remove(@Param('id') id: number) {
    return this.clientService.remove(id);
  }

  @Post(':id/reset-secret')
  @RequirePermission('eims:system:oauth2-client:reset-secret')
  async resetSecret(
    @Param('id') id: number,
    @CurrentUser('userName') userName: string,
  ) {
    return this.clientService.resetSecret(id, userName);
  }
}
