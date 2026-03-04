import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger, ExceptionFilter as NestExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';

const zHttpExceptionResponse = z.union([
  z.object({ message: z.union([z.array(z.string()).min(1), z.string().transform((msg) => [msg])]) }).transform((res) => res.message),
  z.string().transform((msg) => [msg]),
]);

@Catch()
export class ExceptionFilter implements NestExceptionFilter {
  private readonly logger = new Logger(ExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const errors = zHttpExceptionResponse.safeParse(error.getResponse()).data ?? [error.message];

      response.status(status).send({ errors });

      return;
    }

    this.logger.error(error, 'Unhandled error');
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ errors: ['Internal server error'] });
  }
}
