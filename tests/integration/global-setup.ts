import fs from "node:fs";
import path from "node:path";

const DB_FILE = path.join(__dirname, "test-app", "database", "test.db");

/**
 * Runs once before any test files. Removes any leftover SQLite DB so each
 * `yarn test:integration` invocation starts from a clean slate. The actual
 * Strapi boot happens lazily inside each test process via `startStrapi()`,
 * because jest's `globalSetup` runs in a separate Node context whose module
 * state is not visible to the test workers.
 */
export default async function globalSetup(): Promise<void> {
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
  } catch {
    // best-effort cleanup
  }
}
