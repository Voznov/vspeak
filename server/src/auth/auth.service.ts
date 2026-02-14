import { randomUUID } from 'crypto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { User, UserId } from '../../../libs/api/entities';
import { ENV } from '../env';

type JWTPayload = {
  userId: UserId;
};

@Injectable()
export class AuthService {
  private readonly users = new Map<UserId, User>();

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

  createUser(nickname: string, role: 'user' | 'admin'): User {
    const userId = randomUUID() as UserId;

    const user: User = {
      id: userId,
      nickname,
      role,
    };

    this.users.set(userId, user);

    return user;
  }

  getUser(userId: UserId): User | undefined {
    return this.users.get(userId);
  }

  getUserByNickname(nickname: string): User | undefined {
    return [...this.users.values()].find((user) => user.nickname === nickname);
  }
}
