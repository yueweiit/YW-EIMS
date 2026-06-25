import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { ConfigModule } from '@eims/config';
import { PrismaModule } from '@eims/database';
import { AuthModule, JwtAuthGuard } from '@eims/auth';
import { UserModule } from '@eims/user';
import { MaterialModule } from '@eims/material';
import { MoldProductModule } from '@eims/mold-product';
import { TransformInterceptor, AllExceptionFilter } from '@eims/common';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, UserModule, MaterialModule, MoldProductModule],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
  ],
})
export class AppModule {}
