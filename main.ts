// main.ts — Sunset Cover Maker hand-in program (Node 22, stdlib only).
// Validates the app, checks the screenshots, copies app/ + screenshots/ to
// the output directory and writes dossier.json via the kit's buildDossier.
// Deterministic: the manifest's build time is the HEAD commit's time, so two
// runs over the same commit write byte-identical output.
import { buildDossier } from './vendor/makefun-app.ts';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)));
const OUT = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const MAX_SCREENSHOT_BYTES = 256 * 1024;
const MAX_INDEX_BYTES = 1024 * 1024;

function fail(message: string): never {
  throw new Error(`main.ts: ${message}`);
}

function gitHead(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function gitCommitTime(): string {
  try {
    return execSync('git log -1 --format=%cI', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return new Date(0).toISOString();
  }
}

function listFiles(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(full, rel));
    else if (entry.isFile()) out.push(rel);
    else fail(`app/${rel}: not a plain file`);
  }
  return out.sort();
}

function copyTree(srcDir: string, dstDir: string): string[] {
  mkdirSync(dstDir, { recursive: true });
  const files = listFiles(srcDir, '');
  for (const rel of files) {
    const dst = join(dstDir, rel);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(join(srcDir, rel), dst);
  }
  return files;
}

function main(): void {
  const appDir = join(ROOT, 'app');
  const shotsDir = join(ROOT, 'screenshots');
  if (!existsSync(appDir) || !statSync(appDir).isDirectory()) fail('app/ is missing');
  const indexPath = join(appDir, 'index.html');
  if (!existsSync(indexPath)) fail('app/index.html is missing');
  if (statSync(indexPath).size > MAX_INDEX_BYTES) fail('app/index.html is over 1 MiB');

  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) fail('screenshots/ is missing');
  const shots = readdirSync(shotsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
  if (shots.length < 3 || shots.length > 4) fail(`screenshots/ holds ${shots.length} images, need 3 or 4`);
  for (const name of shots) {
    const st = statSync(join(shotsDir, name));
    if (st.size > MAX_SCREENSHOT_BYTES) fail(`screenshots/${name} is ${st.size} bytes, over 256 KiB`);
    const magic = readFileSync(join(shotsDir, name)).subarray(0, 3);
    const isJpeg = magic[0] === 0xff && magic[1] === 0xd8 && magic[2] === 0xff;
    const isPng = magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4e;
    if (!isJpeg && !isPng) fail(`screenshots/${name} is neither JPEG nor PNG`);
  }

  mkdirSync(OUT, { recursive: true });
  const appFiles = copyTree(appDir, join(OUT, 'app'));
  copyTree(shotsDir, join(OUT, 'screenshots'));

  const manifest = {
    app: 'Sunset Cover Maker',
    competition: 'gta6-cover-art-01',
    gitHead: gitHead(),
    buildTime: gitCommitTime(),
    files: appFiles.map((rel) => ({ path: `app/${rel}`, bytes: statSync(join(appDir, rel)).size })),
    screenshots: shots.map((name) => ({ path: `screenshots/${name}`, bytes: statSync(join(shotsDir, name)).size })),
  };
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const dossier = buildDossier(OUT, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(OUT, 'dossier.json'), dossier);
  console.log(`main.ts: wrote ${OUT} (app ${appFiles.length} files, ${shots.length} screenshots, dossier ${dossier.length} bytes)`);
}

main();
