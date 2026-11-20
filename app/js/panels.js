// Layout templates + per-panel crop, position and focus point.
// Every layout returns panel rects as fractions of the cover (x, y, w, h),
// a hero index, and whether the hero pops out of its frame. The renderer
// draws panels in order and the hero last so it overlaps the title band.
import { DEFAULT_CAST, DEFAULT_ROLES } from './samples.js';

export const LAYOUTS = [
  { id: 'vice', name: 'Vice Poster', desc: '5-panel · pop-out hero', panels: 5 },
  { id: 'hero2', name: 'Hero + 2', desc: 'big hero, 2 side', panels: 3 },
  { id: 'mosaic4', name: 'Mosaic 4', desc: '2 × 2 grid', panels: 4 },
  { id: 'fullbleed', name: 'Full Bleed', desc: 'one photo, caption bar', panels: 1 },
  { id: 'cast6', name: 'Cast Grid 6', desc: '3 × 2 cast grid', panels: 6 },
  { id: 'slanted', name: 'Slanted', desc: 'diagonal cuts', panels: 5 },
  { id: 'popout', name: 'Pop-Out Hero', desc: 'hero breaks frame', panels: 3 },
];

/** Fresh panel state for a layout: photo, crop, focus, role tag. */
export function makePanels(layoutId) {
  const layout = LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0];
  const cast = ['hero-woman', 'boss-man', 'driver-woman', 'rider-man', 'marina', 'beach-duo'];
  const panels = [];
  for (let i = 0; i < layout.panels; i++) {
    panels.push({
      photoId: cast[i % cast.length],
      zoom: 1.15, panX: 0, panY: 0, rotate: 0,
      focusX: 0.5, focusY: 0.32,
      role: DEFAULT_ROLES[i % DEFAULT_ROLES.length],
    });
  }
  // Vice Poster default cast: driver / boss / hero / lookout / marina.
  if (layoutId === 'vice') {
    DEFAULT_CAST.forEach((id, i) => { if (panels[i]) panels[i].photoId = id; });
    panels[0].role = 'THE DRIVER'; panels[1].role = 'THE BOSS';
    panels[2].role = 'THE CAPTAIN'; panels[3].role = 'THE LOOKOUT';
    panels[4].role = 'THE NAVIGATOR';
  }
  return panels;
}

