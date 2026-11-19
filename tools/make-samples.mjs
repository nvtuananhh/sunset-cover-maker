// tools/make-samples.mjs — generates the two built-in sample photos for
// Sunset Cover Maker as PNGs, drawn entirely in code (no real-person photo,
// no game art). Pure Node: a tiny RGBA canvas + a hand-rolled PNG encoder
// (zlib deflate, CRC32). Deterministic: same seed, same bytes every run.
//
//   node tools/make-samples.mjs
// writes app/samples/boulevard.png and app/samples/pier.png (1080 x 1350).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'app', 'samples');
const W = 1080;
const H = 1350;

// ------------------------------------------------------------------ rng
// mulberry32: a small seeded PRNG so both scenes are byte-stable.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ canvas
class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Uint8ClampedArray(w * h * 4);
  }
  set(x, y, r, g, b, a = 255) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = r;
    this.px[i + 1] = g;
    this.px[i + 2] = b;
    this.px[i + 3] = a;
  }
  // Alpha-blend a colour over the pixel.
  blend(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 4;
    const s = a / 255;
    this.px[i] = r * s + this.px[i] * (1 - s);
    this.px[i + 1] = g * s + this.px[i + 1] * (1 - s);
    this.px[i + 2] = b * s + this.px[i + 2] * (1 - s);
    this.px[i + 3] = 255;
  }
  fillRect(x0, y0, x1, y1, [r, g, b], a = 255) {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(this.w, x1); x++) this.blend(x, y, r, g, b, a);
    }
  }
  // Vertical gradient between colour stops [[t, [r,g,b]], ...].
  vgrad(stops) {
    for (let y = 0; y < this.h; y++) {
      const t = y / (this.h - 1);
      let a = stops[0];
      let b = stops[stops.length - 1];
      for (let s = 0; s < stops.length - 1; s++) {
        if (t >= stops[s][0] && t <= stops[s + 1][0]) {
          a = stops[s];
          b = stops[s + 1];
          break;
        }
      }
      const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      const c = a[1].map((v, i) => Math.round(v + (b[1][i] - v) * f));
      for (let x = 0; x < this.w; x++) this.set(x, y, c[0], c[1], c[2]);
    }
  }
  disc(cx, cy, rad, [r, g, b], a = 255) {
    for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) {
      for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= rad) this.blend(x, y, r, g, b, a);
      }
    }
  }
  // Soft disc: alpha falls off with distance (for sun glow).
  glow(cx, cy, rad, [r, g, b], peak) {
    for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) {
      for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
        const d = Math.hypot(x - cx, y - cy) / rad;
        if (d < 1) this.blend(x, y, r, g, b, Math.round(peak * (1 - d) * (1 - d)));
      }
    }
  }
  // Thick line drawn as a chain of discs.
  line(x0, y0, x1, y1, w, [r, g, b], a = 255) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, [r, g, b], a);
    }
  }
  // Filled polygon (even-odd scanline fill).
  poly(points, [r, g, b], a = 255) {
    const ys = points.map((p) => p[1]);
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const y1 = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
    for (let y = y0; y <= y1; y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        if ((ay <= y && by > y) || (by <= y && ay > y)) {
          xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.max(0, Math.ceil(xs[k])); x <= Math.min(this.w - 1, xs[k + 1]); x++) {
          this.blend(x, y, r, g, b, a);
        }
      }
    }
  }
  ellipse(cx, cy, rx, ry, [r, g, b], a = 255) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d <= 1) this.blend(x, y, r, g, b, a);
      }
    }
  }
}

