/**
 * Vercel serverless entry point.
 *
 * Imports the pre-built Express handler from dist/handler.mjs so Vercel
 * never needs to compile TypeScript itself — esbuild handles that during
 * the build step (pnpm run build → node ./build.mjs).
 *
 * Required environment variables in your Vercel project:
 *   DATABASE_URL   – PostgreSQL connection string
 *   JWT_SECRET     – Secret used to sign session tokens
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *                  – Firebase Admin credentials for token verification
 *
 * Optional:
 *   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET  – payment gateway
 *   EXPO_ACCESS_TOKEN                      – push notifications
 *
 * NOTE: Socket.IO runs in HTTP long-polling mode on Vercel (serverless
 * functions cannot hold persistent WebSocket connections). Real-time
 * features still work — just with slightly higher latency.
 */

// Dynamic import so Node.js treats this file as ESM-compatible.
const { default: app } = await import("../dist/handler.mjs");

export default app;
