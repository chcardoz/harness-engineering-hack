/**
 * Convert the latest drizzle-kit generated SQL into an embedded TS module so the
 * schema can be applied without filesystem reads (works under Next bundling).
 * Run after `pnpm --filter @yougrep/db generate`.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'drizzle');
const file = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .at(-1);
if (!file) throw new Error('No .sql migration found. Run `pnpm generate` first.');

let sql = readFileSync(join(dir, file), 'utf8').replace(/-->\s*statement-breakpoint/g, '');
const out =
  `// AUTO-GENERATED from drizzle/${file}. Do not edit by hand.\n` +
  `// Regenerate: pnpm --filter @yougrep/db generate && pnpm --filter @yougrep/db embed.\n` +
  `export const INIT_SQL = ${JSON.stringify(sql)};\n`;
writeFileSync(join(process.cwd(), 'src/migrations.generated.ts'), out);
console.log(`[db:embed] wrote migrations.generated.ts from ${file}`);
