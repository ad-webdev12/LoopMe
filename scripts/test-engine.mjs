// Runs the detector test suite with plain Node (no jest needed).
// Node's --experimental-strip-types requires explicit .ts import extensions,
// while Metro wants them extensionless — so we copy the engine to a temp dir
// and add the extensions there.
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const engineDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'engine');
const work = mkdtempSync(join(tmpdir(), 'lmi-engine-'));
cpSync(engineDir, work, { recursive: true });
for (const f of readdirSync(work)) {
  if (!f.endsWith('.ts')) continue;
  const p = join(work, f);
  writeFileSync(p, readFileSync(p, 'utf8').replace(/from '(\.\/[^']+?)'/g, (m, s) => s.endsWith('.ts') ? m : `from '${s}.ts'`));
}
const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', join(work, 'ScamDetector.test.ts')], { stdio: 'inherit' });
process.exit(r.status ?? 1);
