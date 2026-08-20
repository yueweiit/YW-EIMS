import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { OAuth2BindingService } from './oauth2-binding.service';
import { CreateBindingDto } from './dto/create-binding.dto';

@Controller('oauth2/bindings')
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
  async create(@Body() dto: CreateBindingDto) {
    return this.bindingService.create(dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.bindingService.remove(id);
  }
}
