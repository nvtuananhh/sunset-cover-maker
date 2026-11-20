// panels.js — the 7 layout templates, per-panel crop/position, and the
// face-aware focus point. Layout rects are fractions of the canvas, so one
// layout works at every export size. No wall-clock or randomness here.
(function () {
  'use strict';

  var DEFAULT_ROLES = ['THE CAPTAIN', 'THE NAVIGATOR', 'THE BOSS', 'THE DRIVER', 'THE LOOKOUT', 'THE FIXER'];

  // Each layout: name, blurb, and panel rects {x, y, w, h} in 0..1 fractions.
  // Rect order is the panel order; slot 0 is the hero wherever a hero exists.
  var LAYOUTS = {
    vice: {
      name: 'Vice Poster',
      blurb: '5-panel · pop-out hero',
      rects: [
        { x: 0.020, y: 0.105, w: 0.295, h: 0.335 }, // top-left
        { x: 0.685, y: 0.105, w: 0.295, h: 0.335 }, // top-right
        { x: 0.315, y: 0.060, w: 0.370, h: 0.520, hero: true }, // hero, centre
        { x: 0.020, y: 0.560, w: 0.295, h: 0.335 }, // bottom-left
        { x: 0.685, y: 0.560, w: 0.295, h: 0.335 }, // bottom-right
      ],
    },
    hero2: {
      name: 'Hero + 2',
      blurb: 'Big hero, two stacked',
      rects: [
        { x: 0.020, y: 0.085, w: 0.575, h: 0.810, hero: true },
        { x: 0.615, y: 0.085, w: 0.365, h: 0.395 },
        { x: 0.615, y: 0.500, w: 0.365, h: 0.395 },
      ],
    },
    mosaic4: {
      name: '4-Panel Mosaic',
      blurb: 'Even 2 × 2 grid',
      rects: [
        { x: 0.020, y: 0.085, w: 0.478, h: 0.405 },
        { x: 0.502, y: 0.085, w: 0.478, h: 0.405 },
        { x: 0.020, y: 0.494, w: 0.478, h: 0.401 },
        { x: 0.502, y: 0.494, w: 0.478, h: 0.401 },
      ],
    },
    fullbleed: {
      name: 'Full-Bleed Single',
      blurb: 'One photo, caption bar',
      rects: [{ x: 0.000, y: 0.000, w: 1.000, h: 1.000, hero: true }],
    },
    grid6: {
      name: 'Cast Grid',
      blurb: '6-panel 3 × 2',
      rects: [
        { x: 0.020, y: 0.085, w: 0.316, h: 0.405 },
        { x: 0.342, y: 0.085, w: 0.316, h: 0.405 },
        { x: 0.664, y: 0.085, w: 0.316, h: 0.405 },
        { x: 0.020, y: 0.494, w: 0.316, h: 0.401 },
        { x: 0.342, y: 0.494, w: 0.316, h: 0.401 },
        { x: 0.664, y: 0.494, w: 0.316, h: 0.401 },
      ],
    },
    slanted: {
      name: 'Slanted Panels',
      blurb: 'Diagonal cuts',
      slant: true,
      rects: [
        { x: 0.020, y: 0.085, w: 0.240, h: 0.810 },
        { x: 0.262, y: 0.085, w: 0.240, h: 0.810 },
        { x: 0.504, y: 0.085, w: 0.240, h: 0.810, hero: true },
        { x: 0.746, y: 0.085, w: 0.234, h: 0.810 },
      ],
    },
    popout: {
      name: 'Pop-Out Hero',
      blurb: 'Hero breaks the frame',
      rects: [
        { x: 0.020, y: 0.520, w: 0.300, h: 0.375 },
        { x: 0.680, y: 0.520, w: 0.300, h: 0.375 },
        { x: 0.285, y: 0.040, w: 0.430, h: 0.620, hero: true },
      ],
    },
  };

  var LAYOUT_ORDER = ['vice', 'hero2', 'mosaic4', 'fullbleed', 'grid6', 'slanted', 'popout'];

  function layoutRects(layoutId, W, H) {
    var layout = LAYOUTS[layoutId] || LAYOUTS.vice;
    return layout.rects.map(function (r) {
      return { x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H, hero: !!r.hero };
    });
  }

  function panelCount(layoutId) {
    return (LAYOUTS[layoutId] || LAYOUTS.vice).rects.length;
  }

  function makePanel(photoSrc, index) {
    return {
      photo: photoSrc || '',
      role: DEFAULT_ROLES[index % DEFAULT_ROLES.length],
      focus: { x: 0.5, y: 0.35 },
      zoom: 1,
      rot: 0,
      panX: 0,
      panY: 0,
    };
  }

  /**
   * Draw one photo into a rect, cover-fit, anchored on the panel's focus
   * point so a face set by clicking never gets cut. Zoom scales around the
   * focus; rotation pivots on the panel centre. Deterministic: pure math
   * on the stored focus/zoom/rotation, no randomness, no time.
   */
  function drawPhotoInto(ctx, img, rect, panel) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var scale = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
    var dw = iw * scale;
    var dh = ih * scale;
    // Focus point (fx, fy in photo fractions) lands on the panel centre.
    var cx = rect.x + rect.w / 2 + panel.panX * rect.w;
    var cy = rect.y + rect.h / 2 + panel.panY * rect.h;
    var dx = cx - panel.focus.x * dw;
    var dy = cy - panel.focus.y * dh;
    // Clamp so the photo always covers the rect (no empty edges).
    dx = Math.min(dx, rect.x);
    dx = Math.max(dx, rect.x + rect.w - dw);
    dy = Math.min(dy, rect.y);
    dy = Math.max(dy, rect.y + rect.h - dh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (panel.rot !== 0) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((panel.rot * Math.PI) / 180);
      ctx.drawImage(img, dx - (rect.x + rect.w / 2), dy - (rect.y + rect.h / 2), dw, dh);
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  /** Which panel rect contains point (px, py) in canvas pixels, or -1. */
  function panelAt(layoutId, W, H, px, py) {
    var rects = layoutRects(layoutId, W, H);
    for (var i = rects.length - 1; i >= 0; i--) {
      var r = rects[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
    }
    return -1;
  }

  window.SunsetPanels = {
    LAYOUTS: LAYOUTS,
    LAYOUT_ORDER: LAYOUT_ORDER,
    DEFAULT_ROLES: DEFAULT_ROLES,
    layoutRects: layoutRects,
    panelCount: panelCount,
    makePanel: makePanel,
    drawPhotoInto: drawPhotoInto,
    panelAt: panelAt,
  };
})();
