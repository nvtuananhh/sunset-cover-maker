// panels.js — layout templates and per-panel photo drawing (crop, pan, zoom, rotate).
// A layout is a list of panel rects in unit coordinates (0..1 of the cover).
// Each panel keeps its own photo index and crop transform in state.panels[i].

export const LAYOUTS = {
  hero: [
    { x: 0, y: 0, w: 1, h: 0.62 },
    { x: 0, y: 0.64, w: 0.49, h: 0.36 },
    { x: 0.51, y: 0.64, w: 0.49, h: 0.36 },
  ],
  mosaic: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
  fullbleed: [{ x: 0, y: 0, w: 1, h: 1 }],
};

export function layoutRects(template) {
  return LAYOUTS[template] || LAYOUTS.hero;
}

export function panelCount(template) {
  return layoutRects(template).length;
}

export function defaultPanel(photoIndex) {
  return { photo: photoIndex, zoom: 1, panX: 0, panY: 0, rot: 0 };
}

// Draw one photo into a panel rect with cover-fit, pan, zoom and rotation.
export function drawPanelPhoto(ctx, img, rect, panel, width, height) {
  const px = rect.x * width;
  const py = rect.y * height;
  const pw = rect.w * width;
  const ph = rect.h * height;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  ctx.translate(px + pw / 2 + panel.panX, py + ph / 2 + panel.panY);
  ctx.rotate((panel.rot * Math.PI) / 180);
  const scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  // Thin panel gutter line so the multi-panel look reads at any size.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, width * 0.004);
  ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
  ctx.restore();
}

// Which panel (if any) contains a point given in canvas pixels.
export function panelAt(template, x, y, width, height) {
  const rects = layoutRects(template);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x * width && x < (r.x + r.w) * width && y >= r.y * height && y < (r.y + r.h) * height) return i;
  }
  return -1;
}
