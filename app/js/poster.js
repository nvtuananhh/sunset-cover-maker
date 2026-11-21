/* poster.js — poster furniture + the full poster render:
   warm outer frame, panels, quote bar, role tags, callouts, chrome
   title, script subtitle, tagline pill, billing block, barcode,
   gold starburst seal, VOL. 1 / season / status labels. */
(function () {
  'use strict';
  var SCM = window.SCM = window.SCM || {};

  function frameWidth(W) { return Math.round(W * 0.016); }

  function drawFrame(ctx, W, H) {
    var fw = frameWidth(W);
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#ffb03d'); g.addColorStop(0.5, '#ff7a18');
    g.addColorStop(1, '#ff2d78');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#160412';
    ctx.fillRect(fw * 0.45, fw * 0.45, W - fw * 0.9, H - fw * 0.9);
    ctx.strokeStyle = 'rgba(255,201,61,0.9)';
    ctx.lineWidth = Math.max(2, fw * 0.12);
    ctx.strokeRect(fw * 0.85, fw * 0.85, W - fw * 1.7, H - fw * 1.7);
    return { x: fw, y: fw, w: W - fw * 2, h: H - fw * 2 };
  }

  function drawQuoteBar(ctx, W, H, area, caption) {
    var size = Math.round(30 * (W / 1920));
    var y = area.y + area.h * 0.012;
    ctx.save();
    ctx.font = '900 ' + size + 'px ' + SCM.TITLE_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffc93d';
    var stars = '★★★★★';
    var qw = ctx.measureText('“' + caption.quote + '”').width;
    var sw = ctx.measureText(stars).width;
    var gap = size * 0.7;
    var total = qw + sw + gap * 2;
    var x0 = (W - total) / 2;
    ctx.fillStyle = '#fff3d6';
    ctx.fillText('“' + caption.quote + '”', x0 + qw / 2, y);
    ctx.fillStyle = '#ffc93d';
    ctx.fillText(stars, x0 + qw + gap + sw / 2, y);
    ctx.font = '700 ' + Math.round(size * 0.62) + 'px ' + SCM.UI_FONT;
    ctx.fillStyle = '#ffb03d';
    ctx.fillText('— ' + caption.quoteSource, W / 2, y + size * 1.15);
    ctx.restore();
    return y + size * 1.9;
  }

  /* pos: 'bottom' (default), 'top-left' (under the callout) or
     'top-right' (hero, clear of the title band). */
  function drawRoleTag(ctx, rect, role, W, pos) {
    var size = Math.max(11, Math.round(W * 0.012));
    ctx.save();
    ctx.font = '900 ' + size + 'px ' + SCM.TITLE_FONT;
    var w = ctx.measureText(role).width + size * 1.5;
    var h = size * 1.9;
    var mx = Math.max(6, rect.w * 0.03), my = Math.max(6, rect.h * 0.03);
    var x = rect.x + mx;
    var y = rect.y + rect.h - h - my;
    if (pos === 'top-right') { x = rect.x + rect.w - w - mx; y = rect.y + my; }
    if (pos === 'top-left') { y = rect.y + my + Math.round(W * 0.011) * 2 + 8; }
    ctx.fillStyle = 'rgba(10,2,8,0.92)';
    ctx.strokeStyle = '#ffc93d'; ctx.lineWidth = Math.max(1.5, size * 0.08);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 3); else ctx.rect(x, y, w, h);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(role, x + size * 0.75, y + h / 2 + 1);
    ctx.restore();
  }

  /* Annotation callout: small label + leader line into the panel. */
  function drawCallout(ctx, rect, callout, W, flip) {
    if (!callout) return;
    var size = Math.max(11, Math.round(W * 0.011));
    ctx.save();
    ctx.font = '700 ' + size + 'px ' + SCM.UI_FONT;
    var w = ctx.measureText(callout).width + size * 1.6;
    var h = size * 2.0;
    var lx = flip ? rect.x + rect.w - w : rect.x;
    var ly = rect.y + Math.max(4, rect.h * 0.02);
    var px = rect.x + rect.w * (flip ? 0.72 : 0.28);
    var py = rect.y + rect.h * 0.42;
    ctx.strokeStyle = 'rgba(255,201,61,0.95)';
    ctx.lineWidth = Math.max(1.5, size * 0.09);
    ctx.beginPath();
    ctx.moveTo(lx + (flip ? w - size : size), ly + h);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, Math.max(3, size * 0.22), 0, 6.2832);
    ctx.fillStyle = '#ffc93d'; ctx.fill();
    ctx.fillStyle = 'rgba(22,4,18,0.92)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(lx, ly, w, h, h / 2); else ctx.rect(lx, ly, w, h);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(callout, lx + size * 0.8, ly + h / 2 + 1);
    ctx.restore();
  }

  function drawBarcode(ctx, W, H, area, caption) {
    var bw = Math.round(W * 0.085), bh = Math.round(H * 0.042);
    var x = area.x + area.w - bw - Math.round(W * 0.012);
    var y = area.y + area.h - bh - Math.round(H * 0.012);
    ctx.save();
    ctx.fillStyle = '#fff3d6';
    ctx.fillRect(x - 6, y - 6, bw + 12, bh + 22);
    var rnd = SCM.seededRandom(777);
    var cx = x;
    while (cx < x + bw) {
      var bar = 1 + Math.floor(rnd() * 4) * 2;
      ctx.fillStyle = '#160412';
      ctx.fillRect(cx, y, Math.min(bar, x + bw - cx), bh);
      cx += bar + 1 + Math.floor(rnd() * 4);
    }
    ctx.fillStyle = '#160412';
    ctx.font = '700 ' + Math.round(bh * 0.42) + 'px ' + SCM.UI_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('8 90211 060621', x + bw / 2, y + bh + 2);
    ctx.restore();
  }

  function drawSeal(ctx, W, H, area) {
    var r = Math.round(Math.min(W, H) * 0.052);
    var cx = area.x + r + Math.round(W * 0.012);
    var cy = area.y + area.h - r - Math.round(H * 0.012);
    ctx.save();
    ctx.translate(cx, cy);
    var spikes = 14;
    ctx.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var ang = (i * Math.PI) / spikes - Math.PI / 2;
      var rr = i % 2 === 0 ? r : r * 0.78;
      var px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    var g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    g.addColorStop(0, '#ffe95e'); g.addColorStop(1, '#e8a100');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#7a5200'; ctx.lineWidth = Math.max(2, r * 0.06); ctx.stroke();
    ctx.fillStyle = '#4a2c00';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 ' + Math.round(r * 0.30) + 'px ' + SCM.TITLE_FONT;
    ctx.fillText('ORIGINAL', 0, -r * 0.22);
    ctx.fillText('COVER ART', 0, r * 0.12);
    ctx.font = '900 ' + Math.round(r * 0.42) + 'px ' + SCM.UI_FONT;
    ctx.fillText('★', 0, r * 0.52);
    ctx.restore();
  }

  /* Billing line at the bottom; VOL. 1 / season / status ride the top
     corners flanking the quote bar, clear of the seal and barcode. */
  function drawBilling(ctx, W, H, area, caption) {
    var size = Math.round(21 * (W / 1920));
    ctx.save();
    ctx.font = '700 ' + size + 'px ' + SCM.UI_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffe9c9';
    var y = area.y + area.h - Math.round(H * 0.014);
    ctx.fillText(caption.billing, W / 2, y);
    ctx.font = '900 ' + Math.round(size * 1.05) + 'px ' + SCM.TITLE_FONT;
    ctx.fillStyle = '#ffc93d';
    ctx.textBaseline = 'top';
    var topY = area.y + Math.round(H * 0.016);
    ctx.textAlign = 'left';
    ctx.fillText(caption.volume + '  ·  ' + caption.season, area.x + Math.round(W * 0.012), topY);
    ctx.textAlign = 'right';
    ctx.fillText(caption.status, area.x + area.w - Math.round(W * 0.012), topY);
    ctx.restore();
  }

  /* The full poster. state: { layout, grade, caption, panels, grain, halftone }.
     images: map photoFile -> HTMLImageElement, loaded in fixed order. */
  function drawPoster(ctx, W, H, state, images) {
    var caption = state.caption;
    var grade = SCM.gradeById(state.grade);
    var area = drawFrame(ctx, W, H);
    if (state.caption.showQuote) drawQuoteBar(ctx, W, H, area, caption);
    var rects = SCM.panelRects(state.layout, area);
    var gutter = Math.max(3, Math.round(W * 0.0035));
    /* Non-hero panels first, hero last so it breaks the frame. */
    var order = rects.map(function (r, i) { return i; });
    order.sort(function (a, b) { return (rects[a].hero ? 1 : 0) - (rects[b].hero ? 1 : 0); });
    order.forEach(function (idx) {
      var rect = rects[idx];
      var panel = state.panels[idx];
      if (!panel) return;
      var img = images[panel.photoFile] || images[panel.photoId] || null;
      ctx.save();
      if (rect.hero) {
        ctx.shadowColor = 'rgba(0,0,0,0.65)';
        ctx.shadowBlur = Math.round(W * 0.02);
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = Math.round(H * 0.012);
      }
      ctx.fillStyle = '#2a0a1a';
      ctx.fillRect(rect.x - gutter, rect.y - gutter, rect.w + gutter * 2, rect.h + gutter * 2);
      ctx.restore();
      if (img) SCM.drawPanelImage(ctx, img, rect, panel);
      else { ctx.fillStyle = '#3a1426'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); }
      SCM.applyGradeWash(ctx, rect.x, rect.y, rect.w, rect.h, grade);
      if (state.halftone) SCM.applyHalftone(ctx, rect.x, rect.y, rect.w, rect.h);
      /* Thin dark gutter + warm inner edge. */
      ctx.strokeStyle = 'rgba(10,2,8,0.9)'; ctx.lineWidth = gutter;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(255,176,61,0.55)'; ctx.lineWidth = Math.max(1, gutter * 0.4);
      ctx.strokeRect(rect.x + gutter, rect.y + gutter, rect.w - gutter * 2, rect.h - gutter * 2);
      drawRoleTag(ctx, rect, panel.role, W,
        rect.hero ? 'top-right' : (rect.y > area.y + area.h * 0.4 ? 'top-left' : 'bottom'));
      drawCallout(ctx, rect, panel.callout, W, idx % 2 === 1);
    });
    var titleY = SCM.drawChromeTitle(ctx, W, H, caption);
    SCM.drawSubtitle(ctx, W, H, caption, titleY);
    var pillY = titleY + Math.round(44 * (W / 1920)) * 1.9;
    var pillBottom = SCM.drawTaglinePill(ctx, W, H, caption, pillY);
    /* Cast line fills the gap between the pill and the billing block. */
    ctx.save();
    ctx.font = '800 ' + Math.round(20 * (W / 1920)) + 'px ' + SCM.UI_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffb03d';
    ctx.fillText('★  STARRING YOU AND YOUR CREW  ★', W / 2, pillBottom + Math.round(26 * (W / 1920)));
    ctx.restore();
    drawBilling(ctx, W, H, area, caption);
    if (state.caption.showBarcode) drawBarcode(ctx, W, H, area, caption);
    if (state.caption.showSeal) drawSeal(ctx, W, H, area);
    SCM.applyPosterGrade(ctx, W, H, grade, { grain: state.grain !== false, halftone: state.halftone });
  }
  SCM.drawPoster = drawPoster;
})();
