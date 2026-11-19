// grades.js — colour grades as real canvas composites (gradient maps,
// duotone washes, vignette, grain, halftone). Each grade is drawn over the
// photos, never a CSS filter, so it survives into the exported PNG.
(function () {
  'use strict';

  var GRADES = {
    sunset: { label: 'Vice Sunset' },
    neon: { label: 'Neon Nights' },
    golden: { label: 'Golden Hour' },
    noir: { label: 'Noir' },
  };

  function gradeNames() { return Object.keys(GRADES); }

  function linGrad(ctx, x0, y0, x1, y1, stops) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    return g;
  }

  // Warm orange/pink wash + low sun glow.
  function gradeSunset(ctx, W, H) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = linGrad(ctx, 0, 0, W, H, [
      [0, 'rgba(255,122,61,0.85)'], [0.55, 'rgba(255,77,141,0.7)'], [1, 'rgba(123,47,247,0.6)'],
    ]);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = linGrad(ctx, 0, H * 0.55, 0, H, [
      [0, 'rgba(255,140,60,0)'], [1, 'rgba(255,90,40,0.55)'],
    ]);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    var glow = ctx.createRadialGradient(W * 0.68, H * 0.62, 0, W * 0.68, H * 0.62, Math.max(W, H) * 0.55);
    glow.addColorStop(0, 'rgba(255,196,107,0.34)');
    glow.addColorStop(1, 'rgba(255,196,107,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Magenta/cyan duotone with a neon glow.
  function gradeNeon(ctx, W, H) {
    ctx.save();
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = linGrad(ctx, 0, 0, W, H, [
      [0, 'rgba(255,47,179,0.9)'], [0.5, 'rgba(150,60,220,0.8)'], [1, 'rgba(55,224,200,0.9)'],
    ]);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [
      [0, 'rgba(255,47,179,0.35)'], [1, 'rgba(20,220,230,0.3)'],
    ]);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    var glow = ctx.createRadialGradient(W * 0.3, H * 0.3, 0, W * 0.3, H * 0.3, Math.max(W, H) * 0.5);
    glow.addColorStop(0, 'rgba(255,47,179,0.28)');
    glow.addColorStop(1, 'rgba(255,47,179,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Warm gold wash + soft haze.
  function gradeGolden(ctx, W, H) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = linGrad(ctx, 0, 0, W, H, [
      [0, 'rgba(255,217,138,0.9)'], [0.6, 'rgba(255,154,61,0.75)'], [1, 'rgba(178,90,30,0.6)'],
    ]);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    var haze = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.6);
    haze.addColorStop(0, 'rgba(255,240,200,0.22)');
    haze.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // High-contrast black & white with a single pink accent wash.
  function gradeNoir(ctx, W, H) {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = linGrad(ctx, 0, 0, 0, H, [
      [0, 'rgba(255,255,255,0.28)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)'],
    ]);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = linGrad(ctx, W, 0, 0, H, [
      [0, 'rgba(255,77,141,0.5)'], [1, 'rgba(255,77,141,0)'],
    ]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  var GRADE_FNS = { sunset: gradeSunset, neon: gradeNeon, golden: gradeGolden, noir: gradeNoir };

  function applyGrade(ctx, W, H, grade) {
    (GRADE_FNS[grade] || gradeSunset)(ctx, W, H);
  }

  // Darkened corners so the caption and panels read as one poster.
  function vignette(ctx, W, H, strength) {
    var g = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75
    );
    g.addColorStop(0, 'rgba(10,4,18,0)');
    g.addColorStop(1, 'rgba(10,4,18,' + strength + ')');
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Seeded film grain, tiled from one small noise canvas.
  var grainTile = null;
  function grainCanvas() {
    if (grainTile) return grainTile;
    var c = document.createElement('canvas');
    c.width = 140; c.height = 140;
    var g = c.getContext('2d');
    var img = g.createImageData(140, 140);
    var seed = 20261119;
    for (var i = 0; i < img.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      var v = seed % 256;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grainTile = c;
    return c;
  }

  function applyGrain(ctx, W, H, alpha) {
    var tile = grainCanvas();
    var pat = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Halftone dot screen, denser toward the bottom of the cover.
  function applyHalftone(ctx, W, H, alpha) {
    var step = Math.max(9, Math.round(Math.min(W, H) / 90));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#12081c';
    for (var y = step / 2; y < H; y += step) {
      var rowT = y / H;
      for (var x = step / 2; x < W; x += step) {
        var r = step * 0.16 + rowT * step * 0.22;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  window.SCM = window.SCM || {};
  window.SCM.grades = GRADES;
  window.SCM.gradeNames = gradeNames;
  window.SCM.applyGrade = applyGrade;
  window.SCM.vignette = vignette;
  window.SCM.applyGrain = applyGrain;
  window.SCM.applyHalftone = applyHalftone;
})();
