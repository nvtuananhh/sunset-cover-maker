// make-samples.mjs — generates the two built-in sample photos for Sunset Cover
// Maker. Pure Node (stdlib only): a tiny software rasterizer draws original
// sunset cityscape scenes with a person silhouette, then encodes them as PNG.
// No real-person photo, no game art, nothing copied: every pixel is drawn here.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'app', 'samples');
mkdirSync(outDir, { recursive: true });

// ---- PNG encoder (stdlib only) -------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- tiny rasterizer -------------------------------------------------------
function makeCanvas(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  const px = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    const sa = a / 255;
    buf[i] = Math.round(r * sa + buf[i] * (1 - sa));
    buf[i + 1] = Math.round(g * sa + buf[i + 1] * (1 - sa));
    buf[i + 2] = Math.round(b * sa + buf[i + 2] * (1 - sa));
    buf[i + 3] = 255;
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
  return {
    w, h, buf, px,
    vgrad(y0, y1, stops) {
      for (let y = 0; y < h; y++) {
        const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
        let c = stops[stops.length - 1][1];
        for (let s = 0; s < stops.length - 1; s++) {
          if (t >= stops[s][0] && t <= stops[s + 1][0]) {
            c = mix(stops[s][1], stops[s + 1][1], (t - stops[s][0]) / (stops[s + 1][0] - stops[s][0]));
            break;
          }
        }
        for (let x = 0; x < w; x++) px(x, y, c[0], c[1], c[2]);
      }
    },
    rect(x0, y0, x1, y1, c, a = 255) {
      for (let y = Math.max(0, y0 | 0); y < Math.min(h, y1 | 0); y++)
        for (let x = Math.max(0, x0 | 0); x < Math.min(w, x1 | 0); x++) px(x, y, c[0], c[1], c[2], a);
    },
    circle(cx, cy, r, c, a = 255) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= r) px(x, y, c[0], c[1], c[2], a);
        }
    },
    glow(cx, cy, r, c, strength = 1) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          const d = Math.hypot(x - cx, y - cy) / r;
          if (d < 1) {
            const f = (1 - d) * (1 - d) * strength;
            px(x, y, c[0], c[1], c[2], Math.round(255 * Math.min(1, f)));
          }
        }
    },
    line(x0, y0, x1, y1, thick, c, a = 255) {
      const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2 + 1;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        this.circle(lerp(x0, x1, t), lerp(y0, y1, t), thick / 2, c, a);
      }
    },
    poly(points, c, a = 255) {
      let minY = Infinity, maxY = -Infinity;
      for (const [, y] of points) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(h - 1, Math.ceil(maxY)); y++) {
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
          for (let x = Math.max(0, Math.ceil(xs[k])); x <= Math.min(w - 1, Math.floor(xs[k + 1])); x++) {
            px(x, y, c[0], c[1], c[2], a);
          }
        }
      }
    },
  };
}

// Deterministic pseudo-random so both scenes are reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const INK = [16, 8, 26]; // near-black violet silhouette colour

function drawPalm(cv, x, baseY, s, lean) {
  const topX = x + lean * s;
  const topY = baseY - 150 * s;
  cv.line(x, baseY, topX, topY, 10 * s, INK);
  for (let f = 0; f < 7; f++) {
    const ang = (-Math.PI / 2) + (f - 3) * 0.42;
    const len = 62 * s * (1 - Math.abs(f - 3) * 0.08);
    const ex = topX + Math.cos(ang) * len;
    const ey = topY + Math.sin(ang) * len + 26 * s;
    cv.line(topX, topY, ex, ey, 5 * s, INK);
    // drooping frond tip
    cv.line(ex, ey, ex + (f < 3 ? -14 : 14) * s, ey + 16 * s, 3 * s, INK);
  }
  cv.circle(topX, topY, 7 * s, INK);
}

function drawPerson(cv, x, baseY, s, pose) {
  // Stylised standing figure silhouette: head, torso, legs, one arm bent.
  const headR = 13 * s;
  const headY = baseY - 118 * s;
  cv.circle(x, headY, headR, INK);
  // hair / cap brim
  cv.rect(x - headR, headY - headR - 2 * s, x + headR, headY - headR + 6 * s, INK);
  // torso: shoulders wide, waist narrow
  cv.poly([
    [x - 22 * s, baseY - 96 * s], [x + 22 * s, baseY - 96 * s],
    [x + 15 * s, baseY - 34 * s], [x - 15 * s, baseY - 34 * s],
  ], INK);
  if (pose === 'rod') {
    // arm raised holding a fishing rod angled up-right
    cv.line(x + 18 * s, baseY - 88 * s, x + 52 * s, baseY - 108 * s, 7 * s, INK);
    cv.line(x + 52 * s, baseY - 108 * s, x + 150 * s, baseY - 190 * s, 3 * s, INK);
    cv.line(x + 150 * s, baseY - 190 * s, x + 168 * s, baseY - 150 * s, 2 * s, INK);
    cv.line(x - 18 * s, baseY - 88 * s, x - 30 * s, baseY - 52 * s, 7 * s, INK);
  } else {
    // one hand on hip, other arm relaxed; sunglasses glint
    cv.line(x + 20 * s, baseY - 90 * s, x + 34 * s, baseY - 52 * s, 7 * s, INK);
    cv.line(x - 20 * s, baseY - 90 * s, x - 30 * s, baseY - 40 * s, 7 * s, INK);
    cv.rect(x - 9 * s, headY - 4 * s, x + 9 * s, headY + 1 * s, [255, 190, 120], 200);
  }
  // legs
  cv.line(x - 7 * s, baseY - 34 * s, x - 12 * s, baseY, 9 * s, INK);
  cv.line(x + 7 * s, baseY - 34 * s, x + 13 * s, baseY, 9 * s, INK);
}

