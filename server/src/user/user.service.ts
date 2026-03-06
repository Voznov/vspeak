import { Injectable } from '@nestjs/common';
import { UserRepo } from './user.repo';
import type { User, UserId, UserRole } from '../../../libs/api/entities';

@Injectable()
export class UserService {
  constructor(private readonly repo: UserRepo) {}

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
