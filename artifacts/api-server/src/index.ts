import app from "./app";
import { logger } from "./lib/logger";
import { initAuth } from "./lib/auth";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Resolve JWT secret before accepting requests:
//   1. process.env.JWT_SECRET (Replit Secret or CI)
//   2. persisted value in Replit Postgres app_config table
//   3. auto-generated on first run (then persisted)
initAuth()
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err: unknown) => {
    logger.error({ err }, "Failed to initialise auth — aborting startup");
    process.exit(1);
  });
