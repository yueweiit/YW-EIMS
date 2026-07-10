import {
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

@Catch()
export class AllExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
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

    response.status(status).json({
      code,
      msg,
      data: null,
    });
  }
}
