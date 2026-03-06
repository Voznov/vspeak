import { type PoolClient } from 'pg';
import { type PostgresMigration } from '../postgres.types';

export class CreateUsers20260306001 implements PostgresMigration {
  async up(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE users (
        id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        nickname    VARCHAR(64)  NOT NULL,
        role        VARCHAR(16)  NOT NULL DEFAULT 'user',
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(client: PoolClient): Promise<void> {
    await client.query('DROP TABLE IF EXISTS users');
  }
}
