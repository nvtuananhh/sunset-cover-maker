// poster.js — the cover renderer and poster furniture: quote bar, role
// tags, chrome title + script subtitle + tagline pill, billing block,
// barcode, gold seal, VOL. 1 / SEASON ONE / status labels. One pure
// function of (canvas, W, H, state, loaded images): same inputs, same
// pixels, every run. No wall-clock, no randomness.
(function () {
  'use strict';

  var Panels = window.SunsetPanels;
  var Grades = window.SunsetGrades;
  var Caption = window.SunsetCaption;

  function slantPath(ctx, r, W) {
    // Parallelogram: top edge shifted right, bottom edge shifted left.
    var s = r.w * 0.09;
    ctx.beginPath();
    ctx.moveTo(r.x + s, r.y);
    ctx.lineTo(r.x + r.w, r.y);
    ctx.lineTo(r.x + r.w - s, r.y + r.h);
    ctx.lineTo(r.x, r.y + r.h);
    ctx.closePath();
  }

  function clipPanels(ctx, rects, slanted) {
    ctx.beginPath();
    rects.forEach(function (r) {
      if (slanted) slantPath(ctx, r, 0);
      else ctx.rect(r.x, r.y, r.w, r.h);
    });
    ctx.clip();
  }

  function drawBackground(ctx, W, H) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0.0, '#2a0f45');
    g.addColorStop(0.35, '#7a1e6e');
    g.addColorStop(0.55, '#ff7a1a');
    g.addColorStop(0.75, '#3d1150');
    g.addColorStop(1.0, '#160a24');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Sun glow behind the hero.
    var sun = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.42);
    sun.addColorStop(0, 'rgba(255, 214, 92, 0.55)');
    sun.addColorStop(0.5, 'rgba(255, 122, 26, 0.18)');
    sun.addColorStop(1, 'rgba(255, 122, 26, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, W, H);
  }

  function drawRoleTag(ctx, rect, role, W) {
    if (!role) return;
    var size = Math.max(11, W * 0.0155);
    ctx.save();
    ctx.font = '700 ' + size + 'px ' + Caption.TITLE_FAMILY;
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = (W * 0.0015) + 'px';
    var tw = ctx.measureText(role).width + size * 1.5;
    var th = size * 1.9;
    var x = rect.x + Math.max(4, W * 0.006);
    var y = rect.y + rect.h - th - Math.max(4, W * 0.006);
    ctx.fillStyle = 'rgba(12, 5, 20, 0.92)';
    ctx.fillRect(x, y, tw, th);
    ctx.strokeStyle = '#fff3e0';
    ctx.lineWidth = Math.max(1, W * 0.0008);
    ctx.strokeRect(x, y, tw, th);
    ctx.fillStyle = '#fff3e0';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(role, x + size * 0.75, y + th / 2 + size * 0.05);
    ctx.restore();
  }

  function drawQuoteBar(ctx, W, H, state) {
    if (!state.showQuote) return;
    var size = Math.max(12, W * 0.017);
    var y = H * 0.012;
    var stars = '★★★★★';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = size + 'px sans-serif';
    ctx.fillStyle = '#ffc93c';
    var sw = ctx.measureText(stars).width;
    ctx.font = '700 ' + size + 'px ' + Caption.TITLE_FAMILY;
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = (W * 0.002) + 'px';
    var qw = ctx.measureText('“' + state.quote + '”').width;
    var srcSize = Math.max(10, size * 0.72);
    ctx.font = '700 ' + srcSize + 'px ' + Caption.TITLE_FAMILY;
    var srcW = ctx.measureText('— ' + state.quoteSource).width;
    var total = sw + qw + srcW + size * 3.2;
    var x0 = (W - total) / 2;
    ctx.fillStyle = 'rgba(12, 5, 20, 0.72)';
    Caption.roundRect(ctx, x0 - size, y, total + size * 2, size * 2.1, size);
    ctx.fill();
    var cx = x0;
    ctx.font = size + 'px sans-serif';
    ctx.fillStyle = '#ffc93c';
    ctx.textAlign = 'left';
    ctx.fillText(stars, cx, y + size * 1.05);
    cx += sw + size * 1.1;
    ctx.font = '700 ' + size + 'px ' + Caption.TITLE_FAMILY;
    ctx.fillStyle = '#fff3e0';
    ctx.fillText('“' + state.quote + '”', cx, y + size * 1.05);
    cx += qw + size * 1.1;
    ctx.font = '700 ' + srcSize + 'px ' + Caption.TITLE_FAMILY;
    ctx.fillStyle = '#ffc93c';
    ctx.fillText('— ' + state.quoteSource, cx, y + size * 1.05);
    ctx.restore();
  }

  function drawBilling(ctx, W, H, state) {
    if (!state.showBilling) return;
    var size = Math.max(10, W * 0.0135);
    ctx.save();
    ctx.font = '700 ' + size + 'px ' + Caption.TITLE_FAMILY;
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = (W * 0.0018) + 'px';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 243, 224, 0.92)';
    var text = state.billing.toUpperCase();
    var maxW = W * 0.86;
    var line = text;
    if (ctx.measureText(text).width > maxW) {
      // Split on the middle '·' so two balanced lines result.
      var parts = text.split('·');
      var half = Math.ceil(parts.length / 2);
      var a = parts.slice(0, half).join('·').trim();
      var b = parts.slice(half).join('·').trim();
      ctx.fillText(a, W / 2, H * 0.945);
      ctx.fillText(b, W / 2, H * 0.945 + size * 1.6);
    } else {
      ctx.fillText(line, W / 2, H * 0.955);
    }
    ctx.restore();
  }

  function drawBarcode(ctx, W, H, state) {
    if (!state.showBarcode) return;
    var bw = W * 0.085;
    var bh = H * 0.045;
    var x = W - bw - W * 0.022;
    var y = H - bh - H * 0.055;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, bw, bh);
    var code = (state.catalogue || 'SCM-2026-001').replace(/[^0-9A-Za-z]/g, '');
    var px = x + bw * 0.06;
    var barW = bw * 0.88 / Math.max(1, code.length * 3);
    ctx.fillStyle = '#111111';
    for (var i = 0; i < code.length; i++) {
      var v = code.charCodeAt(i);
      for (var b = 0; b < 3; b++) {
        var w = barW * (0.6 + 0.4 * ((v >> (b * 2)) & 3) / 3);
        if (((v >> b) & 1) === 1) ctx.fillRect(px, y + bh * 0.12, w, bh * 0.62);
        px += barW;
      }
    }
    ctx.fillStyle = '#111111';
    ctx.font = '700 ' + Math.max(8, W * 0.008) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.catalogue, x + bw / 2, y + bh * 0.92);
    ctx.restore();
  }

  function drawSeal(ctx, W, H, state) {
    if (!state.showSeal) return;
    var cx = W * 0.065;
    var cy = H * 0.935;
    var r = W * 0.042;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    var points = 16;
    for (var i = 0; i < points * 2; i++) {
      var ang = (i * Math.PI) / points - Math.PI / 2;
      var rad = i % 2 === 0 ? r : r * 0.78;
      var px = Math.cos(ang) * rad;
      var py = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffc93c';
    ctx.fill();
    ctx.strokeStyle = '#8a5a00';
    ctx.lineWidth = Math.max(1.5, W * 0.0012);
    ctx.stroke();
    ctx.fillStyle = '#160a24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var fs = Math.max(8, r * 0.30);
    ctx.font = '900 ' + fs + 'px ' + Caption.TITLE_FAMILY;
    ctx.fillText('ORIGINAL', 0, -fs * 0.55);
    ctx.fillText('COVER ART', 0, fs * 0.55);
    ctx.restore();
  }

  function drawLabels(ctx, W, H, state) {
    if (!state.showLabels) return;
    var size = Math.max(11, W * 0.016);
    ctx.save();
    ctx.font = '900 ' + size + 'px ' + Caption.TITLE_FAMILY;
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = (W * 0.002) + 'px';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff3e0';
    ctx.textAlign = 'left';
    ctx.fillText('VOL. 1', W * 0.022, H * 0.045);
    ctx.textAlign = 'right';
    ctx.fillText('SEASON ONE', W * 0.978, H * 0.045);
    // Status pill, bottom centre above the billing block.
    var status = state.status || 'COMING SOON';
    var sw = ctx.measureText(status).width + size * 2.2;
    var sh = size * 2.0;
    var x = (W - sw) / 2;
    var y = H * 0.895 - sh;
    ctx.fillStyle = state.status === 'NOW SHOWING' ? '#ff2e88' : '#ffc93c';
    Caption.roundRect(ctx, x, y, sw, sh, sh / 2);
    ctx.fill();
    ctx.fillStyle = '#160a24';
    ctx.textAlign = 'center';
    ctx.fillText(status, W / 2, y + sh / 2 + size * 0.05);
    ctx.restore();
  }

  /**
   * Render the whole cover onto `canvas` at exactly W x H.
   * `images` maps photo src -> loaded HTMLImageElement. Panels whose photo
   * is not loaded are painted as a warm gradient placeholder (never blank).
   */
  function renderCover(canvas, W, H, state, images) {
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    var layout = Panels.LAYOUTS[state.layout] || Panels.LAYOUTS.vice;
    var slanted = !!layout.slant;
    var rects = Panels.layoutRects(state.layout, W, H);
    var visible = Math.min(rects.length, state.panels.length);

    drawBackground(ctx, W, H);

    // Photos, each clipped to its panel, with the grade's photo filter.
    ctx.save();
    ctx.filter = Grades.photoFilter(state.grade);
    for (var i = 0; i < visible; i++) {
      var r = rects[i];
      var panel = state.panels[i];
      var img = images.get(panel.photo);
      ctx.save();
      if (slanted) slantPath(ctx, r, W);
      else ctx.beginPath(), ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      if (img) {
        Panels.drawPhotoInto(ctx, img, r, panel);
      } else {
        var g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
        g.addColorStop(0, '#ff9a3d');
        g.addColorStop(1, '#7a1e6e');
        ctx.fillStyle = g;
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.filter = 'none';

    // Grade overlays, halftone, grain, vignette — over the panels only.
    ctx.save();
    clipPanels(ctx, rects.slice(0, visible), slanted);
    Grades.applyOverlays(ctx, W, H, state.grade);
    if (state.halftone) Grades.applyHalftone(ctx, W, H);
    ctx.restore();
    if (state.grain) {
      ctx.save();
      clipPanels(ctx, rects.slice(0, visible), slanted);
      Grades.applyGrain(ctx, W, H);
      ctx.restore();
    }
    if (state.vignette) Grades.applyVignette(ctx, W, H);

    // Panel frames + warm outer frame.
    ctx.save();
    ctx.strokeStyle = '#1c0b2e';
    ctx.lineWidth = Math.max(2, W * 0.004);
    rects.slice(0, visible).forEach(function (r) {
      if (slanted) slantPath(ctx, r, W);
      else ctx.beginPath(), ctx.rect(r.x, r.y, r.w, r.h);
      ctx.stroke();
    });
    ctx.strokeStyle = '#ff9a3d';
    ctx.lineWidth = Math.max(2, W * 0.0025);
    ctx.strokeRect(W * 0.008, H * 0.008, W * 0.984, H * 0.984);
    ctx.restore();

    // Pop-out hero: redrawn expanded, with a drop shadow, over the frame.
    var heroIdx = -1;
    for (var h = 0; h < visible; h++) if (rects[h].hero) heroIdx = h;
    if (heroIdx >= 0 && state.layout !== 'fullbleed') {
      var hr = rects[heroIdx];
      var hp = state.panels[heroIdx];
      var himg = images.get(hp.photo);
      var ex = hr.x - hr.w * 0.035;
      var ey = hr.y - hr.h * 0.02;
      var ew = hr.w * 1.07;
      var eh = hr.h * 1.075;
      ctx.save();
      ctx.shadowColor = 'rgba(10, 3, 18, 0.75)';
      ctx.shadowBlur = W * 0.018;
      ctx.shadowOffsetY = H * 0.012;
      ctx.fillStyle = '#1c0b2e';
      ctx.fillRect(ex, ey, ew, eh);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(ex, ey, ew, eh);
      ctx.clip();
      if (himg) {
        var expanded = { x: ex, y: ey, w: ew, h: eh, hero: true };
        Panels.drawPhotoInto(ctx, himg, expanded, hp);
      }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = '#fff3e0';
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.strokeRect(ex, ey, ew, eh);
      ctx.restore();
      // The hero's role tag rides the expanded frame.
      drawRoleTag(ctx, { x: ex, y: ey, w: ew, h: eh }, hp.role, W);
    }

    // Role tags on the other panels.
    for (var t = 0; t < visible; t++) {
      if (t === heroIdx && state.layout !== 'fullbleed') continue;
      drawRoleTag(ctx, rects[t], state.panels[t].role, W);
    }

    // Poster furniture, in fixed order.
    drawQuoteBar(ctx, W, H, state);
    drawLabels(ctx, W, H, state);
    var titleBox = Caption.drawTitle(ctx, W, H, state);
    var subtitleBox = Caption.drawSubtitle(ctx, W, H, state, titleBox);
    Caption.drawTagline(ctx, W, H, state, subtitleBox);
    drawBilling(ctx, W, H, state);
    drawBarcode(ctx, W, H, state);
    drawSeal(ctx, W, H, state);
    return ctx;
  }

  window.SunsetPoster = { renderCover: renderCover };
})();
