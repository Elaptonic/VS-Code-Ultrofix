/**
 * Exports the Express app as a plain request handler for serverless runtimes
 * (e.g. Vercel). Does NOT start an HTTP server or initialise Socket.IO —
 * those are handled by src/index.ts for the long-running Replit deployment.
 */
import app from "./app";

export default app;
