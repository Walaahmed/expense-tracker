import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { createUser, findUserByEmail, findUserById } from '../models/users.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: '7d' });

const emailTaken = (res) =>
  res.status(409).json({
    error: 'Email is already registered',
    details: { email: 'Email is already registered' },
  });

export function authRouter(db) {
  const router = Router();

  router.post('/register', async (req, res, next) => {
    try {
      const name = String(req.body?.name ?? '').trim();
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');

      const details = {};
      if (!name || name.length > 60) details.name = 'Name is required (max 60 characters)';
      if (!EMAIL_RE.test(email)) details.email = 'Enter a valid email';
      if (password.length < 8) details.password = 'Password must be at least 8 characters';
      if (Object.keys(details).length) {
        return res.status(400).json({ error: 'Please fix the highlighted fields', details });
      }

      if (await findUserByEmail(db, email)) return emailTaken(res);

      // bcrypt بيعمل hash للباسورد (مع salt عشوائي). مبنخزنش الباسورد نفسه أبداً.
      const passwordHash = await bcrypt.hash(password, 10);
      let user;
      try {
        user = await createUser(db, { name, email, passwordHash });
      } catch (err) {
        // طلبين بنفس الإيميل في نفس اللحظة: الاتنين عدّوا فحص findUserByEmail،
        // وقاعدة البيانات (UNIQUE) هي اللي بترفض التاني. SQLite و Postgres بيبلّغوا بشكل مختلف.
        if (err.code === '23505' || /UNIQUE constraint/i.test(err.message)) return emailTaken(res);
        throw err;
      }
      res.status(201).json({ token: signToken(user.id), user });
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');

      const row = await findUserByEmail(db, email);
      // نفس الرسالة للإيميل الغلط والباسورد الغلط، عشان محدش يعرف مين مسجل عندنا
      const ok = row && (await bcrypt.compare(password, row.password_hash));
      if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

      const user = { id: row.id, name: row.name, email: row.email };
      res.json({ token: signToken(user.id), user });
    } catch (err) {
      next(err);
    }
  });

  // الواجهة بتنادي عليه أول ما تفتح عشان تعرف لو التوكن المحفوظ لسه شغال
  router.get('/me', requireAuth, asyncHandler(async (req, res) => {
    const user = await findUserById(db, req.userId);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    res.json({ user });
  }));

  return router;
}
