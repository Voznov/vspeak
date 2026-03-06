import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { UserId } from '../../../libs/api/entities';
import { ENV } from '../env';

type JWTPayload = {
  userId: UserId;
};

@Injectable()
export class AuthService {
  generateToken(userId: UserId): string {
    const payload: JWTPayload = { userId };

    return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '30d' });
  }

  verifyToken(token: string): UserId {
    try {
      const payload = jwt.verify(token, ENV.JWT_SECRET) as JWTPayload;

      return payload.userId;
    } catch {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }
}
