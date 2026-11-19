// export.js — renders the whole cover to a canvas at any of the three post
// sizes and downloads it as a PNG. The preview uses the same renderer, so
// what you see is exactly what the PNG holds.
(function () {
  'use strict';

  var SIZES = {
    '1080x1080': { w: 1080, h: 1080, label: '1080 × 1080 · square' },
    '1080x1350': { w: 1080, h: 1350, label: '1080 × 1350 · portrait' },
    '1920x1080': { w: 1920, h: 1080, label: '1920 × 1080 · landscape' },
  };

  function sizeKeys() { return Object.keys(SIZES); }

  // Renders the full cover into `canvas` (resized to W x H). `state` is the
  // editor state: layout, grade, photos, panels, caption, effects.
  // Order: photos per panel -> grade wash -> vignette -> grain/halftone ->
  // panel frames + poster border -> caption on top.
  function renderCover(canvas, W, H, state) {
    var SCM = window.SCM;
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#12081c';
    ctx.fillRect(0, 0, W, H);

    var rects = SCM.layoutRects(state.layout, W, H);
    for (var i = 0; i < rects.length; i++) {
      var panel = state.panels[i] || SCM.defaultPanel();
      var photo = state.photos[panel.photo] || null;
      if (photo) {
        SCM.drawPanelPhoto(ctx, rects[i], photo.img, panel);
      } else {
        // Empty panel: warm placeholder gradient so the layout still reads.
        var g = ctx.createLinearGradient(rects[i].x, rects[i].y, rects[i].x + rects[i].w, rects[i].y + rects[i].h);
        g.addColorStop(0, '#3a1f52');
        g.addColorStop(1, '#1a0b26');
        ctx.fillStyle = g;
        ctx.fillRect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
      }
    }

    SCM.applyGrade(ctx, W, H, state.grade);
    SCM.vignette(ctx, W, H, 0.42);
    if (state.halftone) SCM.applyHalftone(ctx, W, H, 0.5);
    if (state.grain !== false) SCM.applyGrain(ctx, W, H, 0.35);

    // Panel frames: dark gutters + a thin poster border.
    if (state.frames !== false && rects.length > 1) {
      var gutter = Math.max(2, 0.012 * Math.min(W, H));
      ctx.save();
      ctx.strokeStyle = 'rgba(18,8,28,0.9)';
      ctx.lineWidth = gutter;
      rects.forEach(function (r) { ctx.strokeRect(r.x, r.y, r.w, r.h); });
      ctx.restore();
    }
    var border = Math.max(3, Math.min(W, H) * 0.006);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = border;
    ctx.strokeRect(border / 2, border / 2, W - border, H - border);
    ctx.restore();

    SCM.drawCaption(ctx, W, H, state.caption);
    return canvas;
  }

  function renderToCanvas(W, H, state) {
    var canvas = document.createElement('canvas');
    return renderCover(canvas, W, H, state);
  }

  // Renders at `sizeKey` and resolves to {canvas, width, height, blob}.
  function exportPNG(sizeKey, state) {
    var size = SIZES[sizeKey] || SIZES['1080x1350'];
    var canvas = renderToCanvas(size.w, size.h, state);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('PNG encoding failed'));
        resolve({ canvas: canvas, width: size.w, height: size.h, blob: blob });
      }, 'image/png');
    });
  }

  // Renders and triggers a browser download of the PNG.
  function downloadPNG(sizeKey, state) {
    return exportPNG(sizeKey, state).then(function (out) {
      var url = URL.createObjectURL(out.blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'sunset-cover-' + sizeKey + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      return out;
    });
  }

  window.SCM = window.SCM || {};
  window.SCM.sizes = SIZES;
  window.SCM.sizeKeys = sizeKeys;
  window.SCM.renderCover = renderCover;
  window.SCM.renderToCanvas = renderToCanvas;
  window.SCM.exportPNG = exportPNG;
  window.SCM.downloadPNG = downloadPNG;
})();
