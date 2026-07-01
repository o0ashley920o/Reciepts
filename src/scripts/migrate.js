/**
 * migrate.js — Schema migration runner for offline IndexedDB storage.
 *
 * Migrations are keyed by integer version. Each migration function receives
 * the current stored data and returns nothing (mutations are done in-place via
 * the store helpers passed in). The runner persists the applied version so
 * upgrades are idempotent across browser sessions.
 *
 * Usage: call runMigrations(storeHelpers) once during initialiseStorage().
 */

import { DB_VERSION, STORE_NAMES } from './schema.js';

/**
 * Each entry is { version: number, up: async (helpers) => void }.
 * Add new objects here for future schema upgrades.
 */
const MIGRATIONS = [
  {
    version: 1,
    async up(helpers) {
      // Baseline v1: ensure lookups and settings stores are initialised.
      // No structural changes needed — initialiseStorage() already seeds them.
      // This entry exists so later migrations can rely on v1 as a starting point.
      const meta = await helpers.getMeta();
      if (!meta.migratedAt) {
        await helpers.setMeta({ ...meta, migratedAt: new Date().toISOString() });
      }
    },
  },
];

/**
 * Run any pending migrations in order.
 *
 * @param {{ getMeta: () => Promise<object>, setMeta: (object) => Promise<void> }} helpers
 */
export async function runMigrations(helpers) {
  let meta;
  try {
    meta = (await helpers.getMeta()) ?? {};
  } catch {
    meta = {};
  }

  const appliedVersion = Number(meta[STORE_NAMES.META] ?? meta.schemaVersion ?? 0);

  for (const migration of MIGRATIONS) {
    if (migration.version <= appliedVersion) continue;
    try {
      await migration.up(helpers);
      meta.schemaVersion = migration.version;
      await helpers.setMeta(meta);
    } catch (error) {
      console.error(`Migration v${migration.version} failed:`, error);
      // Non-fatal: log and continue so the app can still open.
    }
  }

  // Ensure the stored version reflects the current DB_VERSION even if no
  // migration steps ran (e.g. fresh install that was seeded directly).
  if ((meta.schemaVersion ?? 0) < DB_VERSION) {
    meta.schemaVersion = DB_VERSION;
    try {
      await helpers.setMeta(meta);
    } catch {
      // Ignore — metastore write failure is non-fatal.
    }
  }
}
