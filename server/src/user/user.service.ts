import { Injectable } from '@nestjs/common';
import { UserRepo } from './user.repo';
import type { User, UserId, UserRole } from '../../../libs/api/entities';
import { S3Bucket } from '../s3/s3.constants';
import { S3Service } from '../s3/s3.service';

// Presigned avatar URLs are valid for 24 hours
const AVATAR_URL_TTL = 86400;

@Injectable()
export class UserService {
  constructor(
    private readonly repo: UserRepo,
    private readonly s3: S3Service,
  ) {}

  async createUser(nickname: string, role: UserRole): Promise<User> {
    return this.repo.createUser(nickname, role);
  }

  async getUser(userId: UserId): Promise<User | undefined> {
    const user = await this.repo.getUserById(userId);
    if (!user) return undefined;

    return this.appendAvatarUrl(user);
  }

  async getUserByNickname(nickname: string): Promise<User | undefined> {
    return this.repo.getUserByNickname(nickname);
  }

  async appendAvatarUrl<T extends User>(user: T): Promise<T> {
    const avatarUrl = await this.s3.getPresignedDownloadUrl({ bucket: S3Bucket.Avatars, key: user.id }, AVATAR_URL_TTL);

    return { ...user, avatarUrl };
  }

  async getAvatarUploadUrl(userId: UserId): Promise<string> {
    return this.s3.getPresignedUploadUrl({ bucket: S3Bucket.Avatars, key: userId }, 'image/png', 900);
  }
}
