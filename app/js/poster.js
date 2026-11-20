// Poster furniture + the master cover renderer: panels, grade, quote bar,
// role tags, chrome title, script subtitle, tagline, billing, barcode,
// gold seal and volume/season/status labels. One function, drawPoster,
// renders the preview and every export size identically.
import { layoutRects, heroIndex, panelClipPath, drawPanelPhoto } from './panels.js';
import { applyGrade } from './grades.js';
import { drawChromeTitle, drawScriptSubtitle, drawTaglinePill, roundRect, UI_FONTS } from './caption.js';
import { findPhoto } from './photos.js';

const FRAME = '#1c0713';

/** Draw the whole cover onto ctx at size W x H from state + loaded images. */
export function drawPoster(ctx, W, H, state, images) {
  const aspect = W / H;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  // Warm outer frame + paper background.
  ctx.fillStyle = FRAME;
  ctx.fillRect(0, 0, W, H);
  const rects = layoutRects(state.layout, aspect).map((r) => ({
    x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H,
  }));
  const hero = heroIndex(state.layout);
  const order = rects.map((_, i) => i).filter((i) => i !== hero);
  if (hero >= 0) order.push(hero);
  const gutter = Math.max(3, Math.round(W * 0.004));

  // --- Photos, in order, hero last so it pops out over the title band.
  for (const i of order) {
    const panel = state.panels[i];
    if (!panel) continue;
    const rect = rects[i];
    const img = images.get(panel.photoId) || (findPhoto(panel.photoId) || {}).img || null;
    const isHero = i === hero;
    ctx.save();
    if (isHero) {
      // Pop-out hero: drop shadow, then a frame slightly larger than the
      // photo so it breaks the panel grid and overlaps the title band.
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = Math.round(W * 0.02);
      ctx.shadowOffsetY = Math.round(H * 0.015);
      ctx.fillStyle = '#ffd23c';
      ctx.fillRect(rect.x - gutter * 1.4, rect.y - gutter * 1.4, rect.w + gutter * 2.8, rect.h + gutter * 2.8);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    panelClipPath(ctx, rect, state.layout, i);
    ctx.clip();
    if (img) drawPanelPhoto(ctx, img, panel, rect);
    else {
      // No photo yet: warm sunset gradient so the panel is never empty.
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      g.addColorStop(0, '#ff9a3c'); g.addColorStop(0.5, '#ff5c7a'); g.addColorStop(1, '#7b2eff');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
    // Thin dark gutter + gold hairline around each panel.
    ctx.save();
    panelClipPath(ctx, rect, state.layout, i);
    ctx.strokeStyle = 'rgba(20,4,14,0.9)';
    ctx.lineWidth = gutter;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,60,0.35)';
    ctx.lineWidth = Math.max(1, W * 0.001);
    ctx.stroke();
    ctx.restore();
  }

  // --- Colour grade over the photo area only (furniture stays crisp).
  ctx.save();
  ctx.beginPath();
  for (const r of rects) ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  applyGrade(ctx, W, H, state.grade, { grain: state.grain, halftone: state.halftone });
  ctx.restore();

  // --- Quote bar on top, with 5 gold stars.
  if (state.showQuote) drawQuoteBar(ctx, W, H, state);
  drawCornerLabels(ctx, W, H, state);

  // --- Role tag on every panel.
  for (let i = 0; i < rects.length; i++) {
    const panel = state.panels[i];
    if (panel) drawRoleTag(ctx, rects[i], panel.role, W, i === hero);
  }

  // --- Chrome title overlapping the panels + script subtitle + tagline.
  const titleY = H * (aspect < 1 ? 0.80 : 0.76) + state.titleY * H;
  drawChromeTitle(ctx, state, { cx: W / 2, y: titleY, width: W * 0.94 });
  const subSize = Math.max(16, Math.round(W * 0.032));
  drawScriptSubtitle(ctx, state.subtitle, W / 2, titleY + subSize * 1.55, subSize);
  drawTaglinePill(ctx, state.tagline, W / 2, H * 0.885, W);

  // --- Billing block, barcode, gold seal along the bottom edge.
  drawBilling(ctx, W, H, state);
  if (state.showBarcode) drawBarcode(ctx, W, H, state);
  if (state.showSeal) drawGoldSeal(ctx, W, H, state);
  ctx.restore();
}

/** Press-quote bar: 5 stars, quote, source. */
export function drawQuoteBar(ctx, W, H, state) {
  const barH = Math.max(34, Math.round(H * 0.062));
  ctx.save();
  ctx.fillStyle = 'rgba(16,3,12,0.88)';
  ctx.fillRect(0, 0, W, barH);
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(0, barH, W, Math.max(2, H * 0.003));
  const size = Math.max(13, Math.round(barH * 0.34));
  ctx.font = '700 ' + size + 'px ' + UI_FONTS;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const starSize = Math.round(size * 1.1);
  const quote = '“' + state.quote.toUpperCase() + '”';
  const source = '— ' + state.quoteSource.toUpperCase();
  const qW = ctx.measureText(quote).width;
  const sW = ctx.measureText(source).width;
  const starsW = starSize * 5 + starSize * 0.8;
  const total = qW + sW + starsW + size * 2.4;
  let x = (W - total) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(quote, x + qW / 2, barH / 2);
  x += qW + size * 0.9;
  ctx.fillStyle = '#ffc93c';
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, x + starSize / 2, barH / 2, starSize * 0.5, starSize * 0.21);
    x += starSize * 1.16;
  }
  x += size * 0.5;
  ctx.fillStyle = '#ffd23c';
  ctx.fillText(source, x + sW / 2, barH / 2);
  ctx.restore();
}

