# Ultrofix

Ultrofix is a home-services marketplace: a consumer/provider mobile app (Expo/React Native) backed by an Express 5 + PostgreSQL + Drizzle API, with real-time vendor dispatch over Socket.IO.

## Tech Stack

- **Monorepo**: pnpm workspaces (Node 24, TypeScript 5.9, strict mode)
- **Mobile app**: Expo 54 / React Native 0.81, Expo Router 6 (file-based routing), React 19
- **API**: Express 5, Socket.IO 4.8, pino / pino-http logging
- **Database**: PostgreSQL via Drizzle ORM (+ `drizzle-zod`)
- **Validation**: Zod (`zod/v4`)
- **API contract**: OpenAPI spec (`lib/api-spec`) → Orval codegen → typed Zod schemas (`lib/api-zod`) + React Query hooks (`lib/api-client-react`)
- **Auth**: Firebase Phone OTP, ID tokens verified server-side via JWKS (`jose`), opaque session tokens stored in Postgres
- **Payments**: Stripe + Razorpay
- **Build**: esbuild (API server), Expo CLI (mobile), Vite (mockup-sandbox)
- **Testing**: Vitest

## Workspace Layout

| Path | Package | Purpose |
|---|---|---|
| `artifacts/api-server` | `@workspace/api-server` | Express API + Socket.IO server |
| `artifacts/urban-app` | `@workspace/urban-app` | Expo/React Native consumer + provider app |
| `artifacts/mockup-sandbox` | `@workspace/mockup-sandbox` | Vite-based UI sandbox/prototyping |
| `lib/db` | `@workspace/db` | Drizzle schema, DB connection, vendor matcher |
| `lib/api-zod` | `@workspace/api-zod` | Generated Zod schemas (from OpenAPI) |
| `lib/api-client-react` | `@workspace/api-client-react` | Generated React Query hooks |
| `lib/api-spec` | `@workspace/api-spec` | OpenAPI spec + Orval codegen config |
| `scripts` | `@workspace/scripts` | One-off TS scripts |

## Common Commands

Root:
- `pnpm run typecheck` — typecheck shared libs, then all artifacts/scripts
- `pnpm run typecheck:libs` — `tsc --build` for shared libs only
- `pnpm run build` — typecheck + build all packages

API server (`artifacts/api-server`):
- `pnpm --filter @workspace/api-server run dev` — build + start (`NODE_ENV=development`)
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/api-server run test` — Vitest

Mobile app (`artifacts/urban-app`):
- `pnpm --filter @workspace/urban-app run dev` — Expo dev server
- `pnpm --filter @workspace/urban-app run typecheck`
- `pnpm --filter @workspace/urban-app run build` / `run serve`

DB (`lib/db`):
- `pnpm --filter @workspace/db run push` — `drizzle-kit push` (dev only)
- `pnpm --filter @workspace/db run test` — Vitest (matcher tests)

API contract codegen:
- `pnpm --filter @workspace/api-spec run codegen` — regenerate `lib/api-zod` and `lib/api-client-react` from `lib/api-spec/openapi.yaml`

## Architecture Notes

- **Auth**: Firebase Phone OTP → ID token → `POST /auth/firebase-verify` (verified via JWKS in `src/lib/firebaseVerify.ts`, no service account needed) → opaque session token stored in the `sessions` table, returned to the client and persisted in `expo-secure-store`. `src/middlewares/authMiddleware.ts` resolves the session on every request.
- **Vendor dispatch**: On `POST /bookings`, `assignNearestProvider` (`lib/db/src/matcher.ts`, haversine) finds the nearest online vendor from `vendorSockets` and emits `NEW_LEAD` over Socket.IO (path `/api/socket.io`). If no vendor is online, falls back to the in-memory `bookingQueue` (`src/lib/queue.ts`, 4s auto-accept).
- **DB seeding**: `src/lib/seed.ts` runs idempotently on server start.
- **Roles**: users are `consumer` or `provider`; the mobile app gates navigation and exposes a role switch from the Profile screen.

## File Structure Reference

```
artifacts/api-server/src/
  app.ts            Express app + middleware chain
  index.ts          Entry point (HTTP server, Socket.IO init, DB seed)
  routes/           auth, bookings, services, providers, profile, onboarding,
                     stats, subscriptions, notifications, reviews, payments, places, health
  lib/              auth, dispatch, firebaseVerify, socket, queue, seed, push, razorpay,
                     io-instance, logger, timers, constants
  middlewares/      authMiddleware.ts
  __tests__/        dispatch.test.ts

