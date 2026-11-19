// export.js — renders the cover off-screen at a chosen post size and
// downloads it as a PNG. The same renderCover path powers the live preview,
// so what you see is exactly what you export.

import { layoutRects, drawPanelPhoto } from './panels.js';
import { applyGrade } from './grades.js';
import { drawCaption } from './caption.js';

export const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1920x1080': { w: 1920, h: 1080 },
};

export function renderCover(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#160a1e';
  ctx.fillRect(0, 0, width, height);
  const rects = layoutRects(state.template);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    const photo = state.photos[panel ? panel.photo : 0];
    if (photo && photo.img) drawPanelPhoto(ctx, photo.img, rect, panel, width, height);
  });
  applyGrade(ctx, state.grade, width, height, state.effects);
  drawCaption(ctx, state.caption, width, height);
  return canvas;
}

export function exportPng(state, sizeKey) {
  const size = EXPORT_SIZES[sizeKey];
  if (!size) throw new Error(`Unknown export size ${sizeKey}`);
  const canvas = renderCover(state, size.w, size.h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Export failed')); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sunset-cover-${sizeKey}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve({ sizeKey, width: size.w, height: size.h, bytes: blob.size });
    }, 'image/png');
  });
}
