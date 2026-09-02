import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { ConfigModule } from '@eims/config';
import { PrismaModule } from '@eims/database';
import { AuthModule, CsrfGuard, JwtAuthGuard, RateLimitGuard } from '@eims/auth';
import { UserModule } from '@eims/user';
import { MaterialModule } from '@eims/material';
import { MoldProductModule } from '@eims/mold-product';
import { OaModule } from '@eims/oa';
import { Oauth2ProviderModule } from '@eims/oauth2-provider';
import { PortalModule } from '@eims/portal';
import { RoleModule } from '@eims/roles';
import { AuditInterceptor, AuditModule } from '@eims/audit';
import { TransformInterceptor, AllExceptionFilter } from '@eims/common';

@Module({
  imports: [ConfigModule, PrismaModule, ScheduleModule.forRoot(), AuditModule, AuthModule, RoleModule, UserModule, MaterialModule, MoldProductModule, OaModule, Oauth2ProviderModule, PortalModule],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
  ],
})
export class AppModule {}
