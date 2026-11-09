// نقطة دخول الـ API على Vercel (Serverless Function).
// Vercel مش بيشغّل سيرفر شغال طول الوقت: بيشغّل الدالة دي عند كل طلب (ويعيد استخدامها وهي "دافية").
// فبنبني الـ app والاتصال بقاعدة البيانات مرة واحدة ونحتفظ بيهم بين الطلبات.
//
// الـ imports جوه try (dynamic import) عشان لو أي حاجة وقعت وقت التشغيل
// (متغير ناقص، مكتبة مش متثبتة، قاعدة بيانات مش بترد) نرجّع رسالة واضحة
// بدل صفحة FUNCTION_INVOCATION_FAILED اللي مبتقولش إيه المشكلة.
let appPromise;

async function createAppOnce() {
  const [{ config }, { openDb }, { createApp }] = await Promise.all([
    import('../server/src/config.js'),
    import('../server/src/db.js'),
    import('../server/src/app.js'),
  ]);
  if (!config.databaseUrl) {
    // على Vercel مفيش ملفات دايمة، فمينفعش SQLite. لازم قاعدة بيانات خارجية (Postgres).
    throw new Error('DATABASE_URL is not set (Vercel > Settings > Environment Variables, then Redeploy)');
  }
  return createApp(await openDb({ url: config.databaseUrl }));
}

export default async function handler(req, res) {
  try {
    appPromise ??= createAppOnce();
    const app = await appPromise;
    return app(req, res);
  } catch (err) {
    appPromise = undefined; // نحاول تاني في الطلب الجاي بدل ما نعلق على الفشل
    console.error('Startup failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    // مؤقتًا بنعرض سبب الفشل عشان نشخّص المشكلة. بعد ما تتحل امسحي الجزء ده وسيبي رسالة عامة.
    return res.end(JSON.stringify({ error: Startup error: ${err.code ? err.code + ': ' : ''}${err.message}.slice(0, 300) }));
  }
}
