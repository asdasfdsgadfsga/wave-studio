// Local development/test adapter. Production uses Cloudflare's D1 binding.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function openBookingDatabase(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec(readFileSync(new URL('../../migrations/0001_bookings.sql', import.meta.url), 'utf8'));
  function prepare(sql) {
    let args = [];
    return {
      bind(...values) { args = values; return this; },
      async first() { return sqlite.prepare(sql).get(...args) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...args), success: true }; },
      execute() { const result = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: result.changes } }; },
      async run() { return this.execute(); }
    };
  }
  return {
    prepare,
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = [];
        for (const statement of statements) result.push(statement.execute());
        sqlite.exec('COMMIT');
        return result;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    close() { sqlite.close(); }
  };
}
