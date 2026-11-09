// قاعدة البيانات بتتحدد من الإعدادات:
//   DATABASE_URL موجود  -> PostgreSQL (للنشر: البيانات بتفضل محفوظة حتى لو السيرفر اتعمله restart)
//   مفيش               -> SQLite المدمجة في Node (للتطوير: من غير أي تثبيت)
//
// كل الـ SQL في models/ مكتوب بصيغة تشتغل على الاتنين، والفرق الوحيد هو الـ schema تحت
// (أنواع الأعمدة والـ auto increment مختلفين شوية).
import { openPostgres } from './drivers/postgres.js';

const SCHEMA = {
  sqlite: `
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      amount     REAL NOT NULL CHECK (amount > 0),
      category   TEXT NOT NULL,
      date       TEXT NOT NULL,
      note       TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
    CREATE TABLE IF NOT EXISTS budgets (
      user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      amount   REAL NOT NULL CHECK (amount > 0),
      PRIMARY KEY (user_id, category)
    );
  `,
  postgres: `
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      amount     DOUBLE PRECISION NOT NULL CHECK (amount > 0),
      category   TEXT NOT NULL,
      date       TEXT NOT NULL,
      note       TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
    CREATE TABLE IF NOT EXISTS budgets (
      user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      amount   DOUBLE PRECISION NOT NULL CHECK (amount > 0),
      PRIMARY KEY (user_id, category)
    );
  `,
};

/**
 * openDb({ url })   -> PostgreSQL
 * openDb({ file })  -> SQLite (':memory:' للاختبارات)
 * (بتقبل string كمان: openDb(':memory:'))
 */
export async function openDb(options = {}) {
  const { url, file = ':memory:' } = typeof options === 'string' ? { file: options } : options;
  // import ديناميكي: في النشر (Postgres) مش بنحمّل node:sqlite خالص
  const db = url ? await openPostgres(url) : (await import('./drivers/sqlite.js')).openSqlite(file);
  await db.exec(SCHEMA[db.dialect]);
  return db;
}
