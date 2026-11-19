// app/js/caption.js — caption lettering: bold condensed title, subtitle and
// tag line, drawn on the cover canvas with outline, shadow and an optional
// gradient fill. Position is stored as a fraction of the canvas so the same
// caption lands identically at every export size.
export const CAPTION_COLORS = [
  { name: 'Sunset White', fill: '#fff7ed', outline: '#1c0a1e', shadow: '#ff5e3a', gradient: null },
  { name: 'Neon Pink', fill: '#ffd7f2', outline: '#2b0340', shadow: '#ff2fb3', gradient: ['#ffe9a8', '#ff5e8a'] },
  { name: 'Gold Rush', fill: '#fff3c4', outline: '#241203', shadow: '#f4842b', gradient: ['#fff6c9', '#ffb347'] },
  { name: 'Ocean Pop', fill: '#e8fbff', outline: '#04263a', shadow: '#22d3ee', gradient: ['#c9f6ff', '#4dd8ff'] },
  { name: 'Bubblegum', fill: '#ffe3ee', outline: '#3d0a24', shadow: '#ff2f6d', gradient: ['#ffd1e3', '#ff7ab8'] },
];

/** A fresh caption: title, subtitle and tag line, centred near the bottom. */
export function defaultCaption() {
  return {
    title: 'NEON SHORE',
    subtitle: 'Vice City nights, your story',
    tagline: 'SUNSET COVER MAKER',
    color: 0,
    size: 1,
    spacing: 0.04,
    x: 0.5,
    y: 0.88,
    align: 'center',
  };
}

/** The title font size in px: scales with the shorter canvas side. */
export function titleSize(W, H, caption) {
  return Math.round(Math.min(W, H) * 0.105 * caption.size);
}

/**
 * Measure the caption block (title + subtitle + tagline) in canvas space.
 * Returns {x, y, w, h} of the block's bounding box, clamped inside the
 * canvas with a small margin — the caption can never run off the cover.
 */
export function measureCaptionBlock(ctx, W, H, caption) {
  const margin = Math.min(W, H) * 0.03;
  const maxW = W - margin * 2;
  let size = titleSize(W, H, caption);
  ctx.save();
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  try {
    ctx.letterSpacing = `${size * caption.spacing}px`;
  } catch (_) {}
  let titleW = ctx.measureText(caption.title.toUpperCase()).width;
  // A long title must shrink to fit, never run off the cover.
  while (titleW > maxW && size > 12) {
    size = Math.max(12, Math.round(size * 0.92));
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    try {
      ctx.letterSpacing = `${size * caption.spacing}px`;
    } catch (_) {}
    titleW = ctx.measureText(caption.title.toUpperCase()).width;
  }
  const subSize = Math.max(10, Math.round(size * 0.26));
  let tagSize = Math.max(9, Math.round(size * 0.17));
  const gap1 = size * 0.18;
  const gap2 = size * 0.22;
  ctx.font = `600 ${subSize}px Inter, system-ui, sans-serif`;
  try {
    ctx.letterSpacing = '0px';
  } catch (_) {}
  const subW = caption.subtitle ? ctx.measureText(caption.subtitle).width : 0;
  // The tag line is tracked out, so measure it glyph by glyph.
  ctx.font = `700 ${tagSize}px Inter, system-ui, sans-serif`;
  let tagW = caption.tagline ? spacedTagWidth(ctx, caption.tagline.toUpperCase(), tagSize * 0.32) : 0;
  while (tagW > maxW && tagSize > 8) {
    tagSize = Math.max(8, Math.round(tagSize * 0.92));
    ctx.font = `700 ${tagSize}px Inter, system-ui, sans-serif`;
    tagW = spacedTagWidth(ctx, caption.tagline.toUpperCase(), tagSize * 0.32);
  }
  ctx.restore();
  const w = Math.max(titleW, subW, tagW);
  const h = size + gap1 + subSize + gap2 + tagSize;
  const cx = caption.x * W;
  const cy = caption.y * H;
  const x = Math.min(Math.max(cx - w / 2, margin), W - margin - w);
  const y = Math.min(Math.max(cy - h, margin), H - margin - h);
  return { x, y, w, h, size, subSize, tagSize, gap1, gap2 };
}

/** Width of a tracked-out tag line, measured glyph by glyph (canvas
 * measureText does not reliably include letterSpacing, so we add the
 * tracking ourselves: advance per glyph + tracking between glyphs). */
