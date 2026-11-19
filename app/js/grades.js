// app/js/grades.js — colour grades and poster effects, drawn on canvas.
//
// Every grade is a real canvas composite (gradient maps, duotone overlays,
// grain, vignette, halftone dots), never a CSS filter, so the preview and
// the exported PNG are the same pixels.
export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    blurb: 'Warm orange / pink dusk',
    swatch: ['#ff9e4a', '#ff5e7a', '#7a2060'],
  },
  neon: {
    name: 'Neon Nights',
    blurb: 'Magenta / cyan duotone glow',
    swatch: ['#ff2fb3', '#22d3ee', '#12041f'],
  },
  golden: {
    name: 'Golden Hour',
    blurb: 'Warm gold + soft haze',
    swatch: ['#ffd166', '#f4842b', '#5b3a12'],
  },
  noir: {
    name: 'Noir',
    blurb: 'High-contrast B&W + one accent',
    swatch: ['#f5f5f5', '#111111', '#ff2f6d'],
  },
};

/** mulberry32 seeded PRNG — grain must be identical on every render. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft radial vignette: darkens the corners, keeps the middle bright. */
function vignette(ctx, W, H, strength) {
  const r = Math.hypot(W, H) / 2;
  const grad = ctx.createRadialGradient(W / 2, H / 2, r * 0.42, W / 2, H / 2, r);
  grad.addColorStop(0, 'rgba(12,2,18,0)');
  grad.addColorStop(1, `rgba(12,2,18,${strength})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Film grain: a scatter of tiny black/white specks, seeded so it is stable. */
function grain(ctx, W, H, amount) {
  const rnd = seededRandom(20261119);
  const count = Math.floor((W * H) / 900) * amount;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const light = rnd() > 0.5;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

/** Halftone dots across the lower half — the printed-poster look. */
function halftone(ctx, W, H) {
  const step = Math.max(7, Math.round(Math.min(W, H) / 130));
  ctx.save();
  ctx.fillStyle = 'rgba(20,4,28,0.16)';
  for (let y = H * 0.55; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const t = (y - H * 0.55) / (H * 0.45);
      const r = step * 0.16 + t * step * 0.2;
      ctx.beginPath();
      ctx.arc(x + step / 2, y + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A vertical colour wash drawn with the given composite operation. */
function wash(ctx, W, H, stops, composite, alpha) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  for (const [t, color] of stops) grad.addColorStop(t, color);
  ctx.save();
  ctx.globalCompositeOperation = composite;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** A warm glow blooming from the top of the frame. */
function topGlow(ctx, W, H, color, alpha) {
  const grad = ctx.createRadialGradient(W * 0.5, -H * 0.1, 0, W * 0.5, -H * 0.1, H * 0.85);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/**
 * Apply a grade + effects over a finished panel composition.
 * `effects` is { grain: bool, halftone: bool, vignette: bool }.
 * Noir desaturates through an offscreen copy (canvas filter on the copy),
 * then adds a single hot-pink accent wash.
 */
export function applyGrade(ctx, W, H, gradeId, effects) {
  const grade = GRADES[gradeId] || GRADES.sunset;
  if (gradeId === 'noir') {
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const octx = off.getContext('2d');
    octx.filter = 'grayscale(1) contrast(1.22) brightness(1.06)';
    octx.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.filter = 'none';
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(off, 0, 0);
    ctx.restore();
    wash(ctx, W, H, [[0, '#ff2f6d'], [1, '#ff2f6d']], 'overlay', 0.16);
  } else if (gradeId === 'neon') {
    wash(ctx, W, H, [[0, '#ff2fb3'], [0.55, '#7a1fa2'], [1, '#0e7490']], 'overlay', 0.42);
    wash(ctx, W, H, [[0, '#22d3ee'], [1, '#ff2fb3']], 'soft-light', 0.3);
    topGlow(ctx, W, H, 'rgba(255,47,179,0.55)', 0.5);
  } else if (gradeId === 'golden') {
    wash(ctx, W, H, [[0, '#ffd166'], [0.6, '#f4842b'], [1, '#7a3a10']], 'soft-light', 0.55);
    topGlow(ctx, W, H, 'rgba(255,209,102,0.5)', 0.45);
    wash(ctx, W, H, [[0, 'rgba(255,240,200,0.28)'], [1, 'rgba(255,240,200,0)']], 'screen', 0.5);
  } else {
    // sunset (default)
    wash(ctx, W, H, [[0, '#ff7a3d'], [0.55, '#ff4d6d'], [1, '#5b1a5e']], 'soft-light', 0.5);
    wash(ctx, W, H, [[0, 'rgba(255,150,60,0)'], [1, 'rgba(255,94,58,0.22)']], 'overlay', 0.6);
    topGlow(ctx, W, H, 'rgba(255,158,74,0.6)', 0.55);
  }
  if (effects.halftone) halftone(ctx, W, H);
  if (effects.grain) grain(ctx, W, H, 1);
  if (effects.vignette) vignette(ctx, W, H, 0.42);
}
