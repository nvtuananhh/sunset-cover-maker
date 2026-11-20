// PNG export at the three post sizes. The same drawPoster call renders
// the preview and every export, so what you see is what the PNG holds.
import { drawPoster } from './poster.js';

export const EXPORT_SIZES = [
  { id: '1920x1080', w: 1920, h: 1080, label: '1920 × 1080 · Landscape' },
  { id: '1080x1080', w: 1080, h: 1080, label: '1080 × 1080 · Square' },
  { id: '1080x1350', w: 1080, h: 1350, label: '1080 × 1350 · Portrait' },
];

export function findExportSize(sizeId) {
  return EXPORT_SIZES.find((s) => s.id === sizeId) || EXPORT_SIZES[0];
}

/** Render the cover at W x H and return the canvas (not yet downloaded). */
export function renderExportCanvas(state, images, sizeId) {
  const size = findExportSize(sizeId);
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  drawPoster(ctx, size.w, size.h, state, images);
  return canvas;
}

/** Render + download the PNG for one size; resolves with the blob. */
export function exportCoverPNG(state, images, sizeId) {
  return new Promise((resolve, reject) => {
    const canvas = renderExportCanvas(state, images, sizeId);
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('PNG export failed')); return; }
      const size = findExportSize(sizeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sunset-cover-' + size.id + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(blob);
    }, 'image/png');
  });
}

/** Render + return a data URL (used by the screenshot tooling, no download). */
export function exportCoverDataURL(state, images, sizeId, type, quality) {
  const canvas = renderExportCanvas(state, images, sizeId);
  return canvas.toDataURL(type || 'image/png', quality);
}
