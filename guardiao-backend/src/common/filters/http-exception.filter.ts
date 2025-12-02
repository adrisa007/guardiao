// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch() // Captura TODAS as exceções (HttpException + erros inesperados)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determina o status e mensagem
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Padroniza a resposta de erro (formato usado em todos os projetos Guardião)
    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'string'
          ? message
          : (message as any)?.message || 'Erro inesperado',
      error:
        typeof message === 'object' && (message as any)?.error
          ? (message as any).error
          : exception instanceof Error
            ? exception.name
            : undefined,
      validationErrors:
        typeof message === 'object' && (message as any)?.message instanceof Array
          ? (message as any).message
          : undefined,
    };

    // Log detalhado apenas em caso de erro 500 ou superior
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `HTTP ${status} - ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : '',
      );
    } else {
      this.logger.warn(
        `HTTP ${status} - ${request.method} ${request.url} - ${JSON.stringify(errorResponse.message)}`,
      );
    }

    // Resposta final padronizada
    response.status(status).json(errorResponse);
  }
}