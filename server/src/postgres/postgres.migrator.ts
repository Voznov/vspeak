import assert from 'assert';
import { Logger, type Type } from '@nestjs/common';
import { type PostgresService } from './postgres.service';
import { type PostgresMigration, type PostgresMigrationConfig } from './postgres.types';

const getMigrationTimestamp = (migration: Type<PostgresMigration>): number => {
  const timestamp = migration.name.match(/\d+/g)?.at(-1);
  assert(timestamp, `Migration class name must contain a timestamp: ${migration.name}`);

  return Number(timestamp);
};

export async function runMigrations(service: PostgresService, config: PostgresMigrationConfig): Promise<string[]> {
  const logger = new Logger('PostgresMigrator');

  const sorted = Object.values(config.migrations).sort((a, b) => getMigrationTimestamp(a) - getMigrationTimestamp(b));

  await service.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const { rows } = await service.query<{ name: string }>('SELECT name FROM migrations');
  const executed = new Set(rows.map((r) => r.name));
  const pending = sorted.filter((m) => !executed.has(m.name));

  const ran: string[] = [];

  for (const MigrationClass of pending) {
    logger.log(`Running migration: ${MigrationClass.name}`);

    await service.transactionForMigration(async (client) => {
      await new MigrationClass().up(client);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [MigrationClass.name]);
    });

    ran.push(MigrationClass.name);
    logger.log(`Completed migration: ${MigrationClass.name}`);
  }

  return ran;
}
