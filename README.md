This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## DevLab Quickstart

This repository includes additional tools and services for local development and testing beyond a vanilla Next.js app.

Local development

1. Copy `.env.example` to `.env.local` and fill credentials.
2. Install dependencies: `npm ci`.
3. Start dev server: `npm run dev`.

Tests

- Unit tests: `npm run test:unit`
- Validator tests: `npm run test:validator`
- Integration queue tests: `npm run test:integration`

Worker & Redis

To run the execution worker with Redis locally:

```bash
docker compose up -d
npm ci
node scripts/worker-redis.js
```

Metrics

Prometheus-compatible metrics are exposed at `/api/metrics`.

Docs

See the `docs/` folder for feature-specific guides: `PARTIAL_GRADING.md`, `WORKER_POOL.md`, `ENVIRONMENT.md`, `MYSQL_ADAPTER.md`.

Deployment

- Apply DB migrations in `lib/db/migrations/` before enabling schema-dependent features.
- To apply migrations locally or to a Postgres instance, set `DATABASE_URL` and run:

```bash
npm run migrate
```

- Quick smoke tests (requires dev server running):

```bash
# scan a test
TEST_ID=<test-uuid> npm run smoke:plagiarism

# run a simple concurrent load test (defaults target to plagiarism scan URL)
TARGET_URL=http://localhost:3000/api/plagiarism/scan/<test-id> CONCURRENCY=20 REQS=200 npm run load:test
```

- Toggle features via environment variables (see `.env.example`).

