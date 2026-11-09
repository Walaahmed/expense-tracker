import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler, requireAuth, securityHeaders } from './middleware.js';
import { createRateLimiter } from './rateLimit.js';
import { authRouter } from './routes/auth.js';
import { budgetsRouter } from './routes/budgets.js';
import { expensesRouter } from './routes/expenses.js';
import { statsRouter } from './routes/stats.js';

// بنفصل createApp عن listen() عشان نقدر نختبر الـ app من غير ما نفتح بورت ثابت.
// authRateLimit قابل للتعديل عشان الاختبارات متتعطلش بسبب الحد.
export function createApp(db, { authRateLimit = { windowMs: 15 * 60 * 1000, max: 20 } } = {}) {
  const app = express();

  app.disable('x-powered-by'); // مش لازم نعلن إننا Express
  // ورا proxy (Render/Railway) الـ IP الحقيقي بييجي في X-Forwarded-For.
  // من غيرها كل المستخدمين هيبانوا بنفس الـ IP وهيتحسبوا مع بعض.
  if (config.isProd) app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(cors({ origin: config.clientUrls }));
  app.use(express.json({ limit: '10kb' }));

  // limiter واحد مشترك للدخول والتسجيل
  const authLimiter = createRateLimiter(authRateLimit);

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
  app.use('/api/auth', authRouter(db));
  app.use('/api/expenses', requireAuth, expensesRouter(db));
  app.use('/api/budgets', requireAuth, budgetsRouter(db));
  app.use('/api/stats', requireAuth, statsRouter(db));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // اختياري: لو بنيتي الواجهة (npm run build في client) السيرفر يقدمها هو كمان،
  // وتنشري المشروع كله كخدمة واحدة.
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(dist)) {
    // ملفات /assets أسماؤها فيها hash بيتغير مع كل build، فالمتصفح يقدر يحفظها سنة كاملة.
    // أما index.html فلازم يتجدد كل مرة عشان يشاور على أحدث الملفات.
    app.use(
      '/assets',
      express.static(path.join(dist, 'assets'), { maxAge: '1y', immutable: true }),
    );
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
