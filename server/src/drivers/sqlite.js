// SQLite عن طريق node:sqlite المدمجة في Node (من غير تثبيت). بنستخدمه في التطوير والاختبارات.
//
// الـ interface (نفسه في postgres.js، فالـ models مش بتعرف أي قاعدة بتشتغل تحتها):
//   get(sql, params)  -> صف واحد أو undefined
//   all(sql, params)  -> مصفوفة صفوف
//   run(sql, params)  -> { changes }
//   exec(sql)         -> تنفيذ كذا statement (للـ schema)
//   transaction(fn)   -> fn(tx) جوه BEGIN/COMMIT (ROLLBACK لو حصل خطأ)
//   close()
import { DatabaseSync } from 'node:sqlite';

export function openSqlite(file = ':memory:') {
  const raw = new DatabaseSync(file);
  raw.exec('PRAGMA foreign_keys = ON');

  const cache = new Map();
  const stmt = (sql) => {
    let s = cache.get(sql);
    if (!s) cache.set(sql, (s = raw.prepare(sql)));
    return s;
  };

  // الاتصال واحد، فلازم الـ transaction تاخد القفل طول مدتها. غير كده طلب تاني
  // ممكن يدخل في نص الـ BEGIN..COMMIT ويتعمله rollback غلط.
  let tail = Promise.resolve();
  const exclusive = (fn) => {
    const result = tail.then(fn);
    tail = result.catch(() => {});
    return result;
  };

  const ops = {
    get: async (sql, params = []) => stmt(sql).get(...params),
    all: async (sql, params = []) => stmt(sql).all(...params),
    run: async (sql, params = []) => ({ changes: Number(stmt(sql).run(...params).changes) }),
  };

  return {
    dialect: 'sqlite',
    get: (sql, params) => exclusive(() => ops.get(sql, params)),
    all: (sql, params) => exclusive(() => ops.all(sql, params)),
    run: (sql, params) => exclusive(() => ops.run(sql, params)),
    exec: (sql) => exclusive(async () => raw.exec(sql)),
    transaction: (fn) =>
      exclusive(async () => {
        raw.exec('BEGIN');
        try {
          const result = await fn(ops);
          raw.exec('COMMIT');
          return result;
        } catch (err) {
          raw.exec('ROLLBACK');
          throw err;
        }
      }),
    close: async () => raw.close(),
  };
}