function spacedTagWidth(ctx, text, tracking) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width;
  return w + tracking * Math.max(0, text.length - 1);
}

/** Draw a tracked-out tag line centred on cx, returning its pixel width. */
function drawSpacedTag(ctx, text, cx, y, tracking) {
  const total = spacedTagWidth(ctx, text, tracking);
  let x = cx - total / 2;
  ctx.save();
  ctx.textAlign = 'left';
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + tracking;
  }
  ctx.restore();
  return total;
}

/** Fill text with a solid colour or a vertical gradient across the block. */
function fillTitleText(ctx, text, x, y, preset, blockW) {
  if (preset.gradient) {
    const grad = ctx.createLinearGradient(x, y - blockW * 0.1, x, y + blockW * 0.08);
    grad.addColorStop(0, preset.gradient[0]);
    grad.addColorStop(1, preset.gradient[1]);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = preset.fill;
  }
  ctx.fillText(text, x, y);
}

/**
 * Draw the caption. For the full-bleed layout a dark poster bar sits behind
 * the block so white lettering stays readable over any photo.
 */
export function drawCaption(ctx, W, H, caption, layoutId) {
  const preset = CAPTION_COLORS[caption.color] || CAPTION_COLORS[0];
  const block = measureCaptionBlock(ctx, W, H, caption);
  const cx = caption.x * W;
  const { size, subSize, tagSize, gap1, gap2 } = block;
  const margin = Math.min(W, H) * 0.03;

  if (layoutId === 'fullbleed') {
    ctx.save();
    const barH = block.h + size * 0.55;
    const barY = Math.min(block.y - size * 0.32, H - barH - margin * 0.4);
    const grad = ctx.createLinearGradient(0, barY, 0, barY + barH);
    grad.addColorStop(0, 'rgba(16,4,22,0)');
    grad.addColorStop(0.35, 'rgba(16,4,22,0.72)');
    grad.addColorStop(1, 'rgba(16,4,22,0.88)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, barY, W, barH);
    ctx.fillStyle = 'rgba(255,94,58,0.9)';
    ctx.fillRect(0, barY, W, Math.max(3, size * 0.045));
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let y = block.y + size;

  // Title: shadow, thick outline, gradient/solid fill.
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  try {
    ctx.letterSpacing = `${size * caption.spacing}px`;
  } catch (_) {}
  const title = caption.title.toUpperCase();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = preset.outline;
  ctx.lineWidth = Math.max(2, size * 0.14);
  ctx.fillStyle = preset.shadow;
  ctx.fillText(title, cx + size * 0.045, y + size * 0.05);
  ctx.strokeText(title, cx, y);
  fillTitleText(ctx, title, cx, y, preset, block.w);

  // Subtitle: clean sans, soft dark shadow.
  if (caption.subtitle) {
    y += gap1 + subSize;
    ctx.font = `600 ${subSize}px Inter, system-ui, sans-serif`;
    try {
      ctx.letterSpacing = '0px';
    } catch (_) {}
    ctx.fillStyle = 'rgba(12,2,16,0.75)';
    ctx.fillText(caption.subtitle, cx + 2, y + 2);
    ctx.fillStyle = '#fff7ed';
    ctx.fillText(caption.subtitle, cx, y);
  }

  // Tag line: tracked-out caps with rules on either side.
  if (caption.tagline) {
    y += gap2 + tagSize;
    const tag = caption.tagline.toUpperCase();
    const tracking = tagSize * 0.32;
    ctx.font = `700 ${tagSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = preset.gradient ? preset.gradient[0] : preset.fill;
    const tagW = drawSpacedTag(ctx, tag, cx, y, tracking);
    const ruleY = y - tagSize * 0.32;
    const ruleGap = tagSize * 0.9;
    ctx.strokeStyle = 'rgba(255,247,237,0.85)';
    ctx.lineWidth = Math.max(1.5, tagSize * 0.09);
    ctx.beginPath();
    ctx.moveTo(cx - tagW / 2 - ruleGap - tagSize * 2.4, ruleY);
    ctx.lineTo(cx - tagW / 2 - ruleGap, ruleY);
    ctx.moveTo(cx + tagW / 2 + ruleGap, ruleY);
    ctx.lineTo(cx + tagW / 2 + ruleGap + tagSize * 2.4, ruleY);
    ctx.stroke();
  }
  ctx.restore();
}
