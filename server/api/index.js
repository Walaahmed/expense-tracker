// نقطة دخول الـ API على Vercel (Serverless Function).
let appPromise;

async function createAppOnce() {
  const [{ config }, { openDb }, { createApp }] = await Promise.all([
    import('../src/config.js'),
    import('../src/db.js'),
    import('../src/app.js'),
  ]);
  if (!config.databaseUrl) {
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
    appPromise = undefined;
    console.error('Startup failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    // مؤقتًا بنعرض سبب الفشل للتشخيص. بعد ما يشتغل امسحي الجزء ده.
    return res.end(JSON.stringify({ error: `Startup error: ${err.code ? err.code + ': ' : ''}${err.message}`.slice(0, 300) }));
  }
}