function skyline(cv, baseY, hMin, hMax, seed, windowCol) {
  const r = rng(seed);
  let x = -10;
  while (x < cv.w + 10) {
    const bw = 46 + r() * 90;
    const bh = hMin + r() * (hMax - hMin);
    cv.rect(x, baseY - bh, x + bw, baseY, INK);
    if (r() < 0.5) cv.rect(x + bw * 0.3, baseY - bh - 18, x + bw * 0.7, baseY - bh, INK);
    // lit windows
    for (let wy = baseY - bh + 10; wy < baseY - 12; wy += 18) {
      for (let wx = x + 8; wx < x + bw - 8; wx += 16) {
        if (r() < 0.28) cv.rect(wx, wy, wx + 6, wy + 8, windowCol, 220);
      }
    }
    x += bw + 4 + r() * 26;
  }
}

// ---- Scene 1: boulevard — golden-hour boulevard, person by the road --------
function boulevard() {
  const W = 900, H = 1125;
  const cv = makeCanvas(W, H);
  cv.vgrad(0, H, [
    [0, [58, 24, 96]], [0.42, [214, 74, 110]], [0.62, [255, 138, 76]],
    [0.78, [255, 176, 102]], [1, [46, 16, 52]],
  ]);
  cv.glow(560, 640, 260, [255, 214, 140], 0.9);
  cv.circle(560, 640, 92, [255, 236, 180]);
  // distant skyline
  skyline(cv, 700, 60, 170, 41, [255, 200, 120]);
  // sun reflection band on the road
  for (let y = 700; y < H; y++) {
    const t = (y - 700) / (H - 700);
    const wdt = 60 + t * 260;
    for (let x = 560 - wdt / 2; x < 560 + wdt / 2; x++) {
      if (((x * 7 + y * 13) % 29) < 9) cv.px(x | 0, y, 255, 170, 90, Math.round(120 * (1 - t * 0.5)));
    }
  }
  cv.rect(0, 700, W, H, [30, 10, 40], 60);
  // road edges + palms
  cv.line(120, 700, 0, H, 4, [255, 200, 140], 160);
  cv.line(780, 700, W, H, 4, [255, 200, 140], 160);
  drawPalm(cv, 96, 900, 1.15, 26);
  drawPalm(cv, 812, 940, 1.3, -30);
  drawPalm(cv, 700, 760, 0.7, 14);
  drawPerson(cv, 470, 1010, 1.25, 'hip');
  // foreground vignette
  cv.rect(0, 1040, W, H, [20, 6, 30], 90);
  return cv;
}

// ---- Scene 2: pier — neon dusk over the water ------------------------------
function pier() {
  const W = 900, H = 1125;
  const cv = makeCanvas(W, H);
  cv.vgrad(0, H, [
    [0, [24, 16, 72]], [0.38, [126, 44, 128]], [0.58, [255, 110, 120]],
    [0.72, [255, 178, 110]], [1, [16, 22, 48]],
  ]);
  cv.glow(330, 600, 240, [255, 190, 130], 0.9);
  cv.circle(330, 600, 78, [255, 228, 170]);
  // sea shimmer
  const r = rng(97);
  for (let y = 640; y < 900; y++) {
    for (let n = 0; n < 26; n++) {
      const x = Math.floor(r() * W);
      const len = 20 + r() * 90;
      const warm = r() < 0.6;
      cv.line(x, y, x + len, y, 2, warm ? [255, 170, 110] : [90, 220, 230], 130);
    }
  }
  cv.rect(0, 640, W, 900, [20, 26, 60], 70);
  // pier planks in perspective
  cv.poly([[300, 900], [600, 900], [900, 1125], [0, 1125]], [52, 30, 44]);
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const y = 900 + t * t * 225;
    cv.line(300 - t * 300, y, 600 + t * 300, y, 3, [120, 80, 90], 200);
  }
  cv.line(300, 900, 0, 1125, 5, [140, 96, 104], 220);
  cv.line(600, 900, 900, 1125, 5, [140, 96, 104], 220);
  // pier posts + lamps
  for (const [lx, ly] of [[180, 1010], [720, 1010]]) {
    cv.line(lx, ly, lx, ly - 120, 6, INK);
    cv.glow(lx, ly - 128, 46, [255, 190, 120], 0.8);
    cv.circle(lx, ly - 128, 10, [255, 220, 160]);
  }
  drawPerson(cv, 452, 1000, 1.2, 'rod');
  // gulls
  for (const [gx, gy, gs] of [[180, 300, 14], [260, 260, 11], [640, 330, 12]]) {
    cv.line(gx - gs, gy, gx, gy - 5, 3, INK);
    cv.line(gx, gy - 5, gx + gs, gy, 3, INK);
  }
  return cv;
}

for (const [name, scene] of [['boulevard', boulevard], ['pier', pier]]) {
  const cv = scene();
  const png = encodePNG(cv.w, cv.h, cv.buf);
  writeFileSync(join(outDir, `${name}.png`), png);
  console.log(`${name}.png ${cv.w}x${cv.h} ${png.length} bytes`);
}
