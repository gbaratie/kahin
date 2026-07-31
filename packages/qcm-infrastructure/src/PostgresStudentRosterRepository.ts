import type { StudentRoster, StudentRosterRepository } from '@kahin/qcm-domain';

type PgPool = {
  connect(): Promise<PgClient>;
  query<T = any>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }>;
};

type PgClient = {
  query<T = any>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }>;
  release(): void;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-require-imports
const { Pool } = require('pg') as { Pool: new (config: unknown) => PgPool };

type DbRosterRow = {
  name: string;
};

let sharedPool: PgPool | null = null;

function getPool(): PgPool {
  if (sharedPool) return sharedPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL must be set to use PostgresStudentRosterRepository.'
    );
  }

  sharedPool = new Pool({
    connectionString,
    ssl:
      process.env.PGSSLMODE === 'disable'
        ? false
        : { rejectUnauthorized: false },
  });

  return sharedPool;
}

/**
 * Liste des élèves en Postgres (table roster_names).
 * Le schéma est appliqué à la volée (CREATE IF NOT EXISTS) pour les déploiements existants.
 */
export class PostgresStudentRosterRepository implements StudentRosterRepository {
  private readonly pool: PgPool;
  private schemaReady = false;

  constructor(customPool?: PgPool) {
    this.pool = customPool ?? getPool();
  }

  private async ensureSchema(): Promise<void> {
    if (this.schemaReady) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS roster_names (
        name TEXT PRIMARY KEY,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);
    this.schemaReady = true;
  }

  async get(): Promise<StudentRoster> {
    await this.ensureSchema();
    const result = await this.pool.query<DbRosterRow>(
      `SELECT name FROM roster_names ORDER BY sort_order ASC, name ASC`
    );
    return { names: result.rows.map((r) => r.name) };
  }

  async save(roster: StudentRoster): Promise<void> {
    await this.ensureSchema();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM roster_names');
      for (let i = 0; i < roster.names.length; i++) {
        await client.query(
          `INSERT INTO roster_names (name, sort_order) VALUES ($1, $2)`,
          [roster.names[i], i]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
