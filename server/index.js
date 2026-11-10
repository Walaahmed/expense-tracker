// نقطة دخول الـ API على Vercel (Serverless Function).
// Vercel مش بيشغّل سيرفر شغال طول الوقت: بيشغّل الدالة دي عند كل طلب (ويعيد استخدامها وهي "دافية").
// فبنبني الـ app والاتصال بقاعدة البيانات مرة واحدة ونحتفظ بيهم بين الطلبات.
import { createApp } from '../server/src/app.js';
import { config } from '../server/src/config.js';
import { openDb } from '../server/src/db.js';

let appPromise;

export default async function handler(req, res) {
  if (!config.databaseUrl) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'DATABASE_URL is not set. Add it in Vercel > Settings > Environment Variables.' }));
  }
  appPromise ??= openDb({ url: config.databaseUrl })
    .then((db) => createApp(db))
    .catch((err) => {
      appPromise = undefined; 
      throw err;
    });
  const app = await appPromise;
  return app(req, res);
}
