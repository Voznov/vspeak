import { Injectable } from '@nestjs/common';
import { PALETTE } from './palette';
import { UserEntity } from './user.entity';
import type { UserId, UserRole } from '../../../libs/api/entities';
import { PostgresService } from '../postgres/postgres.service';
import { toInstance } from '../utils/to-instance';

export { PALETTE };

@Injectable()
export class UserRepo {
  constructor(private readonly pg: PostgresService) {}

  async createUser(nickname: string, role: UserRole): Promise<UserEntity> {
    const bgColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const { rows } = await this.pg.query('INSERT INTO users (nickname, role, bg_color) VALUES ($1, $2, $3) RETURNING *', [nickname, role, bgColor]);

    return toInstance(UserEntity, rows[0]);
  }

  async getUserById(userId: UserId): Promise<UserEntity | undefined> {
    const { rows } = await this.pg.query('SELECT * FROM users WHERE id = $1', [userId]);

    return rows[0] ? toInstance(UserEntity, rows[0]) : undefined;
  }

  async getUserByNickname(nickname: string): Promise<UserEntity | undefined> {
    const { rows } = await this.pg.query('SELECT * FROM users WHERE nickname = $1', [nickname]);

    return rows[0] ? toInstance(UserEntity, rows[0]) : undefined;
  }

  async updateUser(userId: UserId, fields: { nickname?: string; bgColor?: string }): Promise<UserEntity> {
    const setClauses: string[] = [];
    const values: unknown[] = [userId];
    let idx = 2;

    if (fields.nickname !== undefined) {
      setClauses.push(`nickname = $${idx++}`);
      values.push(fields.nickname);
    }
    if (fields.bgColor !== undefined) {
      setClauses.push(`bg_color = $${idx++}`);
      values.push(fields.bgColor);
    }

    const { rows } = await this.pg.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`, values);

    return toInstance(UserEntity, rows[0]);
  }
}
