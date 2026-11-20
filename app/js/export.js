// export.js — PNG export at the three post sizes. The export renders the
// exact same renderCover() the preview uses, at full size, after all
// photos have loaded in fixed order. Deterministic: same state, same
// bytes. No wall-clock, no randomness.
(function () {
  'use strict';

  var SIZES = [
    { w: 1920, h: 1080, label: 'wide' },
    { w: 1080, h: 1080, label: 'square' },
    { w: 1080, h: 1350, label: 'portrait' },
  ];

  function imagesMap() {
    // Photos.loadImage caches by src; resolve each distinct src once.
    var state = window.SunsetCover.state;
    var srcs = [];
    var seen = new Set();
    state.panels.forEach(function (p) {
      if (p.photo && !seen.has(p.photo)) { seen.add(p.photo); srcs.push(p.photo); }
    });
    return Promise.all(srcs.map(function (s) { return window.SunsetPhotos.loadImage(s); })).then(function (imgs) {
      var map = new Map();
      srcs.forEach(function (s, i) { map.set(s, imgs[i]); });
      return map;
    });
  }

  /** Render the cover at W x H and return a PNG data URL. */
  function exportDataURL(w, h) {
    return imagesMap().then(function (images) {
      var canvas = document.createElement('canvas');
      window.SunsetPoster.renderCover(canvas, w, h, window.SunsetCover.state, images);
      return canvas.toDataURL('image/png');
    });
  }

  /** Render the cover at W x H and trigger a browser download. */
  function exportPNG(w, h) {
    return exportDataURL(w, h).then(function (url) {
      var a = document.createElement('a');
      a.href = url;
      a.download = 'sunset-cover-' + w + 'x' + h + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return url;
    });
  }

  /** Render the cover into the preview canvas at its current size. */
  function renderPreviewInto(canvas) {
    return imagesMap().then(function (images) {
      window.SunsetPoster.renderCover(canvas, canvas.width, canvas.height, window.SunsetCover.state, images);
      return true;
    });
  }

  window.SunsetExport = { SIZES: SIZES, exportDataURL: exportDataURL, exportPNG: exportPNG, renderPreviewInto: renderPreviewInto };
})();