// ------------------------------------------------------------------ PNG
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)])), 8 + data.length);
  return out;
}
function encodePng(cv) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0);
  ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc(cv.h * (1 + cv.w * 4));
  for (let y = 0; y < cv.h; y++) {
    raw[y * (1 + cv.w * 4)] = 0; // filter: none
    Buffer.from(cv.px.buffer, y * cv.w * 4, cv.w * 4).copy(raw, y * (1 + cv.w * 4) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ shared drawing
const INK = [24, 8, 32]; // near-black violet silhouette colour
const DARK = [16, 6, 26];

function stars(cv, rnd, count, yMax) {
  for (let i = 0; i < count; i++) {
    const x = rnd() * W;
    const y = rnd() * yMax;
    const s = 1 + rnd() * 2;
    cv.disc(x, y, s, [255, 240, 220], Math.round(90 + rnd() * 140));
  }
}

// A city skyline: dark towers with a few lit windows, baseline at `base`.
function skyline(cv, rnd, base, minH, maxH) {
  let x = -20;
  while (x < W + 20) {
    const bw = 50 + rnd() * 90;
    const bh = minH + rnd() * (maxH - minH);
    const top = base - bh;
    cv.fillRect(Math.round(x), Math.round(top), Math.round(x + bw), base, INK);
    // Rooftop antenna on some towers.
    if (rnd() < 0.3) cv.line(x + bw / 2, top, x + bw / 2, top - 26 - rnd() * 30, 3, INK);
    // Lit windows.
    const cols = Math.floor(bw / 22);
    const rows = Math.floor(bh / 30);
    for (let cxi = 0; cxi < cols; cxi++) {
      for (let ryi = 0; ryi < rows; ryi++) {
        if (rnd() < 0.22) {
          const wx = x + 8 + cxi * 22;
          const wy = top + 12 + ryi * 30;
          const warm = rnd() < 0.7;
          cv.fillRect(Math.round(wx), Math.round(wy), Math.round(wx + 9), Math.round(wy + 12), warm ? [255, 190, 90] : [120, 230, 255], 235);
        }
      }
    }
    x += bw + 4 + rnd() * 26;
  }
}

// A palm tree silhouette: curved trunk + drooping fronds.
function palm(cv, x, y, h, lean, rnd) {
  const topX = x + lean;
  const topY = y - h;
  // Trunk as a tapering chain of discs.
  const steps = 24;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = x + lean * t * t + Math.sin(t * 2.2) * 6;
    const py = y - h * t;
    cv.disc(px, py, Math.max(3, 9 - t * 5), INK);
  }
  // Fronds: arcs of short segments drooping from the crown.
  for (let f = 0; f < 8; f++) {
    const ang = Math.PI * (0.08 + (f / 8) * 0.84);
    const len = h * (0.34 + rnd() * 0.12);
    let px = topX;
    let py = topY;
    const segs = 7;
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const nx = topX + Math.cos(ang) * len * t * (f % 2 === 0 ? 1 : -0.9);
      const ny = topY + Math.sin(ang) * len * t * 0.55 + len * 0.28 * t * t;
      cv.line(px, py, nx, ny, Math.max(2, 6 - t * 3), INK);
      px = nx;
      py = ny;
    }
  }
  // Coconuts.
  cv.disc(topX - 8, topY + 10, 7, INK);
  cv.disc(topX + 9, topY + 12, 6, INK);
}

// A standing person silhouette, facing the viewer, one hand on hip.
function person(cv, cx, baseY, h) {
  const headR = h * 0.085;
  const headY = baseY - h + headR;
  // Hair: a swept bob.
  cv.ellipse(cx, headY - headR * 0.15, headR * 1.08, headR * 1.05, INK);
  cv.poly(
    [
      [cx - headR * 1.1, headY],
      [cx - headR * 1.25, headY + h * 0.1],
      [cx - headR * 0.7, headY + h * 0.06],
      [cx + headR * 0.7, headY + h * 0.06],
      [cx + headR * 1.25, headY + h * 0.1],
      [cx + headR * 1.1, headY],
    ],
    INK,
  );
  // Face opening (skin-tone shadow, keeps it a silhouette portrait).
  cv.ellipse(cx, headY + headR * 0.12, headR * 0.72, headR * 0.8, [58, 26, 44]);
  // Sunglasses glint.
  cv.fillRect(Math.round(cx - headR * 0.55), Math.round(headY - headR * 0.05), Math.round(headR * 1.1), Math.round(headR * 0.3), [255, 214, 130], 220);
  // Neck + torso (open shirt, wide shoulders).
  const shoulderY = baseY - h * 0.78;
  cv.poly(
    [
      [cx - h * 0.055, shoulderY - h * 0.04],
      [cx + h * 0.055, shoulderY - h * 0.04],
      [cx + h * 0.16, baseY],
      [cx - h * 0.16, baseY],
    ],
    INK,
  );
  // Arms: left arm down, right arm bent to hip.
  cv.line(cx - h * 0.15, shoulderY + h * 0.05, cx - h * 0.19, baseY - h * 0.12, h * 0.05, INK);
  cv.line(cx + h * 0.15, shoulderY + h * 0.05, cx + h * 0.24, baseY - h * 0.3, h * 0.05, INK);
  cv.line(cx + h * 0.24, baseY - h * 0.3, cx + h * 0.13, baseY - h * 0.24, h * 0.05, INK);
  // Legs.
  cv.line(cx - h * 0.07, baseY, cx - h * 0.09, baseY + h * 0.32, h * 0.055, INK);
  cv.line(cx + h * 0.07, baseY, cx + h * 0.1, baseY + h * 0.32, h * 0.055, INK);
}

// ------------------------------------------------------------------ scene 1: boulevard
function boulevard() {
  const cv = new Canvas(W, H);
  const rnd = mulberry32(20261119);
  cv.vgrad([
    [0, [43, 16, 74]],
    [0.35, [122, 32, 96]],
    [0.62, [226, 84, 84]],
    [0.8, [255, 158, 74]],
    [1, [255, 205, 110]],
  ]);
  stars(cv, rnd, 70, 380);
  // Sun + glow, low over the skyline.
  cv.glow(540, 880, 420, [255, 150, 80], 120);
  cv.glow(540, 880, 260, [255, 190, 110], 150);
  cv.disc(540, 880, 150, [255, 224, 150]);
  cv.disc(540, 880, 132, [255, 238, 190]);
  skyline(cv, rnd, 1010, 180, 420);
  // Street: dark asphalt with a warm centre reflection.
  cv.fillRect(0, 1010, W, H, DARK);
  for (let i = 0; i < 26; i++) {
    const y = 1020 + i * 13;
    const wdt = 60 + i * 9;
    cv.fillRect(Math.round(540 - wdt / 2), y, Math.round(540 + wdt / 2), y + 5, [255, 170, 90], 26 + i * 2);
  }
  // Centre dashes rushing toward the viewer.
  for (let i = 0; i < 7; i++) {
    const y = 1030 + i * 48;
    cv.fillRect(532, y, 548, y + 22 + i * 4, [255, 220, 140], 200);
  }
  palm(cv, 92, 1040, 430, 46, rnd);
  palm(cv, 1005, 1050, 380, -40, rnd);
  person(cv, 540, 1010, 560);
  return cv;
}

