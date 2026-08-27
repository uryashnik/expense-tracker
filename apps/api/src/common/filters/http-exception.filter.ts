import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ApiError } from '@expense-tracker/shared';
import type { Request, Response } from 'express';

/**
 * Приводит любую ошибку к единому формату ApiError, который знает фронтенд.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ApiError = {
      statusCode: status,
      message: this.resolveMessage(exception),
      errors: this.resolveValidationErrors(exception),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(body.message, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json(body);
  }

  private resolveMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        return payload;
      }
      const message = (payload as { message?: string | string[] }).message;
      if (typeof message === 'string') {
        return message;
      }
      return exception.message;
    }
    return 'Внутренняя ошибка сервера';
  }

  /** ValidationPipe кладёт список ошибок в поле message в виде массива строк. */
  private resolveValidationErrors(exception: unknown): string[] | undefined {
    if (!(exception instanceof HttpException)) {
      return undefined;
    }
    const payload = exception.getResponse();
    if (typeof payload === 'object' && payload !== null) {
      const message = (payload as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        return message;
      }
    }
    return undefined;
  }
}
