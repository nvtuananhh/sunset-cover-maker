// app/js/panels.js — cover layouts and per-panel crop / position.
//
// A cover is a set of photo panels on one canvas. Three layouts:
//   hero      one large photo + two small stacked panels (the poster look)
//   mosaic    a 2 x 2 four-panel grid
//   fullbleed one photo edge to edge, caption on a poster bar
// Each panel holds its own photo plus a crop: zoom, pan offsets and a small
// rotation. Photos are drawn cover-fit into their panel rect, so any photo
// fills any panel with no letterboxing.
export const LAYOUTS = {
  hero: {
    name: 'Hero + 2',
    blurb: 'One big moment, two small ones',
    panelCount: 3,
    panels(W, H) {
      const g = gutter(W, H);
      const m = g;
      const split = W * 0.62;
      return [
        { x: m, y: m, w: split - m - g / 2, h: H - m * 2 },
        { x: split + g / 2, y: m, w: W - split - m - g / 2, h: (H - m * 2 - g) / 2 },
        { x: split + g / 2, y: m + (H - m * 2 - g) / 2 + g, w: W - split - m - g / 2, h: (H - m * 2 - g) / 2 },
      ];
    },
  },
  mosaic: {
    name: '4-Panel Mosaic',
    blurb: 'Four moments, one story',
    panelCount: 4,
    panels(W, H) {
      const g = gutter(W, H);
      const m = g;
      const cw = (W - m * 2 - g) / 2;
      const ch = (H - m * 2 - g) / 2;
      return [
        { x: m, y: m, w: cw, h: ch },
        { x: m + cw + g, y: m, w: cw, h: ch },
        { x: m, y: m + ch + g, w: cw, h: ch },
        { x: m + cw + g, y: m + ch + g, w: cw, h: ch },
      ];
    },
  },
  fullbleed: {
    name: 'Full Bleed',
    blurb: 'One photo, poster caption bar',
    panelCount: 1,
    panels(W, H) {
      const m = gutter(W, H);
      return [{ x: m, y: m, w: W - m * 2, h: H - m * 2 }];
    },
  },
};

/** Gap between panels and the outer frame, scaled to the canvas. */
export function gutter(W, H) {
  return Math.max(4, Math.round(Math.min(W, H) * 0.014));
}

/** The panel rects for a layout id at a canvas size. */
export function layoutRects(layoutId, W, H) {
  const layout = LAYOUTS[layoutId] || LAYOUTS.hero;
  return layout.panels(W, H);
}

/** How many panels a layout shows. */
export function layoutPanelCount(layoutId) {
  return (LAYOUTS[layoutId] || LAYOUTS.hero).panelCount;
}

/** A fresh per-panel crop: no zoom, centred, upright. */
export function defaultPanel(photoId) {
  return { photoId, zoom: 1, ox: 0, oy: 0, rot: 0 };
}

/** Clamp a panel crop to sane ranges (zoom 1–3, pan ±0.6, rotate ±15°). */
export function clampPanel(panel) {
  panel.zoom = Math.min(3, Math.max(1, panel.zoom || 1));
  panel.ox = Math.min(0.6, Math.max(-0.6, panel.ox || 0));
  panel.oy = Math.min(0.6, Math.max(-0.6, panel.oy || 0));
  panel.rot = Math.min(15, Math.max(-15, panel.rot || 0));
  return panel;
}

/**
 * Cover-fit transform for one photo inside one panel rect, with the panel's
 * crop applied. Returns the draw rectangle (in canvas space) and rotation.
 */
export function coverTransform(img, rect, panel) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + panel.ox * rect.w;
  const cy = rect.y + rect.h / 2 + panel.oy * rect.h;
  return { dx: cx - dw / 2, dy: cy - dh / 2, dw, dh, cx, cy, rot: (panel.rot * Math.PI) / 180 };
}

/** Draw one photo into its panel rect, clipped, with its crop applied. */
export function drawPanelPhoto(ctx, img, rect, panel) {
  if (!img || !img.naturalWidth) return false;
  const t = coverTransform(img, rect, panel);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.translate(t.cx, t.cy);
  ctx.rotate(t.rot);
  ctx.drawImage(img, t.dx - t.cx, t.dy - t.cy, t.dw, t.dh);
  ctx.restore();
  return true;
}

/** Draw the white poster frame around each panel + the outer edge. */
export function drawPanelFrames(ctx, rects, W, H) {
  const g = gutter(W, H);
  const lw = Math.max(2, Math.round(Math.min(W, H) * 0.006));
  ctx.save();
  ctx.strokeStyle = '#fff8f0';
  ctx.lineWidth = lw;
  ctx.shadowColor = 'rgba(20,4,24,0.55)';
  ctx.shadowBlur = Math.max(6, Math.min(W, H) * 0.02);
  ctx.shadowOffsetY = Math.max(2, Math.min(W, H) * 0.004);
  for (const r of rects) ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();
  // Outer frame line, just inside the canvas edge.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,248,240,0.9)';
  ctx.lineWidth = Math.max(2, lw * 0.8);
  ctx.strokeRect(g / 2, g / 2, W - g, H - g);
  ctx.restore();
}

/** Fill every panel rect with a warm placeholder when no photo is loaded. */
export function drawPanelPlaceholder(ctx, rect, label) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, '#3a1445');
  grad.addColorStop(0.55, '#8a2a5e');
  grad.addColorStop(1, '#e85d3d');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,244,230,0.85)';
  ctx.font = `600 ${Math.max(12, rect.w * 0.055)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}

/** Index of the panel rect containing point (x, y), or -1. */
export function hitPanel(rects, x, y) {
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}
