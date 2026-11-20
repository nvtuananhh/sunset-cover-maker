// grades.js — the 9 colour grades. Each grade is a REAL canvas composite:
// a photo filter for the draw phase plus gradient overlays, halftone dots,
// deterministic grain and a vignette for the finish phase. Grain uses a
// fixed hash of (x, y) — no Math.random, no time — so two renders of the
// same state are pixel-identical.
(function () {
  'use strict';

  var GRADES = {
    'vice-sunset': {
      name: 'Vice Sunset', swatch: 'linear-gradient(135deg,#ffd23e,#ff7a1a 45%,#ff2e88)',
      filter: 'saturate(1.25) contrast(1.08)',
      overlays: [
        { op: 'overlay', alpha: 0.5, grad: ['#ff9a3d', '#ff2e88'] },
        { op: 'multiply', alpha: 0.22, grad: ['#7a1e6e', '#2a0f45'] },
      ],
    },
    'neon-nights': {
      name: 'Neon Nights', swatch: 'linear-gradient(135deg,#ff2e88,#2dd4ff)',
      filter: 'saturate(1.45) contrast(1.12)',
      overlays: [
        { op: 'screen', alpha: 0.30, grad: ['#ff2e88', '#7a1eff'] },
        { op: 'overlay', alpha: 0.28, grad: ['#00e5ff', '#ff2e88'] },
      ],
    },
    'golden-hour': {
      name: 'Golden Hour', swatch: 'linear-gradient(135deg,#ffe95e,#ff9a1f)',
      filter: 'saturate(1.2) brightness(1.06)',
      overlays: [
        { op: 'soft-light', alpha: 0.55, grad: ['#ffcf5e', '#ff7a1a'] },
        { op: 'screen', alpha: 0.12, grad: ['#fff3b0', '#ffd23e'] },
      ],
    },
    noir: {
      name: 'Noir', swatch: 'linear-gradient(135deg,#e8e8e8,#222)',
      filter: 'grayscale(1) contrast(1.22) brightness(1.05)',
      overlays: [{ op: 'multiply', alpha: 0.18, grad: ['#000000', '#333333'] }],
    },
    'coral-heat': {
      name: 'Coral Heat', swatch: 'linear-gradient(135deg,#ff8a5c,#e83e6b)',
      filter: 'saturate(1.35) contrast(1.06)',
      overlays: [
        { op: 'overlay', alpha: 0.45, grad: ['#ff8a5c', '#e83e6b'] },
        { op: 'screen', alpha: 0.10, grad: ['#ffd9a0', '#ff8a5c'] },
      ],
    },
    'palm-dusk': {
      name: 'Palm Dusk', swatch: 'linear-gradient(135deg,#b967ff,#2a0f45)',
      filter: 'saturate(1.15) contrast(1.1)',
      overlays: [
        { op: 'multiply', alpha: 0.30, grad: ['#4b1e7a', '#12082a'] },
        { op: 'overlay', alpha: 0.30, grad: ['#b967ff', '#ff7a1a'] },
      ],
    },
    'chrome-fade': {
      name: 'Chrome Fade', swatch: 'linear-gradient(135deg,#cfe8ff,#8fa8c8)',
      filter: 'saturate(0.55) contrast(1.05) brightness(1.06)',
      overlays: [{ op: 'soft-light', alpha: 0.35, grad: ['#cfe8ff', '#8fa8c8'] }],
    },
    'teal-noir': {
      name: 'Teal Noir', swatch: 'linear-gradient(135deg,#2dd4bf,#0f2a33)',
      filter: 'saturate(0.75) hue-rotate(125deg) contrast(1.1)',
      overlays: [
        { op: 'multiply', alpha: 0.28, grad: ['#0f766e', '#082a33'] },
        { op: 'overlay', alpha: 0.22, grad: ['#2dd4bf', '#134e4a'] },
      ],
    },
    bubblegum: {
      name: 'Bubblegum', swatch: 'linear-gradient(135deg,#ffb3d9,#ff7ad9)',
      filter: 'saturate(1.4) hue-rotate(-12deg) brightness(1.08)',
      overlays: [
        { op: 'screen', alpha: 0.25, grad: ['#ffb3d9', '#ff7ad9'] },
        { op: 'soft-light', alpha: 0.30, grad: ['#ff9ecf', '#ffd23e'] },
      ],
    },
  };

  var GRADE_ORDER = ['vice-sunset', 'neon-nights', 'golden-hour', 'noir', 'coral-heat', 'palm-dusk', 'chrome-fade', 'teal-noir', 'bubblegum'];

  /** Deterministic 0..1 hash of integer (x, y) — the grain's only "random". */
  function hash01(x, y) {
    var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  var grainTile = null;
  function grainCanvas() {
    if (grainTile) return grainTile;
    var c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    var g = c.getContext('2d');
    var img = g.createImageData(160, 160);
    for (var y = 0; y < 160; y++) {
      for (var x = 0; x < 160; x++) {
        var i = (y * 160 + x) * 4;
        var v = Math.floor(hash01(x, y) * 255);
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    grainTile = c;
    return c;
  }

  function photoFilter(gradeId) {
    var g = GRADES[gradeId] || GRADES['vice-sunset'];
    return g.filter || 'none';
  }

  /** Paint a grade's overlays over the panel union (already clipped). */
  function applyOverlays(ctx, W, H, gradeId) {
    var g = GRADES[gradeId] || GRADES['vice-sunset'];
    g.overlays.forEach(function (o) {
      var grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, o.grad[0]);
      grad.addColorStop(1, o.grad[1]);
      ctx.save();
      ctx.globalCompositeOperation = o.op;
      ctx.globalAlpha = o.alpha;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    });
  }

  /** Deterministic halftone dots over the panel union (already clipped). */
  function applyHalftone(ctx, W, H) {
    var step = Math.max(7, Math.round(W / 240));
    var u = W / 1920;
    ctx.save();
    ctx.fillStyle = 'rgba(26, 8, 40, 0.20)';
    for (var y = step / 2; y < H; y += step) {
      for (var x = step / 2; x < W; x += step) {
        var r = (0.6 + 0.9 * hash01(Math.round(x / step), Math.round(y / step))) * u * 1.1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function applyGrain(ctx, W, H) {
    var tile = grainCanvas();
    var pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function applyVignette(ctx, W, H) {
    var cx = W / 2;
    var cy = H / 2;
    var r = Math.sqrt(cx * cx + cy * cy);
    var grad = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
    grad.addColorStop(0, 'rgba(20, 5, 30, 0)');
    grad.addColorStop(1, 'rgba(20, 5, 30, 0.48)');
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  window.SunsetGrades = {
    GRADES: GRADES,
    GRADE_ORDER: GRADE_ORDER,
    photoFilter: photoFilter,
    applyOverlays: applyOverlays,
    applyHalftone: applyHalftone,
    applyGrain: applyGrain,
    applyVignette: applyVignette,
  };
})();
