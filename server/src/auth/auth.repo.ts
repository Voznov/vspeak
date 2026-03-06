import { Injectable } from '@nestjs/common';
import type { UserId, UserRole } from '../../../libs/api/entities';
import { toDto } from '../../libs/validation';
import { PostgresService } from '../postgres/postgres.service';
import { UserEntity } from './auth.entity';

@Injectable()
export class AuthRepo {
  constructor(private readonly pg: PostgresService) {}

  async createUser(nickname: string, role: UserRole): Promise<UserEntity> {
    const { rows } = await this.pg.query(
      'INSERT INTO users (nickname, role) VALUES ($1, $2) RETURNING *',
      [nickname, role],
    );

    return toDto(UserEntity, rows[0]);
  }

  async getUserById(userId: UserId): Promise<UserEntity | undefined> {
    const { rows } = await this.pg.query('SELECT * FROM users WHERE id = $1', [userId]);

    return rows[0] ? toDto(UserEntity, rows[0]) : undefined;
  }

  async getUserByNickname(nickname: string): Promise<UserEntity | undefined> {
    const { rows } = await this.pg.query('SELECT * FROM users WHERE nickname = $1', [nickname]);

    return rows[0] ? toDto(UserEntity, rows[0]) : undefined;
  }
}
