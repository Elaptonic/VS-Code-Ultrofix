# Code Analyst - Context & Progress

## Current Session
- Status: not yet started
- Last updated: (fill in on first run)

## Project Context
- Ultrofix monorepo: `artifacts/urban-app` (Expo/RN), `artifacts/api-server` (Express/Drizzle), shared libs under `lib/`

## Quick Checks
- Frontend: `pnpm --filter @workspace/urban-app run typecheck`
- Backend: `pnpm --filter @workspace/api-server run typecheck && pnpm --filter @workspace/api-server run test`
- Libs: `pnpm run typecheck:libs`
- Everything: `pnpm run typecheck`

## Review Checklist Reference
- See `.claude/agents/analyst.md` sections 3-4

## Token Tracking
- (none recorded yet)

## Current PRs Being Reviewed
- (none yet)

## Blockers to Monitor
- See `.claude/agents/blockers.txt`

## Previous Sessions Archive
- (none yet)
