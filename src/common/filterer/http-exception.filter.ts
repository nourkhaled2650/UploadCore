import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, message, errors } = this.resolveException(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.url} → ${statusCode}: ${message}`);
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors: errors ?? null,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string;
    errors: { field: string; message: string }[] | null;
  } {
    // known HTTP exceptions thrown deliberately
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        return {
          statusCode: status,
          message: (b.message as string) ?? exception.message,
          errors: (b.errors as { field: string; message: string }[]) ?? null,
        };
      }

      return {
        statusCode: status,
        message: typeof body === 'string' ? body : exception.message,
        errors: null,
      };
    }

    // Prisma known errors — map to HTTP codes
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    // anything else — always 500, never expose internals
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errors: null,
    };
  }

  private resolvePrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    errors: null;
  } {
    switch (exception.code) {
      case 'P2002':
        return { statusCode: 409, message: 'Resource already exists', errors: null };
      case 'P2025':
        return { statusCode: 404, message: 'Resource not found', errors: null };
      case 'P2003':
        return { statusCode: 400, message: 'Invalid reference', errors: null };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          errors: null,
        };
    }
  }
}
