/* grades.js — the 9 colour grades. Each is a real canvas composite:
   gradient maps, duotone washes, halftone dots, grain and vignette.
   Grain is drawn from a fixed-seed PRNG, so the same render is
   byte-identical every time (no Math.random anywhere). */
(function () {
  'use strict';
  var SCM = window.SCM = window.SCM || {};

  SCM.GRADES = [
    { id: 'vice', name: 'Vice Sunset', warm: 0.34, magenta: 0.30, teal: 0.10, contrast: 1.12, sat: 1.25 },
    { id: 'neon', name: 'Neon Nights', warm: 0.10, magenta: 0.42, teal: 0.30, contrast: 1.15, sat: 1.35 },
    { id: 'golden', name: 'Golden Hour', warm: 0.50, magenta: 0.12, teal: 0.00, contrast: 1.08, sat: 1.22 },
    { id: 'noir', name: 'Noir', warm: 0.06, magenta: 0.06, teal: 0.06, contrast: 1.30, sat: 0.25 },
    { id: 'coral', name: 'Coral Heat', warm: 0.44, magenta: 0.22, teal: 0.00, contrast: 1.10, sat: 1.30 },
    { id: 'dusk', name: 'Palm Dusk', warm: 0.22, magenta: 0.34, teal: 0.22, contrast: 1.14, sat: 1.18 },
    { id: 'chrome', name: 'Chrome Fade', warm: 0.12, magenta: 0.16, teal: 0.18, contrast: 1.18, sat: 0.85 },
    { id: 'tealnoir', name: 'Teal Noir', warm: 0.02, magenta: 0.10, teal: 0.46, contrast: 1.22, sat: 0.95 },
    { id: 'bubble', name: 'Bubblegum', warm: 0.18, magenta: 0.48, teal: 0.06, contrast: 1.06, sat: 1.45 }
  ];

  function gradeById(id) {
    for (var i = 0; i < SCM.GRADES.length; i++) if (SCM.GRADES[i].id === id) return SCM.GRADES[i];
    return SCM.GRADES[0];
  }
  SCM.gradeById = gradeById;

  /* Fixed-seed PRNG (mulberry32). Same seed -> same grain on every render. */
  function seededRandom(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  SCM.seededRandom = seededRandom;

  var grainCache = {};
  /* A tileable grain tile, built once per size from the fixed seed. */
  function grainTile(size) {
    var key = String(size);
    if (grainCache[key]) return grainCache[key];
    var tile = document.createElement('canvas');
    tile.width = size; tile.height = size;
    var tctx = tile.getContext('2d');
    var img = tctx.createImageData(size, size);
    var rnd = seededRandom(20261121);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = Math.floor(rnd() * 255);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    grainCache[key] = tile;
    return tile;
  }

  /* Warm / magenta / teal wash + contrast lift over one panel rect. */
  function applyGradeWash(ctx, x, y, w, h, grade) {
    if (grade.warm > 0) {
      var warm = ctx.createLinearGradient(x, y, x, y + h);
      warm.addColorStop(0, 'rgba(255,122,24,' + (grade.warm * 0.55).toFixed(3) + ')');
      warm.addColorStop(1, 'rgba(255,45,120,' + (grade.warm * 0.4).toFixed(3) + ')');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = warm; ctx.fillRect(x, y, w, h);
    }
    if (grade.magenta > 0) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255,0,110,' + grade.magenta.toFixed(3) + ')';
      ctx.fillRect(x, y, w, h);
    }
    if (grade.teal > 0) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(20,180,170,' + grade.teal.toFixed(3) + ')';
      ctx.fillRect(x, y, w, h);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  SCM.applyGradeWash = applyGradeWash;

  /* Halftone dots in the shadows of a rect (fixed grid, deterministic). */
  function applyHalftone(ctx, x, y, w, h) {
    var step = Math.max(7, Math.round(w / 160));
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#1a0512';
    for (var gy = y + step / 2; gy < y + h; gy += step) {
      for (var gx = x + step / 2; gx < x + w; gx += step) {
        var r = step * 0.16 + ((gx + gy) % (step * 2)) / (step * 2) * step * 0.14;
        ctx.beginPath(); ctx.arc(gx, gy, r, 0, 6.2832); ctx.fill();
      }
    }
    ctx.restore();
  }
  SCM.applyHalftone = applyHalftone;

  /* Full-poster grade pass: global wash, grain, vignette. */
  function applyPosterGrade(ctx, W, H, grade, opts) {
    opts = opts || {};
    applyGradeWash(ctx, 0, 0, W, H, { warm: grade.warm * 0.45, magenta: grade.magenta * 0.45, teal: grade.teal * 0.45, contrast: 1, sat: 1 });
    if (opts.halftone) applyHalftone(ctx, 0, 0, W, H);
    if (opts.grain !== false) {
      var tile = grainTile(128);
      var pat = ctx.createPattern(tile, 'repeat');
      ctx.save(); ctx.globalAlpha = 0.05; ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(10,2,8,0)');
    vg.addColorStop(1, 'rgba(10,2,8,0.42)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  SCM.applyPosterGrade = applyPosterGrade;
})();
