// make-samples.mjs — generates the two built-in sample photos for Sunset Cover
// Maker. Original art drawn in code: gradient sunset sky, sun, skyline and palm
// silhouettes, and a person silhouette. Writes PNGs with a tiny hand-rolled
// encoder (zlib deflate via node:zlib), no image library, no external assets.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 900;
const H = 1200;

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function writePng(path, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    rgb.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
  return png.length;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// Deterministic pseudo-random for windows / grain.
function rnd(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function paintScene(opts) {
  const rgb = Buffer.alloc(W * H * 3);
  const { top, mid, low, sunX, sunY, sunR, seed, palms, person } = opts;
  const rand = rnd(seed);
  // Skyline: pre-roll building heights so windows can be deterministic.
  const buildings = [];
  let bx = -20;
  while (bx < W + 20) {
    const bw = 70 + rand() * 110;
    const bh = 180 + rand() * 320;
    buildings.push({ x: bx, w: bw, h: bh, lit: rand() });
    bx += bw + 8 + rand() * 26;
  }
  const horizon = H * 0.72;
  for (let y = 0; y < H; y++) {
    const t = y / H;
    let col;
    if (t < 0.45) col = mix(top, mid, t / 0.45);
    else col = mix(mid, low, (t - 0.45) / 0.55);
    // Sun glow.
    const dx = 0; // per-pixel below
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - sunX, y - sunY);
      let c = col;
      if (d < sunR * 3.2) {
        const g = Math.max(0, 1 - d / (sunR * 3.2));
        c = mix(c, [255, 236, 170], g * g * 0.75);
      }
      if (d < sunR) c = mix(c, [255, 244, 205], 0.9);
      const i = (y * W + x) * 3;
      rgb[i] = c[0];
      rgb[i + 1] = c[1];
      rgb[i + 2] = c[2];
    }
  }
  // Skyline silhouettes.
  const sil = [26, 14, 42];
  for (const b of buildings) {
    const topY = horizon - b.h;
    for (let y = Math.max(0, Math.floor(topY)); y < horizon; y++) {
      for (let x = Math.max(0, Math.floor(b.x)); x < Math.min(W, b.x + b.w); x++) {
        const i = (y * W + x) * 3;
        rgb[i] = sil[0];
        rgb[i + 1] = sil[1];
        rgb[i + 2] = sil[2];
      }
    }
    // Lit windows.
    for (let wy = topY + 14; wy < horizon - 12; wy += 26) {
      for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 22) {
        if (rand() < 0.22) {
          for (let yy = 0; yy < 9; yy++) {
            for (let xx = 0; xx < 7; xx++) {
              const px = Math.floor(wx + xx);
              const py = Math.floor(wy + yy);
              if (px < 0 || px >= W || py < 0 || py >= H) continue;
              const i = (py * W + px) * 3;
              rgb[i] = 255;
              rgb[i + 1] = 190;
              rgb[i + 2] = 90;
            }
          }
        }
      }
    }
  }
  // Ground / street band.
  for (let y = Math.floor(horizon); y < H; y++) {
    const t = (y - horizon) / (H - horizon);
    const c = mix([52, 22, 52], [16, 8, 26], t);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      rgb[i] = c[0];
      rgb[i + 1] = c[1];
      rgb[i + 2] = c[2];
    }
  }
  // Palm silhouettes: curved trunks + drooping fronds.
  function palm(px, py, s, lean) {
    const dark = [12, 8, 20];
    const set = (x, y) => {
      const ix = Math.round(x);
      const iy = Math.round(y);
      if (ix < 0 || ix >= W || iy < 0 || iy >= H) return;
      const i = (iy * W + ix) * 3;
      rgb[i] = dark[0];
      rgb[i + 1] = dark[1];
      rgb[i + 2] = dark[2];
    };
    for (let t = 0; t <= 1; t += 0.01) {
      const x = px + lean * t * t * 90 * s + Math.sin(t * 2) * 4;
      const y = py - t * 260 * s;
      for (let d = -3; d <= 3; d++) set(x + d, y);
      for (let d = -2; d <= 2; d++) set(x, y + d);
    }
    const topX = px + lean * 90 * s;
    const topY = py - 260 * s;
    for (let f = 0; f < 7; f++) {
      const ang = (-Math.PI * 0.15) + (f / 6) * Math.PI * 1.3;
      for (let t = 0; t <= 1; t += 0.02) {
        const x = topX + Math.cos(ang) * t * 120 * s + Math.sin(t * 3) * 6;
        const y = topY + Math.sin(ang) * t * 70 * s + t * t * 55 * s;
        set(x, y);
        set(x + 1, y);
      }
    }
  }
  for (const p of palms) palm(p[0], p[1], p[2], p[3]);
  // Person silhouette: head, shoulders, torso, legs.
  if (person) {
    const { cx, base, s } = person;
    const dark = [10, 6, 18];
    const set = (x, y) => {
      const ix = Math.round(x);
      const iy = Math.round(y);
      if (ix < 0 || ix >= W || iy < 0 || iy >= H) return;
      const i = (iy * W + ix) * 3;
      rgb[i] = dark[0];
      rgb[i + 1] = dark[1];
      rgb[i + 2] = dark[2];
    };
    const headR = 34 * s;
    const headY = base - 330 * s;
    for (let y = headY - headR; y <= headY + headR; y++) {
      for (let x = cx - headR; x <= cx + headR; x++) {
        if (Math.hypot(x - cx, y - headY) <= headR) set(x, y);
      }
    }
    // Torso tapering down, legs apart.
    for (let y = headY + headR * 0.7; y < base; y++) {
      const t = (y - headY) / (base - headY);
      const half = (26 + t * 22) * s;
      const spread = t > 0.72 ? (t - 0.72) * 160 * s : 0;
      for (let x = cx - half - spread; x <= cx + half + spread; x++) {
        if (spread > 0 && Math.abs(x - cx) < spread * 0.55) continue;
        set(x, y);
      }
    }
  }
  return rgb;
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'samples');
const n1 = writePng(
  join(dir, 'boulevard.png'),
  paintScene({
    top: [58, 32, 120], mid: [214, 74, 110], low: [255, 158, 74],
    sunX: 450, sunY: 560, sunR: 95, seed: 7,
    palms: [[90, 1080, 1.1, -1], [820, 1100, 1.25, 1]],
    person: { cx: 450, base: 1180, s: 1 },
  }),
);
const n2 = writePng(
  join(dir, 'pier.png'),
  paintScene({
    top: [18, 24, 88], mid: [150, 48, 140], low: [255, 120, 90],
    sunX: 300, sunY: 480, sunR: 80, seed: 42,
    palms: [[760, 1060, 1.0, 1], [130, 1120, 0.85, -1]],
    person: { cx: 620, base: 1170, s: 0.9 },
  }),
);
console.log(`samples written: boulevard.png ${n1} bytes, pier.png ${n2} bytes`);
