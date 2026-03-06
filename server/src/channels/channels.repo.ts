import { Injectable } from '@nestjs/common';
import type { ChannelId } from '../../../libs/api/entities';
import { toDto } from '../../libs/validation';
import { PostgresService } from '../postgres/postgres.service';
import { ChannelEntity } from './channels.entity';

@Injectable()
export class ChannelsRepo {
  constructor(private readonly pg: PostgresService) {}

  async createChannel(name: string): Promise<ChannelEntity> {
    const { rows } = await this.pg.query(
      'INSERT INTO channels (name) VALUES ($1) RETURNING *',
      [name],
    );

    return toDto(ChannelEntity, rows[0]);
  }

  async deleteChannel(channelId: ChannelId): Promise<void> {
    await this.pg.query('DELETE FROM channels WHERE id = $1', [channelId]);
  }

  async listChannels(): Promise<ChannelEntity[]> {
    const { rows } = await this.pg.query('SELECT * FROM channels ORDER BY created_at');

    return toDto(ChannelEntity, rows);
  }

  async getChannelById(channelId: ChannelId): Promise<ChannelEntity | undefined> {
    const { rows } = await this.pg.query('SELECT * FROM channels WHERE id = $1', [channelId]);

    return rows[0] ? toDto(ChannelEntity, rows[0]) : undefined;
  }
}