// ------------------------------------------------------------------ scene 2: pier
function pier() {
  const cv = new Canvas(W, H);
  const rnd = mulberry32(777);
  cv.vgrad([
    [0, [10, 22, 58]],
    [0.4, [64, 40, 110]],
    [0.62, [198, 74, 130]],
    [0.78, [255, 140, 100]],
    [1, [255, 196, 120]],
  ]);
  stars(cv, rnd, 90, 420);
  // Low sun over the sea.
  cv.glow(330, 760, 380, [255, 140, 90], 110);
  cv.disc(330, 760, 120, [255, 214, 140]);
  // Sea with shimmering sun-path.
  cv.fillRect(0, 830, W, 1010, [38, 20, 66]);
  for (let i = 0; i < 34; i++) {
    const y = 840 + i * 5;
    const wdt = 90 + rnd() * 260;
    const x = 330 - wdt / 2 + (rnd() - 0.5) * 120;
    cv.fillRect(Math.round(x), y, Math.round(x + wdt), y + 2, [255, 190, 110], 40 + rnd() * 90);
  }
  // Distant city lights on the right horizon.
  skyline(cv, rnd, 832, 60, 150);
  // Wooden pier: planks in perspective, bottom of frame.
  cv.fillRect(0, 1010, W, H, [20, 9, 30]);
  for (let i = 0; i < 12; i++) {
    const y = 1010 + i * 29;
    const shade = 34 + i * 3;
    cv.fillRect(0, y, W, y + 24, [shade, 20, 40]);
    cv.fillRect(0, y + 24, W, y + 27, [12, 6, 20]);
  }
  // Pier posts + rails.
  cv.fillRect(60, 960, 92, H, INK);
  cv.fillRect(988, 960, 1020, H, INK);
  cv.line(60, 985, 1020, 985, 10, INK);
  // Gulls.
  for (let i = 0; i < 6; i++) {
    const gx = 620 + rnd() * 320;
    const gy = 180 + rnd() * 260;
    const s = 10 + rnd() * 12;
    cv.line(gx - s, gy, gx, gy - s * 0.45, 3, INK);
    cv.line(gx, gy - s * 0.45, gx + s, gy, 3, INK);
  }
  palm(cv, 118, 1020, 360, 38, rnd);
  // Angler on the pier, rod cast toward the sunset.
  const cx = 660;
  const baseY = 1010;
  const h = 520;
  const headR = h * 0.085;
  const headY = baseY - h + headR;
  cv.ellipse(cx, headY, headR, headR, INK);
  // Bucket hat.
  cv.ellipse(cx, headY - headR * 0.55, headR * 1.25, headR * 0.42, INK);
  cv.fillRect(Math.round(cx - headR * 1.25), Math.round(headY - headR * 0.62), Math.round(headR * 2.5), Math.round(headR * 0.3), INK);
  cv.poly(
    [
      [cx - h * 0.05, baseY - h * 0.8],
      [cx + h * 0.05, baseY - h * 0.8],
      [cx + h * 0.15, baseY],
      [cx - h * 0.15, baseY],
    ],
    INK,
  );
  cv.line(cx - h * 0.14, baseY - h * 0.72, cx - h * 0.18, baseY - h * 0.1, h * 0.05, INK);
  cv.line(cx + h * 0.14, baseY - h * 0.72, cx + h * 0.2, baseY - h * 0.42, h * 0.05, INK);
  cv.line(cx - h * 0.07, baseY, cx - h * 0.09, baseY + h * 0.3, h * 0.055, INK);
  cv.line(cx + h * 0.07, baseY, cx + h * 0.1, baseY + h * 0.3, h * 0.055, INK);
  // Fishing rod + line arcing to the water.
  cv.line(cx + h * 0.2, baseY - h * 0.42, 180, 700, 5, INK);
  cv.line(180, 700, 240, 830, 2, [255, 220, 150], 200);
  cv.disc(240, 830, 5, [255, 220, 150]);
  return cv;
}

// ------------------------------------------------------------------ main
mkdirSync(OUT_DIR, { recursive: true });
for (const [name, scene] of [
  ['boulevard.png', boulevard],
  ['pier.png', pier],
]) {
  const png = encodePng(scene());
  writeFileSync(join(OUT_DIR, name), png);
  console.log(name, png.length, 'bytes');
}
