// PostgreSQL عن طريق مكتبة `pg`. بنفس interface الـ SQLite (شوفي sqlite.js).
// بنكتب الـ SQL بعلامات `?` في كل الكود، وهنا بنحوّلها لـ $1, $2, ... اللي Postgres بيفهمها.

// ? -> $1, $2 ... (بنتجاهل أي ? جوه نص بين علامتي تنصيص)
export function toPgPlaceholders(sql) {
  let n = 0;
  let quote = null;
  let out = '';
  for (const ch of sql) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === '?') {
      out += `$${++n}`;
      continue;
    }
    out += ch;
  }
  return out;
}

export async function openPostgres(connectionString) {
  // import ديناميكي: مكتبة pg مش مطلوبة لو شغالة بـ SQLite
  const pg = (await import('pg')).default;

  // Postgres بيرجّع COUNT/SUM من نوع bigint/numeric كـ string عشان ميضيعش دقة.
  // أرقامنا صغيرة، فبنحوّلها لـ number عشان الـ models تشتغل زي SQLite بالظبط.
  pg.types.setTypeParser(20, Number); // bigint
  pg.types.setTypeParser(1700, Number); // numeric

  // لو الاستضافة محتاجة SSL حطي ?sslmode=require في آخر DATABASE_URL (Neon و Supabase بيدّوكي كده)
  // على Vercel كل instance من الدالة ليها pool لوحدها، فبنصغّره عشان منعدّيش حد الاتصالات في قاعدة البيانات
  const max = Number(process.env.PG_POOL_MAX) || (process.env.VERCEL ? 3 : 8);
  const pool = new pg.Pool({ connectionString, max });
  pool.on('error', (err) => console.error('Unexpected Postgres error', err.message));

  const make = (target) => ({
    get: async (sql, params = []) => (await target.query(toPgPlaceholders(sql), params)).rows[0],
    all: async (sql, params = []) => (await target.query(toPgPlaceholders(sql), params)).rows,
    run: async (sql, params = []) => ({
      changes: (await target.query(toPgPlaceholders(sql), params)).rowCount ?? 0,
    }),
  });

  // نتأكد إن الاتصال شغال من البداية (فلو الـ URL غلط السيرفر يقف برسالة واضحة)
  await pool.query('SELECT 1');

  return {
    dialect: 'postgres',
    ...make(pool),
    exec: async (sql) => {
      await pool.query(sql);
    },
    // كل transaction لازم تمشي على نفس الـ client (اتصال واحد) من BEGIN لحد COMMIT
    transaction: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(make(client));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
