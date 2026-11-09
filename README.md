# Spendly – Expense Tracker

A full-stack expense tracker with interactive charts. Users sign up, log expenses, and see where their money goes through a monthly dashboard.

**Stack:** React 18 (Vite) · Recharts · React Router · Node.js · Express · SQLite · JWT auth

<!-- أضيفي هنا screenshot أو GIF للتطبيق + رابط الـ Live Demo -->

## Features

- Sign up / log in with JWT authentication (passwords hashed with bcrypt)
- Add, edit and delete expenses; each user only sees their own data
- Monthly dashboard with:
  - summary cards (total, transactions, top category, daily average, change vs. last month)
  - donut chart: spending by category
  - bar chart: last 6 months
  - area chart: day-by-day spending
- Filter by category and search by title (debounced)
- Monthly budgets per category with progress bars and warnings at 80% / when exceeded
- Form validation on both sides: instant inline errors in the UI (on blur and on submit, focus jumps to the first invalid field) and the same rules enforced again on the server
- Security basics: bcrypt, JWT expiry, per-user data isolation, rate limiting on login/register, security headers, request size limit
- Responsive layout, light and dark mode

### Performance and polish
- **Splash screen**: pure HTML/CSS inside `index.html`, visible from the first byte (no white screen). `src/splash.js` removes it once auth state is known, after at least 700 ms so the animation never flickers.
- **Code splitting**: the dashboard and the charts (`recharts`) are lazy chunks; the login page ships without them. Vite splits `react` and `charts` vendor chunks.
- **No loading waterfall**: with a saved token the dashboard chunk starts downloading in parallel with `/auth/me`; new visitors prefetch it while idle on the login page.
- **Route loading**: top progress bar + page skeleton while a page chunk loads, skeleton cards/charts/list while data loads.
- **Requests**: stale requests are cancelled with `AbortController`; the old data stays visible (dimmed) while new data loads; search is debounced.
- **Rendering**: `React.memo` on summary, charts, list rows and budgets, with `useCallback` handlers so the memo actually works.
- **Caching**: the server sends `Cache-Control: immutable` for hashed `/assets` and `no-cache` for `index.html`.
- **New features**: toasts, accessible confirm dialog (replaces `window.confirm`), CSV export (formula-injection safe, Excel-friendly), month-end projection, show/hide password.
- **Animations**: staggered entrance, count-up numbers, growing budget bars, pulsing warnings, hover lifts. All disabled under `prefers-reduced-motion`.

## Project structure

```
expense-tracker/
├── server/
│   ├── src/
│   │   ├── index.js          # starts the server
│   │   ├── app.js            # Express app (middleware + routes)
│   │   ├── config.js         # environment variables
│   │   ├── db.js             # SQLite schema
│   │   ├── middleware.js     # requireAuth (JWT), security headers, error handler
│   │   ├── rateLimit.js      # in-memory rate limiter (no dependencies)
│   │   ├── routes/           # auth, expenses, budgets, stats (HTTP layer)
│   │   └── models/           # users, expenses, budgets, stats (SQL + validation)
│   └── test/                 # node:test unit + API tests
└── client/
    └── src/
        ├── api.js            # fetch wrapper (adds token, handles errors)
        ├── validation.js     # form rules (expense, auth, budget)
        ├── useValidatedForm.js  # shared form + validation hook
        ├── AuthContext.jsx   # login state shared across the app
        ├── pages/            # AuthPage, Dashboard
        └── components/       # Charts, Budgets, ExpenseForm, ExpenseList, SummaryCards, Field
```

## Run locally

Requires **Node.js 22.5+** (the database uses Node's built-in `node:sqlite`, so there is nothing else to install).

```bash
# 1) API  (terminal 1)
cd server
cp .env.example .env        # then set JWT_SECRET
npm install
npm run dev                 # http://localhost:4000

# 2) Web app  (terminal 2)
cd client
npm install
npm run dev                 # http://localhost:5173
```

In development Vite proxies `/api` to the server, so no CORS setup is needed.

## Tests

```bash
cd server && npm test
```

Covers validation, per-user data isolation, filtering, the statistics and budget queries (including empty months and year boundaries), the rate limiter, and the full HTTP API (auth, CRUD, budgets, 401/404/400/429 cases).

## API

All routes except `/auth/*` and `/health` need `Authorization: Bearer <token>`.

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account, returns `{ token, user }` |
| POST | `/api/auth/login` | Log in, returns `{ token, user }` |
| GET | `/api/auth/me` | Current user |
| GET | `/api/expenses?month=YYYY-MM&category=&q=` | List expenses |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/stats?month=YYYY-MM` | Totals + data for the three charts |
| GET | `/api/budgets?month=YYYY-MM` | Budgets with spent / remaining / status (`ok`, `warning`, `over`) |
| PUT | `/api/budgets/:category` | Create or update a budget (`{ amount }`) |
| DELETE | `/api/budgets/:category` | Remove a budget |

`/api/auth/login` and `/api/auth/register` are limited to 20 requests per 15 minutes per IP (HTTP 429).

## Deployment

Easiest option: **one service**. Build the client (`cd client && npm run build`); the Express server automatically serves `client/dist` when it exists. Deploy the repo to Render/Railway with:

- Build command: `cd client && npm install && npm run build && cd ../server && npm install`
- Start command: `cd server && npm start`
- Env vars: `NODE_ENV=production`, `JWT_SECRET=<long random string>`, `DB_FILE=<path on a persistent disk>`

> **Important:** SQLite stores data in a file. Free tiers on Render/Railway have an ephemeral disk, so the data is wiped on every redeploy. For a demo that must keep its data, attach a persistent disk, or move the `server/src/models/` layer to PostgreSQL (Neon / Supabase free tier) or MongoDB Atlas. All SQL lives in that folder, so the routes don't change.

If you deploy the client and server separately (e.g. Vercel + Render), set `VITE_API_URL` in the client build and `CLIENT_URL` on the server.

## Possible next steps

Recurring expenses, CSV export, pagination, httpOnly-cookie sessions with refresh tokens, a Redis-backed rate limiter for multi-instance deployments.


## Database: SQLite for development, PostgreSQL for production
- No `DATABASE_URL` -> SQLite (`node:sqlite`, a file). Nothing to install.
- With `DATABASE_URL` -> PostgreSQL via `pg` (the app creates its tables on first start).
- All SQL is written once in `server/src/models` in a portable subset; `server/src/drivers` adapts it to each engine (placeholders, transactions, number types), and `server/src/db.js` holds the two schemas.
- Run the model tests on Postgres too: `TEST_DATABASE_URL=postgresql://... npm test --workspace server` (it truncates the tables, use a throwaway database).

## Deploy (Vercel + Neon)
The repo is ready for Vercel: `vercel.json` serves `client/dist` and routes `/api/*` to the Express app in `api/index.js` (a serverless function). Set `DATABASE_URL` (Neon) and `JWT_SECRET` in the Vercel project settings. Step-by-step guide in Arabic: [DEPLOY.ar.md](DEPLOY.ar.md).

**Live demo:** _add your Vercel URL here_ · **Repo:** _add your GitHub URL here_
"# expense-tracker" 
