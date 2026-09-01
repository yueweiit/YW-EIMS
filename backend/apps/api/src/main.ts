import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();
  // The application is deployed behind the bundled Nginx reverse proxy. Trust
  // exactly that hop so Express can derive the real protocol/IP without
  // accepting arbitrary client-supplied forwarding headers.
  expressApp.set('trust proxy', 1);
  expressApp.disable('x-powered-by');
  app.use(
    (
      _request: unknown,
      response: {
        setHeader: (name: string, value: string) => void;
      },
      next: () => void,
    ) => {
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('X-Frame-Options', 'DENY');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=()',
      );
      next();
    },
  );
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:9527')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  assertProductionSecurity(allowedOrigins);
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

function assertProductionSecurity(allowedOrigins: string[]) {
  if (process.env.NODE_ENV !== 'production') return;

  if (process.env.AUTH_COOKIE_SECURE !== 'true') {
    throw new Error(
      '[security] AUTH_COOKIE_SECURE=true is required when NODE_ENV=production',
    );
  }

  const urls = [
    process.env.EIMS_FRONTEND_URL || 'http://localhost:9527',
    process.env.OAUTH2_ISSUER || 'http://localhost:3006',
    process.env.DINGTALK_OAUTH_REDIRECT_URI,
    ...allowedOrigins,
    process.env.EXTERNAL_BUDGET_URL,
    process.env.EXTERNAL_ERP_URL,
    process.env.EXTERNAL_MES_URL,
    process.env.EXTERNAL_CRM_URL,
    process.env.EXTERNAL_LEMOS_URL,
    process.env.EXTERNAL_BUDGET_SSO_START_URL,
    process.env.EXTERNAL_ERP_SSO_START_URL,
    process.env.EXTERNAL_MES_SSO_START_URL,
    process.env.EXTERNAL_CRM_SSO_START_URL,
    process.env.EXTERNAL_LEMOS_SSO_START_URL,
  ].filter((url): url is string => Boolean(url?.trim()));

  const insecure = urls.filter((url) => !isHttpsUrl(url));
  if (insecure.length > 0) {
    throw new Error(
      `[security] Production URLs must use HTTPS: ${insecure.join(', ')}`,
    );
  }
}

function isHttpsUrl(value: string) {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}
