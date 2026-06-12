import { defineConfig } from 'vitest/config';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Create a fresh temp directory for each test run so PGlite always starts clean.
const pgliteDir = mkdtempSync(join(tmpdir(), 'yougrep-test-'));

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['packages/**/src/__tests__/**/*.test.ts'],
    env: {
      PGLITE_DATA_DIR: pgliteDir,
      NODE_ENV: 'test',
      INTEGRATIONS_MODE: 'stub',
    },
    // Run all tests in the same worker (required: PGlite is single-connection per dir).
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
