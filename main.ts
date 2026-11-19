// main.ts — Sunset Cover Maker's submission program (Node 22, stdlib only).
// Validates the entry, copies app/ + screenshots/ to the output directory and
// writes /output/dossier.json via buildDossier from ./vendor/makefun-app.ts.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { buildDossier } from './vendor/makefun-app.ts';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SCREENSHOT_BYTES = 256 * 1024;

function fail(message: string): never {
  throw new Error(`main.ts: ${message}`);
}

function gitHead(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
}

function listFiles(root: string, base = ''): { path: string; bytes: number }[] {
  const out: { path: string; bytes: number }[] = [];
  for (const entry of readdirSync(join(root, base), { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(root, rel));
    else if (entry.isFile()) out.push({ path: rel, bytes: statSync(join(root, rel)).size });
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : 1));
}

function main(): void {
  const repo = process.cwd();
  const appDir = join(repo, 'app');
  const shotsDir = join(repo, 'screenshots');
  if (!existsSync(appDir) || !statSync(appDir).isDirectory()) fail('app/ is missing');
  if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) fail('screenshots/ is missing');

  // Every screenshot must exist and fit the 256 KiB cap.
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.')).sort();
  if (shots.length < 3 || shots.length > 4) fail(`screenshots/ holds ${shots.length} images, need 3 or 4`);
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > MAX_SCREENSHOT_BYTES) fail(`screenshots/${name} is ${size} bytes, over ${MAX_SCREENSHOT_BYTES}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  cpSync(appDir, join(OUTPUT_DIR, 'app'), { recursive: true });
  cpSync(shotsDir, join(OUTPUT_DIR, 'screenshots'), { recursive: true });

  const dossier = buildDossier(OUTPUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);

  const manifest = {
    title: 'Sunset Cover Maker — GTA 6-style multi-panel cover art from your photos',
    gitHead: gitHead(),
    builtAt: new Date().toISOString(),
    appFiles: listFiles(join(OUTPUT_DIR, 'app')),
    screenshots: shots.map((name) => ({ name, bytes: statSync(join(shotsDir, name)).size })),
    dossierBytes: dossier.length,
  };
  writeFileSync(join(OUTPUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Sunset Cover Maker: ${manifest.appFiles.length} app files, ${shots.length} screenshots, dossier ${dossier.length} bytes -> ${OUTPUT_DIR}`);
}

main();
