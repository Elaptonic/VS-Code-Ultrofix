# Frontend Agent - Context & Progress

## Current Session
- Status: Task 0.1 (Session Expiry 401 interceptor) complete
- Last updated: 2026-06-15

## Project Context
- App: Ultrofix consumer/provider marketplace (Expo/React Native, `artifacts/urban-app`)
- Stack: Expo 54, React Native 0.81, React 19, Expo Router 6, React Query (`@workspace/api-client-react`), Firebase Phone OTP auth, Socket.IO client

## Latest Build Info
- `pnpm --filter @workspace/urban-app run typecheck` — PASSES (2026-06-15). The 9 pre-existing errors found on this machine's first-ever full typecheck have all been fixed; see blockers.txt for details (URBAN-APP-TYPECHECK resolved).

## Completed Tasks
- Task 0.1 (Session Expiry 401 interceptor): added a module-level `_unauthorizedHandler` + `setUnauthorizedHandler()` to `lib/api-client-react/src/custom-fetch.ts` (mirrors the existing `_authTokenGetter`/`setAuthTokenGetter` pattern), invoked whenever any `customFetch` response is a 401. Exported from `lib/api-client-react/src/index.ts`. Registered in `artifacts/urban-app/context/auth.tsx` (inside `AuthProvider`, via `useEffect`): on 401, clears `AUTH_TOKEN_KEY` from SecureStore and calls `setUser(null)`, which makes `AuthGate` (`app/_layout.tsx`) redirect to `/login` automatically — so ANY screen using a generated `@workspace/api-client-react` hook now gets app-wide logout-on-expiry for free.

## Active Dependencies
- See `.claude/agents/blockers.txt`

## Code Patterns Used
- Screens under `app/` via Expo Router; shared UI in `components/`; data access via generated hooks in `@workspace/api-client-react`; auth via `useAuth()` (`context/auth.tsx`)

## Notes for Next Session
- All pre-existing typecheck errors resolved (see blockers.txt: URBAN-APP-TYPECHECK). Root causes were in `lib/api-spec/orval.config.ts` (Orval query version detection) and `lib/api-spec/openapi.yaml` (`BookingStatus` enum drift vs DB schema) — fixed via codegen, not hand-edits to generated files.
