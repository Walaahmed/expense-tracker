// Rate limiter بسيط في الذاكرة (من غير مكتبات): بيحدد عدد الطلبات من نفس الـ IP
// في فترة زمنية. بنستخدمه على login/register عشان نصعّب تخمين الباسوردات.
//
// حدوده: الذاكرة خاصة بكل عملية، فلو شغّلتي أكتر من سيرفر، كل واحد له عداده.
// وقتها بنستخدم Redis أو مكتبة زي express-rate-limit مع store مشترك.
export function createRateLimiter({ windowMs, max }) {
  const hits = new Map(); // ip -> { count, resetAt }

  // تنظيف دوري عشان الـ Map متكبرش للأبد. unref() بيمنع التايمر من إبقاء العملية شغالة.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = req.ip;

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }
    next();
  };
}
