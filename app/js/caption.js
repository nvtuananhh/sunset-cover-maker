// Caption rendering: the huge chrome title, the slanted script subtitle
// and the tagline pill. All poster type is drawn on the canvas (gradient
// fill + stroke + shadow) so the export matches the preview exactly.
// System fonts only — no font files anywhere in the repo.
export const TITLE_FONTS = '"Noto Sans Condensed Black", "Noto Sans", "Arial Narrow", sans-serif';
export const SCRIPT_FONTS = 'italic 700 Georgia, "Times New Roman", serif';
export const UI_FONTS = '"Noto Sans", "DejaVu Sans", Arial, sans-serif';

export const TITLE_COLOURS = {
  sunset: ['#ffe95c', '#ffb347', '#ff7a18', '#ff2e88', '#8b2eff'],
  gold: ['#fff6c8', '#ffd23c', '#ff9a1a', '#c97b00', '#7a4a00'],
  ice: ['#ffffff', '#d8ecff', '#9fc8ee', '#5c8fc9', '#2e5c8a'],
  pink: ['#ffd6f2', '#ff9ad9', '#ff2e88', '#c9186e', '#7b0f4d'],
};

/** Measure a tracked (letter-spaced) string by hand: canvas has no
 *  letterSpacing in every build, so we draw glyph by glyph. */
export function trackedWidth(ctx, text, tracking) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + tracking;
  return w - tracking;
}

/** Draw one line of tracked text, centred on cx. Returns the drawn width. */
export function drawTracked(ctx, text, cx, y, tracking) {
  const widths = [];
  let total = 0;
  for (const ch of text) {
    const w = ctx.measureText(ch).width;
    widths.push(w);
    total += w + tracking;
  }
  total -= tracking;
  let x = cx - total / 2;
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, y);
    x += widths[i] + tracking;
  }
  return total;
}

/** Stroke the same tracked line (used for the title outline pass). */
export function strokeTracked(ctx, text, cx, y, tracking) {
  const widths = [];
  let total = 0;
  for (const ch of text) {
    const w = ctx.measureText(ch).width;
    widths.push(w);
    total += w + tracking;
  }
  total -= tracking;
  let x = cx - total / 2;
  for (let i = 0; i < text.length; i++) {
    ctx.strokeText(text[i], x, y);
    x += widths[i] + tracking;
  }
  return total;
}

/** The huge chrome title. `box` is {cx, y, width} in canvas pixels. */
export function drawChromeTitle(ctx, state, box) {
  const title = (state.title || 'SUNSET CITY').toUpperCase();
  const colours = TITLE_COLOURS[state.titleColour] || TITLE_COLOURS.sunset;
  const size = Math.round(box.width * 0.115 * state.titleSize);
  const tracking = size * state.tracking;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '900 ' + size + 'px ' + TITLE_FONTS;
  // Fit: shrink until the tracked title fits the box.
  let fitSize = size;
  while (fitSize > size * 0.45 && trackedWidth(ctx, title, tracking) > box.width) {
    fitSize = Math.round(fitSize * 0.94);
    ctx.font = '900 ' + fitSize + 'px ' + TITLE_FONTS;
  }
  const grad = ctx.createLinearGradient(0, box.y - fitSize * 0.85, 0, box.y + fitSize * 0.18);
  colours.forEach((c, i) => grad.addColorStop(i / (colours.length - 1), c));
  const shadowOff = Math.max(4, Math.round(fitSize * 0.07));
  if (state.titleStyle === 'neon') {
    // Neon outline: dark fill, hot-pink stroke, pink glow.
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = Math.round(fitSize * 0.28);
    ctx.lineWidth = Math.max(2, Math.round(fitSize * 0.045));
    ctx.strokeStyle = '#ff5ca8';
    ctx.fillStyle = '#1a0512';
    strokeTracked(ctx, title, box.cx, box.y, tracking);
    drawTracked(ctx, title, box.cx, box.y, tracking);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, Math.round(fitSize * 0.015));
    ctx.strokeStyle = '#ffffff';
    strokeTracked(ctx, title, box.cx, box.y, tracking);
  } else {
    // Chrome / striped: offset dark shadow, thick dark outline, gradient fill.
    ctx.fillStyle = 'rgba(20,2,16,0.9)';
    ctx.save();
    ctx.translate(shadowOff, shadowOff);
    drawTracked(ctx, title, box.cx, box.y, tracking);
    ctx.restore();
    ctx.lineWidth = Math.max(3, Math.round(fitSize * 0.09));
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#16040f';
    strokeTracked(ctx, title, box.cx, box.y, tracking);
    ctx.fillStyle = grad;
    drawTracked(ctx, title, box.cx, box.y, tracking);
    if (state.titleStyle === 'striped') {
      // Horizontal retro stripes clipped inside the letters.
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(22,4,15,0.55)';
      const stripeH = Math.max(3, Math.round(fitSize * 0.06));
      const top = box.y - fitSize * 0.8;
      for (let y = top; y < box.y + fitSize * 0.1; y += stripeH * 3) {
        ctx.fillRect(box.cx - box.width / 2, y, box.width, stripeH);
      }
      ctx.restore();
    }
    // (No full-width highlight bar: a straight bar across the letters
    // reads as a scratch over the photos. The gradient's light top
    // stop already gives the chrome its hot edge.)
  }
  ctx.restore();
  return { size: fitSize, width: trackedWidth(ctx, title, tracking) };
}

/** Slanted script subtitle in neon pink under the title. */
export function drawScriptSubtitle(ctx, text, cx, y, size) {
  ctx.save();
  ctx.font = SCRIPT_FONTS;
  ctx.font = 'italic 700 ' + size + 'px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.translate(cx, y);
  ctx.rotate(-0.045);
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = Math.round(size * 0.5);
  ctx.fillStyle = '#ff5ca8';
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd6ec';
  ctx.fillText(text, 0, -Math.max(1, size * 0.03));
  ctx.restore();
}

/** Tagline pill: dark ticket with gold letter-spaced text. */
export function drawTaglinePill(ctx, text, cx, y, W) {
  ctx.save();
  const size = Math.max(13, Math.round(W * 0.016));
  ctx.font = '700 ' + size + 'px ' + UI_FONTS;
  const tracking = size * 0.14;
  const w = trackedWidth(ctx, text.toUpperCase(), tracking) + size * 2.4;
  const h = size * 2.1;
  const x = cx - w / 2;
  ctx.fillStyle = 'rgba(18,3,14,0.92)';
  ctx.strokeStyle = '#ffc93c';
  ctx.lineWidth = Math.max(1.5, W * 0.0012);
  roundRect(ctx, x, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23c';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  drawTracked(ctx, text.toUpperCase(), cx, y + size * 0.05, tracking);
  ctx.restore();
  return h;
}

/** Rounded-rectangle path helper (no Path2D dependency). */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
