// Colour grades: real canvas composites over the photo area — gradient
// maps, duotone tints, vignette and optional halftone/grain. Not CSS
// filters: the same code runs for the preview and for every PNG export.
export const GRADES = [
  { id: 'vice', name: 'Vice Sunset', swatch: 'linear-gradient(90deg,#ffd23c,#ff7a18,#ff2e88)', tint: ['#ffb347', '#ff2e88'], mode: 'overlay', strength: 0.55, warm: 0.18 },
  { id: 'neon', name: 'Neon Nights', swatch: 'linear-gradient(90deg,#ff2e88,#7b2eff,#2ee6c8)', tint: ['#ff2e88', '#2ee6c8'], mode: 'overlay', strength: 0.6, warm: 0 },
  { id: 'golden', name: 'Golden Hour', swatch: 'linear-gradient(90deg,#ffe9a8,#ffb347,#ff8c1a)', tint: ['#ffc93c', '#ff8c1a'], mode: 'soft-light', strength: 0.7, warm: 0.28 },
  { id: 'noir', name: 'Noir', swatch: 'linear-gradient(90deg,#222,#888,#eee)', tint: ['#1a1a2e', '#e8e8e8'], mode: 'color', strength: 0.85, warm: 0, desat: true },
  { id: 'coral', name: 'Coral Heat', swatch: 'linear-gradient(90deg,#ff9a5c,#ff5c5c,#ff2e88)', tint: ['#ff8c5c', '#ff2e5c'], mode: 'overlay', strength: 0.6, warm: 0.22 },
  { id: 'dusk', name: 'Palm Dusk', swatch: 'linear-gradient(90deg,#5c2a6e,#c94b7c,#ff8c5c)', tint: ['#7b2eff', '#ff8c5c'], mode: 'overlay', strength: 0.55, warm: 0.08 },
  { id: 'chrome', name: 'Chrome Fade', swatch: 'linear-gradient(90deg,#e8f4ff,#9fb8cc,#5c7a99)', tint: ['#bcd8ee', '#5c7a99'], mode: 'soft-light', strength: 0.55, warm: 0, desat: true },
  { id: 'tealnoir', name: 'Teal Noir', swatch: 'linear-gradient(90deg,#0f3d3e,#2ee6c8,#e8fff8)', tint: ['#0f3d3e', '#2ee6c8'], mode: 'overlay', strength: 0.5, warm: 0 },
  { id: 'bubble', name: 'Bubblegum', swatch: 'linear-gradient(90deg,#ffb3d9,#ff7ac0,#7b2eff)', tint: ['#ff7ac0', '#7b2eff'], mode: 'overlay', strength: 0.6, warm: 0.1 },
];

export function findGrade(gradeId) {
  return GRADES.find((g) => g.id === gradeId) || GRADES[0];
}

/** Deterministic PRNG so grain is identical on every export. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Apply a grade over the whole photo area (clipped by the caller). */
export function applyGrade(ctx, W, H, gradeId, opts) {
  const grade = findGrade(gradeId);
  const o = opts || {};
  ctx.save();
  // Warm wash.
  if (grade.warm > 0) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = grade.warm;
    ctx.fillStyle = '#ff9a3c';
    ctx.fillRect(0, 0, W, H);
  }
  // Duotone gradient map: two-colour wash blended over the photos.
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, grade.tint[0]);
  grad.addColorStop(1, grade.tint[1]);
  ctx.globalCompositeOperation = grade.mode;
  ctx.globalAlpha = grade.strength * 0.55;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Desaturating grades pull colour out first via a grey overlay.
  if (grade.desat) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
  }
  // Contrast lift: dark multiply at the edges is done by the vignette below.
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  // Vignette: darkened corners, warm centre.
  const vg = ctx.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.32, W / 2, H * 0.5, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,4,24,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  // Halftone dots in the sky band (top third), subtle.
  if (o.halftone) drawHalftone(ctx, W, H, grade);
  // Film grain, seeded so every export is byte-stable.
  if (o.grain) drawGrain(ctx, W, H, gradeId);
  ctx.restore();
}

/** Halftone dot screen across the top band of the cover. */
export function drawHalftone(ctx, W, H, grade) {
  const step = Math.max(10, Math.round(W / 160));
  ctx.save();
  ctx.fillStyle = grade.tint[1];
  ctx.globalAlpha = 0.10;
  for (let y = step / 2; y < H * 0.34; y += step) {
    for (let x = step / 2; x < W; x += step) {
      const r = (step * 0.22) * (1 - y / (H * 0.4));
      if (r <= 0.4) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Seeded monochrome grain: deterministic, so re-exports match. */
export function drawGrain(ctx, W, H, seedText) {
  let seed = 1234567;
  for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
  const rand = mulberry32(seed);
  const step = Math.max(6, Math.round(W / 320));
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const v = rand() > 0.5 ? 255 : 0;
      ctx.fillStyle = v ? '#ffffff' : '#000000';
      ctx.fillRect(x, y, step * 0.6, step * 0.6);
    }
  }
  ctx.restore();
}
