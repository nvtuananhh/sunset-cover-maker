/* panels.js — the 8 layout templates, per-panel crop / position /
   focus point, and the cover-fit draw that anchors on the focus so
   faces are never cut. */
(function () {
  'use strict';
  var SCM = window.SCM = window.SCM || {};

  SCM.DEFAULT_ROLES = ['THE CAPTAIN', 'THE NAVIGATOR', 'THE BOSS', 'THE DRIVER', 'THE LOOKOUT', 'THE FIXER', 'THE ARTIST'];
  SCM.DEFAULT_CALLOUTS = [
    'Downtown Vice — 6 PM', 'The Boss runs the coast', 'Getaway driver',
    'Lookout on the rooftop', 'Marina at dusk', 'The fixer knows a guy', 'Sunset Strip'
  ];

  /* Rects are normalised (0..1) inside the poster area; hero panels
     carry pop: true and are drawn breaking the frame into the title band. */
  SCM.LAYOUTS = [
    { id: 'vice', name: 'Vice Poster', panels: [
      { x: 0.330, y: 0.085, w: 0.340, h: 0.700, hero: true },
      { x: 0.015, y: 0.085, w: 0.300, h: 0.315 },
      { x: 0.685, y: 0.085, w: 0.300, h: 0.315 },
      { x: 0.015, y: 0.420, w: 0.300, h: 0.300 },
      { x: 0.685, y: 0.420, w: 0.300, h: 0.300 }
    ]},
    { id: 'hero2', name: 'Hero + 2', panels: [
      { x: 0.015, y: 0.085, w: 0.540, h: 0.700, hero: true },
      { x: 0.575, y: 0.085, w: 0.410, h: 0.315 },
      { x: 0.575, y: 0.420, w: 0.410, h: 0.300 }
    ]},
    { id: 'mosaic4', name: '4-Panel Mosaic', panels: [
      { x: 0.015, y: 0.085, w: 0.478, h: 0.315 },
      { x: 0.507, y: 0.085, w: 0.478, h: 0.315 },
      { x: 0.015, y: 0.420, w: 0.478, h: 0.300 },
      { x: 0.507, y: 0.420, w: 0.478, h: 0.300 }
    ]},
    { id: 'fullbleed', name: 'Full-Bleed', panels: [
      { x: 0.015, y: 0.085, w: 0.970, h: 0.635, hero: true }
    ]},
    { id: 'cast6', name: '6-Panel Cast', panels: [
      { x: 0.015, y: 0.085, w: 0.315, h: 0.315 },
      { x: 0.343, y: 0.085, w: 0.315, h: 0.315 },
      { x: 0.670, y: 0.085, w: 0.315, h: 0.315 },
      { x: 0.015, y: 0.420, w: 0.315, h: 0.300 },
      { x: 0.343, y: 0.420, w: 0.315, h: 0.300 },
      { x: 0.670, y: 0.420, w: 0.315, h: 0.300 }
    ]},
    { id: 'slanted', name: 'Slanted Panels', panels: [
      { x: 0.015, y: 0.085, w: 0.320, h: 0.635, slant: 0.05 },
      { x: 0.300, y: 0.085, w: 0.320, h: 0.635, slant: 0.05, hero: true },
      { x: 0.585, y: 0.085, w: 0.400, h: 0.635, slant: 0.05 }
    ]},
    { id: 'popout', name: 'Pop-Out Hero', panels: [
      { x: 0.275, y: 0.060, w: 0.450, h: 0.760, hero: true },
      { x: 0.015, y: 0.085, w: 0.240, h: 0.315 },
      { x: 0.745, y: 0.085, w: 0.240, h: 0.315 },
      { x: 0.015, y: 0.420, w: 0.240, h: 0.300 },
      { x: 0.745, y: 0.420, w: 0.240, h: 0.300 }
    ]},
    { id: 'epic7', name: 'Seven-Panel Epic', panels: [
      { x: 0.360, y: 0.060, w: 0.280, h: 0.760, hero: true },
      { x: 0.015, y: 0.085, w: 0.165, h: 0.200 },
      { x: 0.190, y: 0.085, w: 0.160, h: 0.200 },
      { x: 0.650, y: 0.085, w: 0.160, h: 0.200 },
      { x: 0.820, y: 0.085, w: 0.165, h: 0.200 },
      { x: 0.015, y: 0.520, w: 0.165, h: 0.200 },
      { x: 0.820, y: 0.520, w: 0.165, h: 0.200 }
    ]}
  ];

  function layoutById(id) {
    for (var i = 0; i < SCM.LAYOUTS.length; i++) if (SCM.LAYOUTS[i].id === id) return SCM.LAYOUTS[i];
    return SCM.LAYOUTS[0];
  }
  SCM.layoutById = layoutById;

  function defaultPanels(layoutId) {
    var layout = layoutById(layoutId);
    var cast = SCM.DEFAULT_CAST;
    return layout.panels.map(function (p, i) {
      return {
        photoId: null, photoFile: cast[i % cast.length],
        focusX: 0.5, focusY: 0.32, zoom: 1, rotate: 0,
        role: SCM.DEFAULT_ROLES[i % SCM.DEFAULT_ROLES.length],
        callout: SCM.DEFAULT_CALLOUTS[i % SCM.DEFAULT_CALLOUTS.length],
        hero: !!p.hero
      };
    });
  }
  SCM.defaultPanels = defaultPanels;

  /* Pixel rects for a layout inside the poster area (after the frame). */
  function panelRects(layoutId, area) {
    var layout = layoutById(layoutId);
    return layout.panels.map(function (p) {
      return {
        x: area.x + p.x * area.w, y: area.y + p.y * area.h,
        w: p.w * area.w, h: p.h * area.h,
        hero: !!p.hero, slant: p.slant || 0
      };
    });
  }
  SCM.panelRects = panelRects;

  /* Cover-fit draw anchored on the focus point, with zoom + rotation.
     The visible source window is centred on (focusX, focusY) and
     clamped inside the image, so a face at the focus is never cut. */
  function drawPanelImage(ctx, img, rect, panel) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var zoom = panel.zoom || 1;
    var scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
    var sw = rect.w / scale, sh = rect.h / scale;
    var cx = (panel.focusX == null ? 0.5 : panel.focusX) * iw;
    var cy = (panel.focusY == null ? 0.32 : panel.focusY) * ih;
    var sx = Math.min(Math.max(cx - sw / 2, 0), iw - sw);
    var sy = Math.min(Math.max(cy - sh / 2, 0), ih - sh);
    ctx.save();
    ctx.beginPath();
    if (rect.slant) {
      var s = rect.slant * rect.w;
      ctx.moveTo(rect.x + s, rect.y); ctx.lineTo(rect.x + rect.w, rect.y);
      ctx.lineTo(rect.x + rect.w - s, rect.y + rect.h); ctx.lineTo(rect.x, rect.y + rect.h);
    } else {
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.clip();
    if (panel.rotate) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((panel.rotate * Math.PI) / 180);
      ctx.drawImage(img, sx, sy, sw, sh, -rect.w / 2 - 4, -rect.h / 2 - 4, rect.w + 8, rect.h + 8);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
  }
  SCM.drawPanelImage = drawPanelImage;
})();
