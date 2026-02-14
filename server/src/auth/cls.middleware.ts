import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { cls } from './cls.helper';

@Injectable()
export class ClsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    cls.run({} as any, () => {
      next();
    });
  }
}
