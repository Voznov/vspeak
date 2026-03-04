import { AsyncLocalStorage } from 'async_hooks';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, type PoolClient, type QueryConfigValues, type QueryResultRow } from 'pg';
import { POSTGRES_MIGRATION_CONFIG } from './postgres.constants';
import { runMigrations } from './postgres.migrator';
import { type PostgresMigrationConfig } from './postgres.types';
import { ManualPromise } from '../utils/async';

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private static readonly transactionClientStorage = new AsyncLocalStorage<PoolClient | undefined>();
  private static readonly migrationContextStorage = new AsyncLocalStorage<boolean>();

  private readonly pool: Pool;
  private readonly logger = new Logger(PostgresService.name);
  private readonly migrationReady = new ManualPromise<void>();

  constructor(@Inject(POSTGRES_MIGRATION_CONFIG) private readonly migrationConfig: PostgresMigrationConfig) {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.runMigrations();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async query<T extends QueryResultRow, I = unknown[]>(sql: string, params?: QueryConfigValues<I>) {
    await this.waitForMigrations();

    return (PostgresService.transactionClientStorage.getStore() ?? this.pool).query<T>(sql, params);
  }

  /**
   * Wraps fn in a transaction. If already inside a transaction, reuses it (unless independent=true).
   * The transaction client is automatically used by query() calls inside fn via AsyncLocalStorage.
   */
  async transaction<T>(fn: () => Promise<T>, independent = false): Promise<T> {
    await this.waitForMigrations();

    const hasStore = Boolean(PostgresService.transactionClientStorage.getStore());

    return !independent && hasStore ? fn() : this.wrapInTransaction(async (client) => PostgresService.transactionClientStorage.run(client, fn));
  }

  /**
   * Executes fn outside any active transaction — all queries inside use the pool directly.
   */
  async outOfTransaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForMigrations();

    return PostgresService.transactionClientStorage.run(undefined, fn);
  }

  async transactionForMigration<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.wrapInTransaction(async (client) => PostgresService.transactionClientStorage.run(client, async () => fn(client)));
  }

  private async wrapInTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async runMigrations(): Promise<void> {
    try {
      const ran = await PostgresService.migrationContextStorage.run(true, async () => runMigrations(this, this.migrationConfig));
      this.logger.log({ ran }, 'Migrations complete');
    } finally {
      this.migrationReady.resolve();
    }
  }

  private async waitForMigrations(): Promise<void> {
    if (!PostgresService.migrationContextStorage.getStore()) {
      await this.migrationReady;
    }
  }
}