artifacts/urban-app/
  app/              Expo Router routes ((tabs)/, vendor/(tabs)/, service/[id], booking/[id], ...)
  components/       BookingCard, ServiceCard, ProviderCard, CategoryCard, LocationTracker, ...
  hooks/            useSocket, usePushNotifications, useProviderProfile/Stats/Tracking, useColors
  context/auth.tsx  Firebase auth context (dual consumer/provider roles)
  lib/firebaseWeb.ts  Web/Expo Go Firebase JS SDK helpers

lib/db/src/schema/  auth, bookings, services, providers, profiles, reviews,
                     notifications, lead-dispatch-attempts, vendor-subscriptions
lib/api-zod/src/generated/  Orval-generated Zod schemas + API operations
```

## Development Workflow

1. Make schema changes in `lib/db/src/schema/`, then `pnpm --filter @workspace/db run push`.
2. Update `lib/api-spec/openapi.yaml`, then `pnpm --filter @workspace/api-spec run codegen` to regenerate `lib/api-zod` and `lib/api-client-react`.
3. Implement backend changes in `artifacts/api-server/src/routes` and `src/lib`.
4. Implement UI changes in `artifacts/urban-app`, consuming generated hooks from `@workspace/api-client-react`.
5. Run `pnpm run typecheck` before committing.

## Agent Guidelines

### Token Efficiency
- Don't restate the task or narrate reasoning in output.
- Keep responses focused on the diff and the result, not the process.

### Output Format
- Use `file_path:line_number` references for code locations.
- Prefer editing existing files over creating new ones.

### Error Handling Standards
- All async route handlers and Socket.IO event handlers must wrap logic in try/catch and respond with a consistent error envelope (matches `errorEnvelope` in `lib/api-zod`).
- Never swallow errors silently — log via `pino` (`src/lib/logger.ts`) with enough context to debug.

### Testing Requirements
- New backend logic touching `src/lib/dispatch.ts`, `src/lib/queue.ts`, or `lib/db/src/matcher.ts` needs Vitest coverage (`pnpm --filter @workspace/db run test`, `pnpm --filter @workspace/api-server run test`).
- Run the relevant `typecheck` for any workspace you touch before considering work done.

### Code Quality Standards
- Match existing patterns: Drizzle for all DB access (no raw SQL), Zod schemas from `lib/api-zod` for request/response validation, React Query hooks from `lib/api-client-react` on the client.
- Keep route handlers thin; business logic lives in `src/lib/`.

### Git Commit Message Format
- Conventional, imperative subject line (e.g. `fix: handle vendor dispatch timeout`, `feat: add provider rating endpoint`).
- Body explains *why*, not *what* — the diff already shows what changed.

### Type Checking Requirements
- `pnpm run typecheck` must pass before a change is considered complete. Run the package-scoped `typecheck` for faster iteration during development.

### No-Compromise Rules
- No `console.log` in `artifacts/api-server` or `artifacts/urban-app` production code — use `pino` (`src/lib/logger.ts`) on the backend.
- No hardcoded secrets, API keys, or environment-specific URLs — use `process.env` / Expo env config.
- No bypassing `authMiddleware` or duplicating session-validation logic.
- No editing generated files under `lib/api-zod/src/generated/` or `lib/api-client-react` by hand — regenerate via Orval.
