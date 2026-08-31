import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();
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
  if (process.env.NODE_ENV === 'production') {
    const insecureUrls = [
      process.env.EIMS_FRONTEND_URL || 'http://localhost:9527',
      process.env.OAUTH2_ISSUER || 'http://localhost:3006',
      ...allowedOrigins,
    ].filter((url) => url && !url.startsWith('https://'));
    if (insecureUrls.length > 0) {
      console.warn(
        '[security] Production EIMS and OAuth URLs should use HTTPS; configure TLS before exposing this service publicly',
      );
    }
  }
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
