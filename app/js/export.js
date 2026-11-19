// app/js/export.js — the shared cover painter + PNG export at the three
// post sizes. The live preview and the export use this same paintCover, so
// what you see is exactly what the PNG holds.
import { layoutRects, drawPanelPhoto, drawPanelFrames, drawPanelPlaceholder } from './panels.js';
import { applyGrade } from './grades.js';
import { drawCaption } from './caption.js';

export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square', sub: '1080 × 1080 · feed' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait', sub: '1080 × 1350 · portrait' },
  { id: '1920x1080', w: 1920, h: 1080, label: 'Wide', sub: '1920 × 1080 · story / banner' },
];

/** Look an export size up by id, defaulting to square. */
export function exportSizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[0];
}

/**
 * Paint the whole cover onto `ctx` at W x H from the editor state:
 * panels (photos or placeholders) -> frames -> grade + effects -> caption.
 * `photoById` maps photo ids to loaded HTMLImageElements.
 */
export function paintCover(ctx, W, H, state, photoById) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160619';
  ctx.fillRect(0, 0, W, H);
  const rects = layoutRects(state.layout, W, H);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    const img = panel && panel.photoId ? photoById.get(panel.photoId) : null;
    if (img) {
      drawPanelPhoto(ctx, img, rect, panel);
    } else {
      drawPanelPlaceholder(ctx, rect, `Panel ${i + 1}`);
    }
  });
  drawPanelFrames(ctx, rects, W, H);
  applyGrade(ctx, W, H, state.grade, state.effects);
  drawCaption(ctx, W, H, state.caption, state.layout);
  ctx.restore();
}

/** Render the cover at W x H onto a fresh canvas and return it. */
export function renderCoverCanvas(state, photoById, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  paintCover(canvas.getContext('2d'), w, h, state, photoById);
  return canvas;
}

/** Render the cover at W x H and resolve with a PNG data URL. */
export function exportCoverPng(state, photoById, w, h) {
  return new Promise((resolve, reject) => {
    const canvas = renderCoverCanvas(state, photoById, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('PNG export failed: no blob'));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('PNG export failed: could not read blob'));
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}

/** Render at the chosen size and trigger a browser download of the PNG. */
export async function downloadCoverPng(state, photoById, sizeId) {
  const size = exportSizeById(sizeId);
  const dataUrl = await exportCoverPng(state, photoById, size.w, size.h);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `sunset-cover-${size.id}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return { size, bytes: Math.round((dataUrl.length * 3) / 4) };
}
