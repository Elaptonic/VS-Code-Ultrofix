# Backend Agent - Context & Progress

## Current Session
- Status: Task 0.1 (Session 401 Middleware) complete
- Last updated: 2026-06-15

## Project Context
- API: Ultrofix Express 5 + Socket.IO server (`artifacts/api-server`)
- Stack: Express 5, Drizzle ORM (`@workspace/db`), Zod (`@workspace/api-zod`), Firebase JWKS auth, Stripe/Razorpay, pino logging

## Latest Build Info
- `pnpm --filter @workspace/api-server run typecheck` — PASSES (2026-06-15)
- `pnpm --filter @workspace/api-server run test` — could not run on this machine: pre-existing `pnpm-workspace.yaml` `overrides` strip all non-linux-x64 native binaries (e.g. `@rollup/rollup-win32-x64-msvc`), so Vitest/Vite fails to start on Windows. See blockers.txt. Not caused by Task 0.1.

## Database Schema Reference
- `lib/db/src/schema/`: auth (sessions), bookings, services, providers, profiles, reviews, notifications, lead-dispatch-attempts, vendor-subscriptions
- Matcher: `lib/db/src/matcher.ts` (haversine nearest-provider)

## Completed Tasks
- Task 0.1 (Session 401 Middleware): added `requireAuth` middleware (`src/middlewares/authMiddleware.ts`) that returns 401 `{ error: "Unauthorized" }` when `req.isAuthenticated()` is false (covers missing/expired sessions, since `getSession` already deletes expired rows). Applied to every route that requires a logged-in user, replacing the old duplicated inline `if (!req.isAuthenticated())` / `if (!req.user)` checks:
  - `src/routes/onboarding.ts` (all 3 routes)
  - `src/routes/notifications.ts` (`POST /notifications/push-token`)
  - `src/routes/auth.ts` (`PATCH /auth/role`)
  - `src/routes/providers.ts` (`GET /providers/me`)
  - `src/routes/subscriptions.ts` (both routes)
  - `src/routes/reviews.ts` (both routes)
  - `src/routes/bookings.ts` (`GET /bookings/:id/dispatch-log`, admin-role check kept separate as 403)

## Active Dependencies
- See `.claude/agents/blockers.txt`

## API Patterns Used
- Routes in `src/routes/`, business logic in `src/lib/`, validation via `@workspace/api-zod`, auth via `src/middlewares/authMiddleware.ts` (`requireAuth` for any route requiring a session)

## Notes for Next Session
- First-ever clean install + typecheck on this machine surfaced and fixed two unrelated pre-existing type errors needed to get `tsc` to exit 0: `src/routes/notifications.ts` (TS7030 `noImplicitReturns` — added missing `return`s) and `src/routes/places.ts` (TS2322 — cast `response.json()` result to `any[]`). Neither is related to Task 0.1.
