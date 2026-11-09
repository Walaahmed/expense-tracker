import jwt from 'jsonwebtoken';
import { config } from './config.js';

// هيدرز أمان أساسية. (مكتبة helmet بتعمل أكتر من كده، بس هنا بنوضح الفكرة.)
export function securityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff'); // المتصفح ميخمنش نوع الملف
  res.set('X-Frame-Options', 'DENY'); // ممنوع حد يحط موقعك في iframe (clickjacking)
  res.set('Referrer-Policy', 'no-referrer');
  next();
}

// بتقرا الهيدر:  Authorization: Bearer <token>
// لو التوكن سليم بتحط req.userId وتكمل، لو لأ بترجع 401.
export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.userId = Number(payload.sub);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Express 4 مبيمسكش الأخطاء اللي بتحصل جوه دالة async لوحده (الطلب بيفضل معلّق).
// اللفّة دي بتمسك أي خطأ وتبعته للـ errorHandler. (Express 5 بيعمل ده تلقائي.)
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// لازم يبقى آخر middleware، وفيه 4 باراميترز عشان Express يعرف إنه error handler.
// eslint-disable-next-line no-unused-vars 
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    // مبنكشفش تفاصيل الأخطاء الداخلية للمستخدم
    error: status >= 500 ? 'Internal server error' : err.message,
  });
}
