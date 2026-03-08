import { HttpException, HttpStatus, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { UserEntity } from './user.entity';
import { UserRepo } from './user.repo';
import type { User, UserId, UserRole } from '../../../libs/api/entities';
import { S3Bucket } from '../s3/s3.constants';
import { S3Service } from '../s3/s3.service';
import { WsGateway } from '../ws/ws.gateway';

const AVATAR_URL_TTL = 86400;

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly repo: UserRepo,
    private readonly s3: S3Service,
    private readonly ws: WsGateway,
  ) {}

  onModuleInit(): void {
    this.s3.onEvent(S3Bucket.Avatars, async (event) => {
      const userId = event.key as UserId;
      const user = await this.getUser(userId);
      if (!user) return;

      this.ws.emitToAll('userUpdated', { user });
      this.logger.log(`Avatar uploaded for user ${userId}`);
    });
  }

  async createUser(nickname: string, role: UserRole): Promise<UserEntity> {
    return this.repo.createUser(nickname, role);
  }

  async getUser(userId: UserId): Promise<UserEntity | undefined> {
    const user = await this.repo.getUserById(userId);
    if (!user) return undefined;

    return this.appendAvatarUrl(user);
  }

  async getUserByNickname(nickname: string): Promise<User | undefined> {
    return this.repo.getUserByNickname(nickname);
  }

  async updateUser(userId: UserId, fields: { nickname?: string; bgColor?: string }): Promise<UserEntity> {
    if (fields.nickname !== undefined) {
      const existing = await this.repo.getUserByNickname(fields.nickname);
      if (existing && existing.id !== userId) {
        throw new HttpException('Nickname already taken', HttpStatus.CONFLICT);
      }
    }

    const updated = await this.repo.updateUser(userId, fields);
    const user = await this.appendAvatarUrl(updated);
    this.ws.emitToAll('userUpdated', { user });

    return user;
  }

  async appendAvatarUrl<T extends User>(user: T): Promise<T & { avatarUrl?: string }> {
    const avatarUrl = await this.s3.getPresignedDownloadUrl({ bucket: S3Bucket.Avatars, key: user.id }, AVATAR_URL_TTL);

    return { ...user, avatarUrl };
  }

  async getAvatarUploadUrl(userId: UserId): Promise<string> {
    return this.s3.getPresignedUploadUrl({ bucket: S3Bucket.Avatars, key: userId }, 'image/png', 900);
  }
}
