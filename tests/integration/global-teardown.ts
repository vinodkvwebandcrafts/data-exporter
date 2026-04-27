import fs from "node:fs";
import path from "node:path";

const DB_FILE = path.join(__dirname, "test-app", "database", "test.db");

/**
 * Runs once after all test files. Removes the SQLite DB file produced during
 * the run. The Strapi instance itself is destroyed inside its own jest worker
 * via `afterAll`/process exit; we only clean filesystem artefacts here.
 */
export default async function globalTeardown(): Promise<void> {
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
  } catch {
    // best-effort cleanup
  }
}
