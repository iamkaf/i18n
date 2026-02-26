/**
 * In-memory mock D1 database for unit tests.
 *
 * Usage: call `setupMockDB(rows)` before each test.
 * The mock intercepts `getDB()` by patching the module via vi.mock.
 */

export type MockRow = Record<string, unknown>;

export class MockD1 {
  private tables: Record<string, MockRow[]> = {};
  private lastInsert: MockRow | null = null;

  seed(table: string, rows: MockRow[]) {
    this.tables[table] = [...rows];
    return this;
  }

  getTable(table: string): MockRow[] {
    return this.tables[table] ?? [];
  }

  /** Simplified SQL runner used by the mock statement */
  run(sql: string, params: unknown[]): { results: MockRow[]; success: boolean; error?: string } {
    const s = sql.trim().replace(/\s+/g, " ").toUpperCase();

    // SELECT
    if (s.startsWith("SELECT")) {
      // Extract table name (very naive)
      const fromMatch = sql.match(/FROM\s+(\w+)/i);
      if (!fromMatch) return { results: [], success: true };
      const table = fromMatch[1].toLowerCase();
      const rows = this.tables[table] ?? [];

      // WHERE id = ?
      const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereMatch) {
        const col = whereMatch[1].toLowerCase();
        const val = params[0];
        return { results: rows.filter((r) => r[col] === val), success: true };
      }
      return { results: rows, success: true };
    }

    // INSERT
    if (s.startsWith("INSERT")) {
      const tableMatch = sql.match(/INTO\s+(\w+)/i);
      if (!tableMatch) return { results: [], success: true };
      const table = tableMatch[1].toLowerCase();
      if (!this.tables[table]) this.tables[table] = [];
      // We can't easily parse column names, so just store param array as a row.
      // Tests that need specific columns should seed data directly.
      const row: MockRow = { _params: params };
      this.tables[table].push(row);
      this.lastInsert = row;
      return { results: [], success: true };
    }

    // UPDATE
    if (s.startsWith("UPDATE")) {
      return { results: [], success: true };
    }

    return { results: [], success: true };
  }
}

export function makeMockStatement(db: MockD1, sql: string) {
  let boundParams: unknown[] = [];

  return {
    bind(...args: unknown[]) {
      boundParams = args;
      return this;
    },
    async all<T>() {
      const { results, success, error } = db.run(sql, boundParams);
      return { results: results as T[], success, error };
    },
    async first<T>() {
      const { results } = db.run(sql, boundParams);
      return (results[0] as T) ?? null;
    },
    async run() {
      const { success, error } = db.run(sql, boundParams);
      return { success, error };
    },
  };
}

export function createMockD1(seedData: Record<string, MockRow[]> = {}): D1Database {
  const db = new MockD1();
  for (const [table, rows] of Object.entries(seedData)) {
    db.seed(table, rows);
  }
  return {
    prepare(sql: string) {
      return makeMockStatement(db, sql) as unknown as D1PreparedStatement;
    },
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
  } as unknown as D1Database;
}