/** Volume / season / status labels in the top corners. */
export function drawCornerLabels(ctx, W, H, state) {
  const y = state.showQuote ? Math.max(34, Math.round(H * 0.062)) + Math.round(H * 0.028) : Math.round(H * 0.028);
  const size = Math.max(12, Math.round(W * 0.013));
  ctx.save();
  ctx.font = '800 ' + size + 'px ' + UI_FONTS;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.textAlign = 'left';
  ctx.fillText(state.volume, W * 0.03, y);
  ctx.textAlign = 'right';
  ctx.fillText(state.season + '  ·  ' + state.status, W * 0.97, y);
  ctx.restore();
}

/** Small black/white ticket reading the cast role, pinned to a panel corner. */
export function drawRoleTag(ctx, rect, role, W, isHero) {
  const size = Math.max(11, Math.round(W * 0.0115));
  ctx.save();
  ctx.font = '800 ' + size + 'px ' + UI_FONTS;
  const w = ctx.measureText(role).width + size * 1.5;
  const h = size * 1.9;
  const x = rect.x + Math.max(4, rect.w * 0.04);
  const y = rect.y + rect.h - h - Math.max(4, rect.h * 0.04);
  ctx.fillStyle = isHero ? '#ffc93c' : 'rgba(16,3,12,0.92)';
  ctx.strokeStyle = isHero ? '#16040f' : '#ffffff';
  ctx.lineWidth = Math.max(1, W * 0.0009);
  roundRect(ctx, x, y, w, h, Math.max(2, h * 0.18));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = isHero ? '#16040f' : '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(role, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

/** Billing block centred at the very bottom. */
export function drawBilling(ctx, W, H, state) {
  const size = Math.max(11, Math.round(W * 0.011));
  ctx.save();
  ctx.font = '700 ' + size + 'px ' + UI_FONTS;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,243,230,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 3;
  ctx.fillText(state.billing.toUpperCase(), W / 2, H - Math.max(8, H * 0.012), W * 0.62);
  ctx.restore();
}

/** Drawn barcode + catalogue number, bottom right. */
export function drawBarcode(ctx, W, H, state) {
  const bw = Math.max(70, Math.round(W * 0.075));
  const bh = Math.max(20, Math.round(H * 0.038));
  const x = W - bw - W * 0.025;
  const y = H - bh - Math.max(24, H * 0.038);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4, y - 4, bw + 8, bh + 16);
  let px = x;
  let seed = 987654321;
  const next = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  ctx.fillStyle = '#111111';
  while (px < x + bw) {
    const wBar = 1 + Math.floor(next() * 4);
    if (next() > 0.42) ctx.fillRect(px, y, wBar, bh);
    px += wBar + 1 + Math.floor(next() * 2);
  }
  ctx.font = '700 ' + Math.max(9, Math.round(bh * 0.32)) + 'px ' + UI_FONTS;
  ctx.textAlign = 'center';
  ctx.fillText('8 90123 45678 9', x + bw / 2, y + bh + 11);
  ctx.restore();
}

/** Gold starburst seal reading ORIGINAL COVER ART, bottom left. */
export function drawGoldSeal(ctx, W, H, state) {
  const cx = W * 0.075;
  const cy = H - Math.max(30, H * 0.075);
  const R = Math.max(26, Math.round(W * 0.032));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? R : R * 0.78;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(-R, -R, R, R);
  g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffc93c'); g.addColorStop(1, '#c98a00');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#7a4a00';
  ctx.lineWidth = Math.max(1.5, R * 0.05);
  ctx.stroke();
  ctx.fillStyle = '#4a2c00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const s1 = Math.max(9, Math.round(R * 0.24));
  ctx.font = '900 ' + s1 + 'px ' + UI_FONTS;
  ctx.fillText('ORIGINAL', 0, -R * 0.28);
  ctx.fillText('COVER ART', 0, R * 0.02);
  ctx.font = '700 ' + Math.max(7, Math.round(R * 0.16)) + 'px ' + UI_FONTS;
  ctx.fillText('★ SUNSET ★', 0, R * 0.36);
  ctx.restore();
}

/** Five-point star path, filled with the current fillStyle. */
export function drawStar(ctx, cx, cy, outer, inner) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
