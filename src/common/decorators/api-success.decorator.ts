import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiSuccessResponse = <T>(type: Type<T>) =>
  applyDecorators(
    ApiExtraModels(type),
    ApiResponse({
      status: 200,
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', nullable: true },
          data: { $ref: getSchemaPath(type) },
        },
      },
    }),
  );
