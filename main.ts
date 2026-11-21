/* main.ts — Sunset Cover Maker hand-in program.
   Validates app/ and screenshots/, copies them to the output
   directory, and writes dossier.json + manifest.json there.
   Deterministic: buildTime is the git HEAD commit time (never the
   wall clock), every directory walk is sorted, and the dossier comes
   from the kit's buildDossier. Standard library only. */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const REPO_DIR = resolve(process.cwd());

/** The commit time of git HEAD (ISO 8601), or the fixed epoch when git is unavailable. */
function gitCommitTime(): string {
  try {
    const out = execSync('git -C "' + REPO_DIR + '" log -1 --format=%cI', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const t = out.trim();
    if (t) return t;
  } catch {
    /* git unavailable: fall through to the fixed epoch below. */
  }
  return new Date(0).toISOString();
}

/** The short sha of git HEAD, or 'unknown' when git is unavailable. */
function gitHeadSha(): string {
  try {
    return execSync('git -C "' + REPO_DIR + '" rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
}

interface FileEntry {
  path: string;
  bytes: number;
}

/** Every file under a directory, in sorted path order. */
function listFiles(dir: string, base: string): FileEntry[] {
  const out: FileEntry[] = [];
  const walk = (rel: string): void => {
    const entries = readdirSync(join(dir, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      const p = rel === '' ? e.name : rel + '/' + e.name;
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push({ path: p, bytes: statSync(join(dir, p)).size });
    }
  };
  walk(base);
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

function copyTree(srcDir: string, dstDir: string, files: FileEntry[]): void {
  for (const f of files) {
    const dst = join(dstDir, f.path);
    mkdirSync(join(dst, '..'), { recursive: true });
    copyFileSync(join(srcDir, f.path), dst);
  }
}

function main(): void {
  const appDir = join(REPO_DIR, 'app');
  const shotsDir = join(REPO_DIR, 'screenshots');
  if (!existsSync(join(appDir, 'index.html'))) throw new Error('app/index.html is missing');
  if (!statSync(join(appDir, 'index.html')).isFile()) throw new Error('app/index.html is not a file');

  const shotFiles = listFiles(shotsDir, '');
  if (shotFiles.length < 3 || shotFiles.length > 4) throw new Error('screenshots/ must hold 3 or 4 images, found ' + shotFiles.length);
  for (const f of shotFiles) {
    if (f.bytes > 262144) throw new Error('screenshot ' + f.path + ' is ' + f.bytes + ' bytes, over the 256 KiB cap');
    if (!/\.(png|jpe?g)$/i.test(f.path)) throw new Error('screenshot ' + f.path + ' is not a PNG or JPEG');
  }

  const appFiles = listFiles(appDir, '');
  const manifest = {
    title: 'Sunset Cover Maker',
    head: gitHeadSha(),
    buildTime: gitCommitTime(),
    app: appFiles,
    screenshots: shotFiles,
    appTotalBytes: appFiles.reduce((n, f) => n + f.bytes, 0),
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyTree(appDir, join(OUTPUT_DIR, 'app'), appFiles);
  copyTree(shotsDir, join(OUTPUT_DIR, 'screenshots'), shotFiles);
  writeFileSync(join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  const dossier = buildDossier(OUTPUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  console.log('Sunset Cover Maker: wrote ' + appFiles.length + ' app files and ' + shotFiles.length + ' screenshots to ' + OUTPUT_DIR + ' (head ' + manifest.head + ', buildTime ' + manifest.buildTime + ')');
}

main();
