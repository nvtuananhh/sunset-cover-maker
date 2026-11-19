// panels.js — the three layout templates and per-panel photo placement.
// A layout is a list of panel rectangles in fractions of the cover size, so
// the same template works at 1080x1080, 1080x1350 and 1920x1080.
(function () {
  'use strict';

  var GUTTER = 0.012; // fraction of the shorter side, between panels

  var LAYOUTS = {
    hero: {
      label: 'Hero + 2 panels',
      panelCount: 3,
      rects: function (W, H) {
        var g = GUTTER * Math.min(W, H);
        var split = W * 0.62;
        return [
          { x: 0, y: 0, w: split - g / 2, h: H },
          { x: split + g / 2, y: 0, w: W - split - g / 2, h: H / 2 - g / 2 },
          { x: split + g / 2, y: H / 2 + g / 2, w: W - split - g / 2, h: H / 2 - g / 2 },
        ];
      },
    },
    mosaic: {
      label: '4-panel mosaic',
      panelCount: 4,
      rects: function (W, H) {
        var g = GUTTER * Math.min(W, H);
        var hw = (W - g) / 2;
        var hh = (H - g) / 2;
        return [
          { x: 0, y: 0, w: hw, h: hh },
          { x: hw + g, y: 0, w: hw, h: hh },
          { x: 0, y: hh + g, w: hw, h: hh },
          { x: hw + g, y: hh + g, w: hw, h: hh },
        ];
      },
    },
    fullbleed: {
      label: 'Full-bleed + caption bar',
      panelCount: 1,
      rects: function (W, H) {
        return [{ x: 0, y: 0, w: W, h: H }];
      },
    },
  };

  function layoutNames() { return Object.keys(LAYOUTS); }
  function panelCount(layout) { return LAYOUTS[layout].panelCount; }

  function layoutRects(layout, W, H) {
    var def = LAYOUTS[layout] || LAYOUTS.hero;
    return def.rects(W, H);
  }

  // Default per-panel transform: no zoom, centred, upright.
  function defaultPanel() {
    return { photo: 0, zoom: 1, ox: 0, oy: 0, rot: 0 };
  }

  // Draws one photo into one panel rect, cover-fit, with the panel's
  // zoom / pan / rotation applied. The photo is clipped to the rect.
  function drawPanelPhoto(ctx, rect, img, panel) {
    if (!img) return;
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var base = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
    var dw = iw * base;
    var dh = ih * base;
    var cx = rect.x + rect.w / 2 + panel.ox * rect.w;
    var cy = rect.y + rect.h / 2 + panel.oy * rect.h;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.translate(cx, cy);
    if (panel.rot) ctx.rotate((panel.rot * Math.PI) / 180);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  // Which panel (index) contains point (x, y) in cover pixels, or -1.
  function hitPanel(rects, x, y) {
    for (var i = rects.length - 1; i >= 0; i--) {
      var r = rects[i];
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
    }
    return -1;
  }

  window.SCM = window.SCM || {};
  window.SCM.layouts = LAYOUTS;
  window.SCM.layoutNames = layoutNames;
  window.SCM.panelCount = panelCount;
  window.SCM.layoutRects = layoutRects;
  window.SCM.defaultPanel = defaultPanel;
  window.SCM.drawPanelPhoto = drawPanelPhoto;
  window.SCM.hitPanel = hitPanel;
})();
