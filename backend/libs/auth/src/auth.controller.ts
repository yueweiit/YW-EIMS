import { Controller, Post, Get, Body } from '@nestjs/common';
import { Public } from '@eims/common';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('getUserInfo')
  async getUserInfo(@CurrentUser('sub') userId: number) {
    return this.authService.getUserInfo(userId);
  }

  @Public()
  @Post('refreshToken')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }
}
