import { Injectable } from '@nestjs/common';
import { ChannelEntity } from './channels.entity';
import type { ChannelId } from '../../../libs/api/entities';
import { PostgresService } from '../postgres/postgres.service';
import { toInstance } from '../utils/to-instance';

@Injectable()
export class ChannelsRepo {
  constructor(private readonly pg: PostgresService) {}

  async createChannel(name: string): Promise<ChannelEntity> {
    const { rows } = await this.pg.query('INSERT INTO channels (name) VALUES ($1) RETURNING *', [name]);

    return toInstance(ChannelEntity, rows[0]);
  }

  async deleteChannel(channelId: ChannelId): Promise<void> {
    await this.pg.query('DELETE FROM channels WHERE id = $1', [channelId]);
  }

  async listChannels(): Promise<ChannelEntity[]> {
    const { rows } = await this.pg.query('SELECT * FROM channels ORDER BY created_at');

    return toInstance(ChannelEntity, rows);
  }

  async getChannelById(channelId: ChannelId): Promise<ChannelEntity | undefined> {
    const { rows } = await this.pg.query('SELECT * FROM channels WHERE id = $1', [channelId]);

    return rows[0] ? toInstance(ChannelEntity, rows[0]) : undefined;
  }

  async getChannelByName(name: string): Promise<ChannelEntity | undefined> {
    const { rows } = await this.pg.query('SELECT * FROM channels WHERE name = $1', [name]);

    return rows[0] ? toInstance(ChannelEntity, rows[0]) : undefined;
  }

  async updateChannel(channelId: ChannelId, name: string): Promise<ChannelEntity> {
    const { rows } = await this.pg.query('UPDATE channels SET name = $1 WHERE id = $2 RETURNING *', [name, channelId]);

    return toInstance(ChannelEntity, rows[0]);
  }
}
