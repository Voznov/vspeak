import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { User, UserId, UserRole } from '../../../libs/api/entities';
import { ENV } from '../env';
import { AuthRepo } from './auth.repo';

type JWTPayload = {
  userId: UserId;
};

@Injectable()
export class AuthService {
  constructor(private readonly repo: AuthRepo) {}

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

  async createUser(nickname: string, role: UserRole): Promise<User> {
    return this.repo.createUser(nickname, role);
  }

  async getUser(userId: UserId): Promise<User | undefined> {
    return this.repo.getUserById(userId);
  }

  async getUserByNickname(nickname: string): Promise<User | undefined> {
    return this.repo.getUserByNickname(nickname);
  }
}
