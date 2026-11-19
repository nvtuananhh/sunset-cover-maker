// grades.js — colour grades drawn as real canvas composites over each panel
// (gradient maps, duotone, glow, halftone dots, grain, vignette). Every grade
// is painted onto the cover canvas itself, so exports carry the grade.

export const GRADES = ['sunset', 'neon', 'golden', 'noir'];

function vignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,0,16,0.55)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function grain(ctx, w, h, amount) {
  ctx.save();
  ctx.globalAlpha = amount;
  const step = Math.max(3, Math.round(w / 360));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const v = Math.random() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, step * 0.6, step * 0.6);
    }
  }
  ctx.restore();
}

function halftone(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  const step = Math.max(10, Math.round(w / 90));
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      const r = step * 0.14 * (0.6 + 0.4 * Math.sin((x + y) / 40));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function sunsetGrade(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,94,120,0.10)');
  g.addColorStop(0.55, 'rgba(255,140,60,0.16)');
  g.addColorStop(1, 'rgba(120,20,90,0.30)');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  const sun = ctx.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.42, h * 0.55);
  sun.addColorStop(0, 'rgba(255,220,120,0.55)');
  sun.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function neonGrade(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(255,46,166,0.34)');
  g.addColorStop(0.5, 'rgba(120,40,220,0.18)');
  g.addColorStop(1, 'rgba(0,220,255,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.3, h * 0.6);
  glow.addColorStop(0, 'rgba(255,46,166,0.30)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function goldenGrade(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,214,120,0.42)');
  g.addColorStop(1, 'rgba(200,120,20,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'screen';
  const haze = ctx.createRadialGradient(w * 0.5, h * 0.35, 10, w * 0.5, h * 0.35, h * 0.5);
  haze.addColorStop(0, 'rgba(255,240,190,0.28)');
  haze.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function noirGrade(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  const accent = ctx.createLinearGradient(0, h * 0.7, 0, h);
  accent.addColorStop(0, 'rgba(255,94,120,0)');
  accent.addColorStop(1, 'rgba(255,94,120,0.30)');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function applyGrade(ctx, grade, w, h, effects) {
  if (grade === 'sunset') sunsetGrade(ctx, w, h);
  else if (grade === 'neon') neonGrade(ctx, w, h);
  else if (grade === 'golden') goldenGrade(ctx, w, h);
  else if (grade === 'noir') noirGrade(ctx, w, h);
  if (effects.halftone) halftone(ctx, w, h);
  vignette(ctx, w, h);
  if (effects.grain) grain(ctx, w, h, 0.05);
}
