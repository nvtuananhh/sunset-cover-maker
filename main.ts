// Sunset Cover Maker — entry program (main.ts).
//
// Hands the built app to the grader: validates app/ and screenshots/,
// copies both trees into the output directory, writes manifest.json
// (file list, sizes, hashes, git HEAD, build time) and dossier.json
// (via vendor/makefun-app.ts buildDossier).
//
// DETERMINISM: this program's output is a pure function of the repo
// contents. The build time is the commit time of HEAD, never the wall
// clock, so two runs seconds apart write byte-identical output.
// There is no Date.now(), no new Date(), no Math.random() anywhere here.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SCREENSHOT_BYTES = 262144;
const FIXED_EPOCH = new Date(0).toISOString();

const TITLE =
  'Sunset Cover Maker — photographic GTA-style poster studio: pop-out hero, cast role tags, chrome titles, 3-size PNG export';

/** Commit time of HEAD as an ISO string, or the fixed epoch when git is unavailable. */
function gitCommitTime(): string {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(out)) return out;
    return FIXED_EPOCH;
  } catch {
    return FIXED_EPOCH;
  }
}

/** Short hash of HEAD, or 'unknown' when git is unavailable. */
function gitHead(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Copy a directory tree, entries in code-unit order, files only. */
function copyTree(src: string, dst: string, out: { path: string; bytes: number; sha256: string }[], prefix: string): void {
  mkdirSync(dst, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const from = join(src, entry.name);
    const to = join(dst, entry.name);
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      copyTree(from, to, out, rel);
    } else if (entry.isFile()) {
      const bytes = readFileSync(from);
      copyFileSync(from, to);
      out.push({ path: rel, bytes: bytes.length, sha256: sha256(bytes) });
    } else {
      throw new Error(`${rel}: not a plain file or directory`);
    }
  }
}

function fail(message: string): never {
  throw new Error(`main.ts: ${message}`);
}

function main(): void {
  const appDir = join(REPO_ROOT, 'app');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(join(appDir, 'index.html')) || !statSync(join(appDir, 'index.html')).isFile()) {
    fail('app/index.html is missing');
  }
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) fail('screenshots/ is missing');
  const shots = readdirSync(shotsDir)
    .filter((name) => /\.(?:jpg|jpeg|png)$/i.test(name))
    .sort();
  if (shots.length < 3 || shots.length > 4) fail(`screenshots/: expected 3 or 4 images, found ${shots.length}`);
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > MAX_SCREENSHOT_BYTES) fail(`screenshots/${name}: ${size} bytes, over the ${MAX_SCREENSHOT_BYTES} allowed`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const files: { path: string; bytes: number; sha256: string }[] = [];
  copyTree(appDir, join(OUTPUT_DIR, 'app'), files, 'app');
  copyTree(shotsDir, join(OUTPUT_DIR, 'screenshots'), files, 'screenshots');
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const manifest = {
    app: 'sunset-cover-maker',
    title: TITLE,
    gitHead: gitHead(),
    buildTime: gitCommitTime(),
    files,
  };
  writeFileSync(join(OUTPUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const dossier = buildDossier(OUTPUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);

  console.log(`Sunset Cover Maker -> ${OUTPUT_DIR}`);
  console.log(`files: ${files.length}, screenshots: ${shots.length}, gitHead: ${manifest.gitHead}`);
  console.log(`buildTime: ${manifest.buildTime}`);
  console.log(`dossier.json: ${dossier.length} bytes`);
}

main();
