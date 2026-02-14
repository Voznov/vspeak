import { type CanActivate, type ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { setUserId } from './cls.helper';
import type { UserId } from '../../../libs/api/entities';
import { ENV } from '../env';

const JWTPayloadSchema = z.object({
  userId: z.string(),
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new HttpException('Authorization header missing', HttpStatus.UNAUTHORIZED);
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new HttpException('Invalid authorization header format', HttpStatus.UNAUTHORIZED);
    }

    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET);
      const payload = JWTPayloadSchema.parse(decoded);

      // Store userId in CLS
      setUserId(payload.userId as UserId);

      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new HttpException('Invalid token payload', HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }
}
