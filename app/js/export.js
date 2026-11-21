/* export.js — PNG export at the three common post sizes.
   Renders the same drawPoster call as the preview, offscreen,
   so the exported PNG is exactly what the preview shows. */
(function () {
  'use strict';
  var SCM = window.SCM = window.SCM || {};

  SCM.EXPORT_SIZES = [
    { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
    { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
    { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 }
  ];

  function sizeById(id) {
    for (var i = 0; i < SCM.EXPORT_SIZES.length; i++) if (SCM.EXPORT_SIZES[i].id === id) return SCM.EXPORT_SIZES[i];
    return SCM.EXPORT_SIZES[0];
  }
  SCM.sizeById = sizeById;

  /* Render the poster at export size and return the canvas. */
  function renderExport(state, images, size) {
    var canvas = document.createElement('canvas');
    canvas.width = size.w; canvas.height = size.h;
    var ctx = canvas.getContext('2d');
    SCM.drawPoster(ctx, size.w, size.h, state, images);
    return canvas;
  }
  SCM.renderExport = renderExport;

  /* One-click PNG download via an <a> element (local, no upload). */
  function exportPNG(state, images, sizeId) {
    var size = sizeById(sizeId);
    var canvas = renderExport(state, images, size);
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        if (!blob) { resolve(null); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'sunset-cover-' + size.w + 'x' + size.h + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
        resolve({ size: size, bytes: blob.size });
      }, 'image/png');
    });
  }
  SCM.exportPNG = exportPNG;
})();