/** Panel rectangles for a layout, as fractions of (W, H). Hero is index 2 in vice. */
export function layoutRects(layoutId, aspect) {
  // aspect = W / H. Portrait covers stack the panels tighter.
  const portrait = aspect < 1;
  switch (layoutId) {
    case 'hero2':
      return portrait
        ? [{ x: 0.04, y: 0.10, w: 0.92, h: 0.52 }, { x: 0.04, y: 0.64, w: 0.45, h: 0.24 }, { x: 0.51, y: 0.64, w: 0.45, h: 0.24 }]
        : [{ x: 0.03, y: 0.09, w: 0.62, h: 0.79 }, { x: 0.67, y: 0.09, w: 0.30, h: 0.385 }, { x: 0.67, y: 0.495, w: 0.30, h: 0.385 }];
    case 'mosaic4':
      return [
        { x: 0.03, y: 0.09, w: 0.47, h: 0.40 }, { x: 0.50, y: 0.09, w: 0.47, h: 0.40 },
        { x: 0.03, y: 0.50, w: 0.47, h: 0.38 }, { x: 0.50, y: 0.50, w: 0.47, h: 0.38 },
      ];
    case 'fullbleed':
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    case 'cast6':
      return portrait
        ? [{ x: 0.03, y: 0.09, w: 0.47, h: 0.26 }, { x: 0.50, y: 0.09, w: 0.47, h: 0.26 },
           { x: 0.03, y: 0.36, w: 0.47, h: 0.26 }, { x: 0.50, y: 0.36, w: 0.47, h: 0.26 },
           { x: 0.03, y: 0.63, w: 0.47, h: 0.25 }, { x: 0.50, y: 0.63, w: 0.47, h: 0.25 }]
        : [{ x: 0.03, y: 0.09, w: 0.31, h: 0.40 }, { x: 0.345, y: 0.09, w: 0.31, h: 0.40 }, { x: 0.66, y: 0.09, w: 0.31, h: 0.40 },
           { x: 0.03, y: 0.50, w: 0.31, h: 0.38 }, { x: 0.345, y: 0.50, w: 0.31, h: 0.38 }, { x: 0.66, y: 0.50, w: 0.31, h: 0.38 }];
    case 'slanted':
      return [
        { x: 0.02, y: 0.09, w: 0.20, h: 0.79 }, { x: 0.21, y: 0.09, w: 0.20, h: 0.79 },
        { x: 0.40, y: 0.06, w: 0.20, h: 0.85 }, { x: 0.59, y: 0.09, w: 0.20, h: 0.79 },
        { x: 0.78, y: 0.09, w: 0.20, h: 0.79 },
      ];
    case 'popout':
      return portrait
        ? [{ x: 0.04, y: 0.10, w: 0.44, h: 0.50 }, { x: 0.52, y: 0.10, w: 0.44, h: 0.50 }, { x: 0.20, y: 0.30, w: 0.60, h: 0.55 }]
        : [{ x: 0.03, y: 0.12, w: 0.28, h: 0.76 }, { x: 0.69, y: 0.12, w: 0.28, h: 0.76 }, { x: 0.31, y: 0.05, w: 0.38, h: 0.83 }];
    case 'vice':
    default:
      return portrait
        ? [{ x: 0.03, y: 0.09, w: 0.45, h: 0.19 }, { x: 0.52, y: 0.09, w: 0.45, h: 0.19 },
           { x: 0.16, y: 0.30, w: 0.68, h: 0.40 }, { x: 0.03, y: 0.71, w: 0.45, h: 0.18 },
           { x: 0.52, y: 0.71, w: 0.45, h: 0.18 }]
        : [{ x: 0.03, y: 0.10, w: 0.225, h: 0.42 }, { x: 0.745, y: 0.10, w: 0.225, h: 0.42 },
           { x: 0.335, y: 0.06, w: 0.33, h: 0.62 }, { x: 0.03, y: 0.54, w: 0.225, h: 0.34 },
           { x: 0.745, y: 0.54, w: 0.225, h: 0.34 }];
  }
}

/** Index of the pop-out hero panel for a layout, or -1. */
export function heroIndex(layoutId) {
  if (layoutId === 'vice') return 2;
  if (layoutId === 'hero2') return 0;
  if (layoutId === 'popout') return 2;
  if (layoutId === 'slanted') return 2;
  return -1;
}

/** Clip path for one panel (slanted layout gets diagonal cuts). */
export function panelClipPath(ctx, rect, layoutId, index) {
  ctx.beginPath();
  if (layoutId === 'slanted') {
    const s = rect.w * 0.14;
    ctx.moveTo(rect.x + s, rect.y);
    ctx.lineTo(rect.x + rect.w, rect.y);
    ctx.lineTo(rect.x + rect.w - s, rect.y + rect.h);
    ctx.lineTo(rect.x, rect.y + rect.h);
    ctx.closePath();
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
}

/** Draw one photo into its panel rect: cover-fit anchored on the focus
 *  point, with zoom, pan and rotation. Faces are never cut by the crop
 *  because the visible window is centred on (focusX, focusY). */
export function drawPanelPhoto(ctx, img, panel, rect) {
  if (!img || !img.naturalWidth) return;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
  const dw = iw * scale, dh = ih * scale;
  // Anchor: the focus point of the photo maps to the focus point of the rect.
  const fx = panel.focusX, fy = panel.focusY;
  let dx = rect.x + rect.w * fx - dw * fx + panel.panX * rect.w;
  let dy = rect.y + rect.h * fy - dh * fy + panel.panY * rect.h;
  // Clamp so the photo always covers the rect.
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate((panel.rotate * Math.PI) / 180);
  ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Hit-test a point (px) against panel rects; returns the panel index or -1. */
export function panelAtPoint(rects, px, py) {
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
