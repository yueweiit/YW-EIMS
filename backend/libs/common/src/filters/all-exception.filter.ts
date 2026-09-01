import {
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let code = '1000';
    let msg = 'Internal server error';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      msg =
        typeof responseBody === 'string'
          ? responseBody
          : (
              responseBody as { message?: string | string[] }
            ).message?.toString() || 'Request error';

      if (status === HttpStatus.UNAUTHORIZED) {
        code = '9999';
      } else if (status === HttpStatus.FORBIDDEN) {
        code = '8888';
      } else if (status === HttpStatus.BAD_REQUEST) {
        code = '1001';
      }
    } else {
      const error = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(error.message, error.stack);
    }

    if (isOAuthProtocolEndpoint(request.path)) {
      const oauthError = getOAuthError(exception, status, msg);
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Pragma', 'no-cache');
      if (request.path === '/oauth/userinfo' && status === HttpStatus.UNAUTHORIZED) {
        response.setHeader('WWW-Authenticate', `Bearer error="${oauthError.error}"`);
      }
      response.status(status).json({
        error: oauthError.error,
        ...(oauthError.description
          ? { error_description: oauthError.description }
          : {}),
      });
      return;
    }

    response.status(status).json({
      code,
      msg,
      data: null,
    });
  }
}

function isOAuthProtocolEndpoint(path: string | undefined) {
  return (
    path === '/oauth/token' ||
    path === '/oauth/userinfo' ||
    path === '/oauth/revoke'
  );
}

function getOAuthError(exception: unknown, status: number, message: string) {
  if (!(exception instanceof HttpException) || status >= 500) {
    return { error: 'server_error', description: undefined };
  }

  const match = /^([a-z][a-z0-9_]*)(?::\s*(.*))?$/i.exec(message.trim());
  if (match) {
    return {
      error: match[1].toLowerCase(),
      description: match[2]?.trim() || undefined,
    };
  }

  if (status === HttpStatus.UNAUTHORIZED) {
    return { error: 'invalid_token', description: message };
  }
  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return { error: 'temporarily_unavailable', description: message };
  }
  return { error: 'invalid_request', description: message };
}
