import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || exception.message;
        errorType = (res as any).error || exception.name;
      } else {
        message = res as string;
      }
    } else if (exception?.code) {
      // PostgreSQL specific error handling
      switch (exception.code) {
        case '23505': // Unique violation
          status = HttpStatus.CONFLICT;
          errorType = 'ConflictError';
          message = exception.detail || 'El registro ya existe en el sistema';
          break;
        case '23503': // Foreign key violation
          status = HttpStatus.BAD_REQUEST;
          errorType = 'ForeignKeyViolation';
          message = 'Referencia no válida a otra entidad del sistema';
          break;
        case '23502': // Not null violation
          status = HttpStatus.BAD_REQUEST;
          errorType = 'NotNullViolation';
          message = `El campo ${exception.column || 'requerido'} no puede ser nulo`;
          break;
        case '23514': // Check violation
          status = HttpStatus.BAD_REQUEST;
          errorType = 'CheckConstraintViolation';
          message = 'Los datos no cumplen con las reglas de validación de la base de datos';
          break;
        default:
          this.logger.error(`PostgreSQL Error [${exception.code}]: ${exception.message}`, exception.stack);
          message = exception.message || 'Error en la base de datos';
      }
    } else {
      this.logger.error(`Unhandled Exception: ${exception?.message || exception}`, exception?.stack);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorType,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
