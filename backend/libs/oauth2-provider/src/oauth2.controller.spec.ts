import { HttpStatus, type INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '@eims/audit/audit.service';
import { AuthService } from '@eims/auth';
import { TransformInterceptor } from '@eims/common';
import { OAuth2Controller } from './oauth2.controller';
import { OAuth2Service } from './oauth2.service';
import { OpenIdService } from './openid.service';

describe('OAuth2Controller token endpoint', () => {
  let app: INestApplication<App>;
  const oauth2Service = {
    exchangeCode: jest.fn(),
    refreshAccessToken: jest.fn(),
  };
  const auditService = { record: jest.fn() };
  const tokenResponse = {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'test-refresh-token',
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OAuth2Controller],
      providers: [
        { provide: OAuth2Service, useValue: oauth2Service },
        { provide: OpenIdService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: AuditService, useValue: auditService },
        { provide: ConfigService, useValue: {} },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    oauth2Service.exchangeCode.mockResolvedValue(tokenResponse);
    oauth2Service.refreshAccessToken.mockResolvedValue(tokenResponse);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 and an unwrapped token response for authorization_code', async () => {
    const response = await request(app.getHttpServer())
      .post('/oauth/token')
      .send({
        grant_type: 'authorization_code',
        code: 'test-code',
        redirect_uri: 'https://client.example.test/callback',
        client_id: 'test-client',
        client_secret: 'test-secret',
      })
      .expect(HttpStatus.OK);

    expect(response.body).toEqual(tokenResponse);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers.pragma).toBe('no-cache');
  });

  it('returns 200 for refresh_token', async () => {
    const response = await request(app.getHttpServer())
      .post('/oauth/token')
      .send({
        grant_type: 'refresh_token',
        refresh_token: 'test-refresh-token',
        client_id: 'test-client',
        client_secret: 'test-secret',
      })
      .expect(HttpStatus.OK);

    expect(response.body).toEqual(tokenResponse);
  });

  it('preserves error status codes', async () => {
    await request(app.getHttpServer())
      .post('/oauth/token')
      .send({ grant_type: 'authorization_code' })
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
