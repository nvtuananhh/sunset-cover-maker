// main.ts — hands Sunset Cover Maker in: copies app/ + screenshots/ into
// the output directory and writes dossier.json + manifest.json there.
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader MAKEFUN_OUTPUT_DIR stands in for /output; inside it,
// /output is the default. Node 22 standard library only, no install step,
// deterministic: two runs write the same bytes (the manifest's build time
// is the one field that moves, and it is recorded, not compared).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const APP_DIR = join(REPO_ROOT, 'app');
const SHOTS_DIR = join(REPO_ROOT, 'screenshots');
const MAX_SHOT_BYTES = 262144;

/** Every file under a directory, relative POSIX paths, sorted. */
function listFiles(dir: string, base = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const rel = base === '' ? entry.name : `${base}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

/** The repo's HEAD sha, or 'unknown' when git cannot answer. */
function gitHead(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
}

function main(): void {
  // --- validate the inputs before writing anything -----------------------
  if (!existsSync(APP_DIR) || !statSync(APP_DIR).isDirectory()) {
    throw new Error('main.ts: app/ is missing: the entry is a directory of static files');
  }
  const indexHtml = join(APP_DIR, 'index.html');
  if (!existsSync(indexHtml) || !statSync(indexHtml).isFile()) {
    throw new Error('main.ts: app/index.html is missing');
  }
  if (!existsSync(SHOTS_DIR) || !statSync(SHOTS_DIR).isDirectory()) {
    throw new Error('main.ts: screenshots/ is missing');
  }
  const shots = listFiles(SHOTS_DIR).filter((f) => !f.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`main.ts: screenshots/ holds ${shots.length} images, need 3 or 4`);
  }
  for (const shot of shots) {
    const bytes = statSync(join(SHOTS_DIR, shot)).size;
    if (bytes > MAX_SHOT_BYTES) {
      throw new Error(`main.ts: screenshots/${shot} is ${bytes} bytes, over the ${MAX_SHOT_BYTES} allowed`);
    }
  }

  // --- copy the app and its screenshots ----------------------------------
  mkdirSync(OUT_DIR, { recursive: true });
  cpSync(APP_DIR, join(OUT_DIR, 'app'), { recursive: true });
  cpSync(SHOTS_DIR, join(OUT_DIR, 'screenshots'), { recursive: true });

  // --- manifest: file list + sizes + git HEAD + build time ---------------
  const appFiles = listFiles(join(OUT_DIR, 'app')).map((p) => ({
    path: `app/${p}`,
    bytes: statSync(join(OUT_DIR, 'app', p)).size,
  }));
  const shotFiles = shots.map((p) => ({
    path: `screenshots/${p}`,
    bytes: statSync(join(OUT_DIR, 'screenshots', p)).size,
  }));
  const manifest = {
    title: 'Sunset Cover Maker',
    competition: 'gta6-cover-art-01',
    gitHead: gitHead(),
    builtAt: new Date().toISOString(),
    files: [...appFiles, ...shotFiles],
    totalBytes: [...appFiles, ...shotFiles].reduce((n, f) => n + f.bytes, 0),
  };
  writeFileSync(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  // --- dossier: byte-for-byte what the kit library writes ----------------
  const dossier = buildDossier(OUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: MAX_SHOT_BYTES },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);

  console.log(`Sunset Cover Maker -> ${OUT_DIR}`);
  console.log(`  app files: ${appFiles.length}, screenshots: ${shotFiles.length}, git HEAD ${manifest.gitHead}`);
  console.log(`  dossier.json: ${dossier.length} bytes, manifest.json written`);
}

main();
