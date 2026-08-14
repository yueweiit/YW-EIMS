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
import { CurrentUser } from '@eims/auth';
import { OAuth2ClientService } from './oauth2-client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('oauth2/clients')
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
  async create(
    @Body() dto: CreateClientDto,
    @CurrentUser('userName') userName: string,
  ) {
    return this.clientService.create(dto, userName);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateClientDto,
    @CurrentUser('userName') userName: string,
  ) {
    return this.clientService.update(id, dto, userName);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.clientService.remove(id);
  }

  @Post(':id/reset-secret')
  async resetSecret(@Param('id') id: number) {
    return this.clientService.resetSecret(id);
  }
}
