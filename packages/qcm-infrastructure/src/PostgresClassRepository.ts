import type { SchoolClass, ClassRepository } from '@kahin/qcm-domain';

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

type DbClassRow = { id: string; name: string };
type DbNameRow = { name: string };

let sharedPool: PgPool | null = null;

function getPool(): PgPool {
  if (sharedPool) return sharedPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set to use PostgresClassRepository.');
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
 * Classes en Postgres. Migre automatiquement l’ancienne table `roster_names`
 * vers une classe « Classe » si aucune classe n’existe encore.
 */
export class PostgresClassRepository implements ClassRepository {
  private readonly pool: PgPool;
  private schemaReady = false;

  constructor(customPool?: PgPool) {
    this.pool = customPool ?? getPool();
  }

  private async ensureSchema(): Promise<void> {
    if (this.schemaReady) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS class_roster_names (
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (class_id, name)
      )
    `);
    await this.migrateLegacyRosterIfNeeded();
    this.schemaReady = true;
  }

  private async migrateLegacyRosterIfNeeded(): Promise<void> {
    const existing = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM classes`
    );
    if (Number(existing.rows[0]?.count ?? 0) > 0) return;

    // Ancienne table singleton ?
    const tableCheck = await this.pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'roster_names'
      ) AS exists
    `);
    if (!tableCheck.rows[0]?.exists) return;

    const legacy = await this.pool.query<DbNameRow>(
      `SELECT name FROM roster_names ORDER BY sort_order ASC, name ASC`
    );
    if (legacy.rows.length === 0) return;

    const id = crypto.randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO classes (id, name, sort_order) VALUES ($1, $2, 0)`,
        [id, 'Classe']
      );
      for (let i = 0; i < legacy.rows.length; i++) {
        await client.query(
          `INSERT INTO class_roster_names (class_id, name, sort_order) VALUES ($1, $2, $3)`,
          [id, legacy.rows[i].name, i]
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

  async list(): Promise<SchoolClass[]> {
    await this.ensureSchema();
    const classRows = await this.pool.query<DbClassRow>(
      `SELECT id, name FROM classes ORDER BY sort_order ASC, name ASC`
    );
    const result: SchoolClass[] = [];
    for (const row of classRows.rows) {
      const names = await this.pool.query<DbNameRow>(
        `SELECT name FROM class_roster_names WHERE class_id = $1 ORDER BY sort_order ASC, name ASC`,
        [row.id]
      );
      result.push({
        id: row.id,
        name: row.name,
        names: names.rows.map((n) => n.name),
      });
    }
    return result;
  }

  async getById(id: string): Promise<SchoolClass | null> {
    await this.ensureSchema();
    const classRows = await this.pool.query<DbClassRow>(
      `SELECT id, name FROM classes WHERE id = $1`,
      [id]
    );
    const row = classRows.rows[0];
    if (!row) return null;
    const names = await this.pool.query<DbNameRow>(
      `SELECT name FROM class_roster_names WHERE class_id = $1 ORDER BY sort_order ASC, name ASC`,
      [id]
    );
    return {
      id: row.id,
      name: row.name,
      names: names.rows.map((n) => n.name),
    };
  }

  async save(schoolClass: SchoolClass): Promise<void> {
    await this.ensureSchema();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
        INSERT INTO classes (id, name, sort_order)
        VALUES ($1, $2, 0)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        `,
        [schoolClass.id, schoolClass.name]
      );
      await client.query(`DELETE FROM class_roster_names WHERE class_id = $1`, [
        schoolClass.id,
      ]);
      for (let i = 0; i < schoolClass.names.length; i++) {
        await client.query(
          `INSERT INTO class_roster_names (class_id, name, sort_order) VALUES ($1, $2, $3)`,
          [schoolClass.id, schoolClass.names[i], i]
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

  async delete(id: string): Promise<void> {
    await this.ensureSchema();
    await this.pool.query(`DELETE FROM classes WHERE id = $1`, [id]);
  }
}
