# Backend Agent - Context & Progress

## Current Session
- Status: not yet started
- Last updated: (fill in on first run)

## Project Context
- API: Ultrofix Express 5 + Socket.IO server (`artifacts/api-server`)
- Stack: Express 5, Drizzle ORM (`@workspace/db`), Zod (`@workspace/api-zod`), Firebase JWKS auth, Stripe/Razorpay, pino logging

## Latest Build Info
- (record last successful `pnpm --filter @workspace/api-server run typecheck` / `run test` here)

## Database Schema Reference
- `lib/db/src/schema/`: auth (sessions), bookings, services, providers, profiles, reviews, notifications, lead-dispatch-attempts, vendor-subscriptions
- Matcher: `lib/db/src/matcher.ts` (haversine nearest-provider)

## Completed Tasks
- (none yet)

## Active Dependencies
- See `.claude/agents/blockers.txt`

## API Patterns Used
- Routes in `src/routes/`, business logic in `src/lib/`, validation via `@workspace/api-zod`, auth via `src/middlewares/authMiddleware.ts`

## Notes for Next Session
- (none yet)
