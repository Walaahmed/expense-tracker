import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  // في الإنتاج مينفعش نشتغل بمفتاح افتراضي: أي حد يعرفه يقدر يزوّر توكن.
  throw new Error('JWT_SECRET must be set in production');
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // لو DATABASE_URL موجود بنستخدم PostgreSQL، لو لأ SQLite في ملف محلي
  databaseUrl: process.env.DATABASE_URL || '',
  dbFile: process.env.DB_FILE || 'data.db',
  isProd,
};
