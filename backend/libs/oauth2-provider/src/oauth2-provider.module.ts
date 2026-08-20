import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OAuth2Controller } from './oauth2.controller';
import { OAuth2ClientController } from './oauth2-client.controller';
import { OAuth2BindingController } from './oauth2-binding.controller';
import { OAuth2Service } from './oauth2.service';
import { OAuth2ClientService } from './oauth2-client.service';
import { OAuth2BindingService } from './oauth2-binding.service';
import { OpenIdService } from './openid.service';
import { ClientAuthGuard } from './guards/client-auth.guard';

@Module({
  imports: [ConfigModule],
  controllers: [OAuth2Controller, OAuth2ClientController, OAuth2BindingController],
  providers: [OAuth2Service, OAuth2ClientService, OAuth2BindingService, OpenIdService, ClientAuthGuard],
  exports: [OAuth2Service, OAuth2BindingService, OpenIdService],
})
export class Oauth2ProviderModule {}
