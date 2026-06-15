# Complete Context (Ultrofix)

Aggregated reference for all agents (Analyst, Backend, Frontend). Sourced from
`CLAUDE.md` and `.claude/agents/*.md` — read those files for full detail;
this is the condensed cross-cutting summary.

## 1. Project Overview

Ultrofix is a home-services marketplace: a consumer/provider mobile app
(Expo/React Native) backed by an Express 5 + PostgreSQL + Drizzle API, with
real-time vendor dispatch over Socket.IO.

## 2. Tech Stack

- Monorepo: pnpm workspaces (Node 24, TypeScript 5.9, strict mode)
- Mobile: Expo 54 / React Native 0.81, Expo Router 6, React 19
- API: Express 5, Socket.IO 4.8, pino / pino-http
- DB: PostgreSQL via Drizzle ORM (+ drizzle-zod)
- Validation: Zod (`zod/v4`)
- API contract: `lib/api-spec` (OpenAPI) → Orval codegen → `lib/api-zod`
  (Zod schemas) + `lib/api-client-react` (React Query hooks)
- Auth: Firebase Phone OTP, ID tokens verified via JWKS (`jose`), opaque
  session tokens in Postgres
- Payments: Stripe + Razorpay
- Build: esbuild (API), Expo CLI (mobile), Vite (mockup-sandbox)
- Tests: Vitest

## 3. Workspace Layout

| Path | Package | Purpose |
|---|---|---|
| `artifacts/api-server` | `@workspace/api-server` | Express API + Socket.IO |
| `artifacts/urban-app` | `@workspace/urban-app` | Expo consumer/provider app |
| `artifacts/mockup-sandbox` | `@workspace/mockup-sandbox` | Vite UI sandbox |
| `lib/db` | `@workspace/db` | Drizzle schema, DB connection, matcher |
| `lib/api-zod` | `@workspace/api-zod` | Generated Zod schemas |
| `lib/api-client-react` | `@workspace/api-client-react` | Generated RQ hooks |
| `lib/api-spec` | `@workspace/api-spec` | OpenAPI spec + Orval config |
| `scripts` | `@workspace/scripts` | One-off TS scripts |

## 4. Common Commands

- `pnpm run typecheck` — typecheck libs then all artifacts/scripts
  (on this machine, bare `pnpm` isn't on PATH inside the root script, so run
  as two steps: `corepack pnpm run typecheck:libs && corepack pnpm -r
  --filter "./artifacts/**" --filter "./scripts" --if-present run typecheck`)
- `pnpm --filter @workspace/api-server run dev|typecheck|test`
- `pnpm --filter @workspace/urban-app run dev|typecheck|build|serve`
- `pnpm --filter @workspace/db run push|test`
- `pnpm --filter @workspace/api-spec run codegen` — regenerate `lib/api-zod`
  and `lib/api-client-react` from `lib/api-spec/openapi.yaml`

## 5. Three-Agent Architecture

- **Analyst** (`.claude/agents/analyst.md`, `analyst-context.md`) — reviews
  Frontend/Backend PRs against `CLAUDE.md`, gates on typecheck/test results,
  maintains `.claude/agents/blockers.txt`, monitors token usage.
- **Backend Agent** (`.claude/agents/backend.md`, `backend-context.md`) —
  owns `artifacts/api-server`: routes, `src/lib/`, Socket.IO handlers, DB
  access via `@workspace/db`, contracts via `@workspace/api-zod`.
- **Frontend Agent** (`.claude/agents/frontend.md`, `frontend-context.md`) —
  owns `artifacts/urban-app`: Expo Router screens, components, hooks, auth
  context; consumes `@workspace/api-client-react` / `@workspace/api-zod`.

Each agent's pre-execution checklist: read `CLAUDE.md`, its own `*.md`,
`blockers.txt`, and its `*-context.md` before starting a task.

## 6. Execution Rules (all agents)

- No `console.log` in `artifacts/api-server` or `artifacts/urban-app`
  production code — backend uses pino (`src/lib/logger.ts`).
- No hardcoded secrets/API keys/environment-specific URLs.
- No bypassing `authMiddleware` or duplicating session-validation logic.
- No hand-editing generated files under `lib/api-zod/src/generated/` or
  `lib/api-client-react/src/generated/` — regenerate via Orval
  (`pnpm --filter @workspace/api-spec run codegen`).
- All async route handlers / Socket.IO handlers: try/catch + consistent
  error envelope (`errorEnvelope` in `lib/api-zod`), log via pino.
- Drizzle ORM only for DB access — no raw SQL.
- Keep route handlers thin; business logic in `src/lib/`.

## 7. Development Workflow (schema/contract changes)

1. Schema change in `lib/db/src/schema/` → `pnpm --filter @workspace/db run push`
2. Update `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec run codegen`
3. Backend changes in `artifacts/api-server/src/routes` and `src/lib`
4. Frontend changes in `artifacts/urban-app`, consuming generated hooks
5. `pnpm run typecheck` before committing

## 8. Phase 0 Task Status

- **Task 0.1 (Session expiry / 401 handling)** — COMPLETE (commit `0ba24bc`,
  pushed to `origin/main`). Backend: `requireAuth` middleware returns 401 on
  missing/expired sessions, applied across `onboarding.ts`,
  `notifications.ts`, `auth.ts`, `providers.ts`, `subscriptions.ts`,
  `reviews.ts`, `bookings.ts`. Frontend: `setUnauthorizedHandler` interceptor
  in `customFetch`, registered in `context/auth.tsx`, triggers app-wide
  logout on any 401.
- **Follow-up blockers resolved this session**:
  - `URBAN-APP-TYPECHECK` — fixed (see `blockers.txt` / context files):
    - `app/_layout.tsx` — `useSegments()` cast to `string[]` (no generated
      typed routes in this checkout).
    - Orval `query?: UseQueryOptions<...>` (queryKey required) — fixed at
      the source via `lib/api-spec/orval.config.ts`
      (`override.query.version = 5`, since pnpm `catalog:` version strings
      can't be auto-detected by Orval), then regenerated codegen.
    - `BookingStatus` enum drift (`openapi.yaml` had
      `[upcoming, completed, cancelled]` vs DB enum
      `[pending, accepted, in_progress, completed, cancelled]`) — fixed in
      `openapi.yaml` (`Booking.status`, `UpdateBookingBody.status`) and
      regenerated.
    - `hooks/useProviderTracking.ts` — captured `activeJob` in a local
      `const job` before the async closure to fix the nullable-access error.
  - `API-SERVER-VITEST-WINDOWS` — see `blockers.txt`; addressed via CI
    workflow running tests on Linux (GitHub Actions).

## 9. Quality Gates (before any task is "done")

- Package-scoped `typecheck` passes for every workspace touched.
- `pnpm run typecheck:libs` passes if shared libs (`lib/*`) changed.
- Relevant Vitest suite passes (`@workspace/db`, `@workspace/api-server`) for
  changes touching `src/lib/dispatch.ts`, `src/lib/queue.ts`, or
  `lib/db/src/matcher.ts`.
- No `console.log` introduced in `artifacts/api-server` /
  `artifacts/urban-app`.
- Git commits: conventional, imperative subject (`fix:`, `feat:`, ...), body
  explains *why* not *what*.
