# NOJAI Frontend

NOJAI is a Next.js 14 frontend for a trading SaaS platform with public marketing pages, authenticated user dashboards, and an admin control panel.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives
- NextAuth credentials authentication with JWT session storage
- TanStack React Query
- React Hook Form + Zod
- Recharts
- Socket.io client
- Paystack and NOWPayments initialization flow

## Environment

Copy [.env.example](.env.example) to `.env.local` and update the values.

Required values:

- `API_URL=http://localhost:5000/api`
- `BACKEND_URL=http://localhost:5000`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET=...`
- `NEXT_PUBLIC_IQ_PASSWORD_SECRET=...`

The frontend now proxies browser requests through internal Next.js routes, so the backend host is kept server-side and is not exposed in client requests.

## Run locally

```bash
npm install
npm run dev
```

The frontend expects the backend to be running at the host configured by `API_URL` and `BACKEND_URL`.

## Implemented areas

- Public landing page with pricing, reviews, features, FAQ, blog, and courses
- Credentials auth flow using backend JWTs via NextAuth
- User dashboard pages for overview, accounts, trades, copy trading, webhook, settings, subscription, and reviews
- Admin pages for overview, users, bots, pricing, blog, courses, reviews, access codes, and settings

## Backend endpoints expected

The frontend is wired for these backend routes:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/admin/pricing`
- `GET /api/reviews`
- `POST /api/reviews`
- `GET /api/blog`
- `GET /api/blog/:slug`
- `GET /api/courses`
- `GET /api/courses/:slug`
- `GET /api/user/profile`
- `PUT /api/user/profile`
- `GET /api/user/trades`
- `GET /api/user/iq-account`
- `PUT /api/user/iq-account`
- `POST /api/payment/initialize/paystack`
- `POST /api/payment/initialize/crypto`
- `GET /api/admin/dashboard/stats`
- `GET /api/admin/users`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/bots`
- `POST /api/admin/bots`
- `PUT /api/admin/bots/:id`
- `PUT /api/admin/pricing/:id`
- `POST /api/admin/blog`
- `PUT /api/admin/blog/:id`
- `DELETE /api/admin/blog/:id`
- `POST /api/admin/courses`
- `PUT /api/admin/courses/:id`
- `GET /api/admin/reviews`
- `PUT /api/admin/reviews/:id/approve`
- `DELETE /api/admin/reviews/:id`
- `POST /api/admin/access-codes`
- `PUT /api/admin/settings`
