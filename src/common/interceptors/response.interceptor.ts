import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode: HttpStatus = response.statusCode;

    const request = context.switchToHttp().getRequest<Request>();

    const defaultMessage: Record<string, string | null> = {
      GET: null,
      POST: 'Created successfully',
      PUT: 'Updated successfully',
      PATCH: 'Updated successfully',
      DELETE: 'Deleted successfully',
    };

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ??
      defaultMessage[request.method] ??
      null;

    return next.handle().pipe(
      map((data: unknown) => {
        if (statusCode === HttpStatus.NO_CONTENT) {
          return data;
        }

        return {
          success: true,
          message: message ?? null,
          data,
        };
      }),
    );
  }
}
