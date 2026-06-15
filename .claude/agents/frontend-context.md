# Frontend Agent - Context & Progress

## Current Session
- Status: Task 0.1 (Session Expiry 401 interceptor) complete
- Last updated: 2026-06-15

## Project Context
- App: Ultrofix consumer/provider marketplace (Expo/React Native, `artifacts/urban-app`)
- Stack: Expo 54, React Native 0.81, React 19, Expo Router 6, React Query (`@workspace/api-client-react`), Firebase Phone OTP auth, Socket.IO client

## Latest Build Info
- `pnpm --filter @workspace/urban-app run typecheck` — fails, but NOT due to Task 0.1 (the files this task touched typecheck clean). 9 pre-existing errors across 5 files surfaced on this machine's first-ever full typecheck (deps were never installed before now). See blockers.txt for the list — needs its own task.

## Completed Tasks
- Task 0.1 (Session Expiry 401 interceptor): added a module-level `_unauthorizedHandler` + `setUnauthorizedHandler()` to `lib/api-client-react/src/custom-fetch.ts` (mirrors the existing `_authTokenGetter`/`setAuthTokenGetter` pattern), invoked whenever any `customFetch` response is a 401. Exported from `lib/api-client-react/src/index.ts`. Registered in `artifacts/urban-app/context/auth.tsx` (inside `AuthProvider`, via `useEffect`): on 401, clears `AUTH_TOKEN_KEY` from SecureStore and calls `setUser(null)`, which makes `AuthGate` (`app/_layout.tsx`) redirect to `/login` automatically — so ANY screen using a generated `@workspace/api-client-react` hook now gets app-wide logout-on-expiry for free.

## Active Dependencies
- See `.claude/agents/blockers.txt`

## Code Patterns Used
- Screens under `app/` via Expo Router; shared UI in `components/`; data access via generated hooks in `@workspace/api-client-react`; auth via `useAuth()` (`context/auth.tsx`)

## Notes for Next Session
- The pre-existing typecheck errors (see blockers.txt) are mostly generated React Query hook option types (`UseQueryOptions` missing `queryKey`) — likely an Orval/`@tanstack/react-query` version mismatch in `lib/api-client-react/src/generated/api.ts`, plus one `BookingStatus` enum mismatch and one nullable-access bug. None block Task 0.1.
