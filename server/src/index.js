import { config } from './config.js';
import { openDb } from './db.js';
import { createApp } from './app.js';

const db = await openDb({ url: config.databaseUrl, file: config.dbFile });
const app = createApp(db);

const server = app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port} (${db.dialect})`);
});

// الاستضافات بتبعت SIGTERM وقت إعادة التشغيل: نقفل الاتصالات بهدوء بدل ما نقطع طلبات شغالة
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  });
}
