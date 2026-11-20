// Sunset Cover Maker — entry program (main.ts).
// Copies app/ and screenshots/ into the output directory and writes
// /output/dossier.json with buildDossier from ./vendor/makefun-app.ts.
// Standard library only, deterministic: the same input tree always
// produces the same dossier.json bytes (no timestamps inside the dossier;
// the manifest carries the build time separately, so re-runs of this
// program agree on dossier.json byte for byte).
import { buildDossier } from './vendor/makefun-app.ts';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const OUT = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const ROOT = resolve(import.meta.dirname || '.');

function fail(message) {
  console.error('main.ts: ' + message);
  process.exit(1);
}

function listFiles(dir, base) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const rel = base ? base + '/' + name : name;
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listFiles(full, rel));
    else if (st.isFile()) out.push({ path: rel, bytes: st.size });
  }
  return out;
}

function gitHead() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function main() {
  const appDir = join(ROOT, 'app');
  const shotsDir = join(ROOT, 'screenshots');
  if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
  if (!statSync(join(appDir, 'index.html')).isFile()) fail('app/index.html is not a file');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
  if (shots.length < 3 || shots.length > 4) fail('screenshots/ must hold 3 or 4 images, found ' + shots.length);
  for (const name of shots) {
    const full = join(shotsDir, name);
    if (!statSync(full).isFile()) fail('screenshots/' + name + ' is not a file');
    const size = statSync(full).size;
    if (size > 262144) fail('screenshots/' + name + ' is ' + size + ' bytes, over the 256 KiB cap');
    const magic = readFileSync(full).subarray(0, 3);
    const isJpeg = magic[0] === 0xff && magic[1] === 0xd8 && magic[2] === 0xff;
    const isPng = magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4e;
    if (!isJpeg && !isPng) fail('screenshots/' + name + ' is neither JPEG nor PNG');
  }

  mkdirSync(OUT, { recursive: true });
  mkdirSync(join(OUT, 'app'), { recursive: true });
  mkdirSync(join(OUT, 'screenshots'), { recursive: true });
  cpSync(appDir, join(OUT, 'app'), { recursive: true });
  cpSync(shotsDir, join(OUT, 'screenshots'), { recursive: true });

  const dossier = buildDossier(OUT, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(OUT, 'dossier.json'), dossier);

  const manifest = {
    app: 'Sunset Cover Maker',
    competition: 'gta6-cover-art-01',
    gitHead: gitHead(),
    buildTime: new Date().toISOString(),
    files: listFiles(join(OUT, 'app'), 'app'),
    screenshots: shots.map((name) => ({ path: 'screenshots/' + name, bytes: statSync(join(OUT, 'screenshots', name)).size })),
    dossierBytes: dossier.length,
  };
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('main.ts: wrote ' + OUT + ' (dossier ' + dossier.length + ' bytes, ' + shots.length + ' screenshots, head ' + manifest.gitHead.slice(0, 12) + ')');
}

main();
