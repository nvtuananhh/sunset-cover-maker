// caption.js — the big caption lettering: chrome title (gradient fill,
// thick outline, offset shadow; Chrome / Striped retro / Neon outline),
// slanted script subtitle, and the tagline pill. All type is drawn on the
// canvas with system fonts, so export matches preview exactly.
(function () {
  'use strict';

  var TITLE_FAMILY = "'Noto Sans Condensed', 'Noto Sans', 'Arial Narrow', sans-serif";
  var SCRIPT_FAMILY = "italic 700 Georgia, 'DejaVu Serif', 'Times New Roman', serif";

  function fitSize(ctx, text, maxWidth, size, weight, family, spacingPx) {
    var s = size;
    ctx.save();
    while (s > 12) {
      ctx.font = weight + ' ' + s + 'px ' + family;
      if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = spacingPx + 'px';
      if (ctx.measureText(text).width <= maxWidth) break;
      s = Math.floor(s * 0.94);
    }
    ctx.restore();
    return s;
  }

  function titleGradient(ctx, x0, y0, x1, y1) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0.0, '#ffe95e');
    g.addColorStop(0.28, '#ffb03a');
    g.addColorStop(0.52, '#ff7a1a');
    g.addColorStop(0.76, '#ff2e88');
    g.addColorStop(1.0, '#b967ff');
    return g;
  }

  /** Measure the title (size, width, top, baseline) without drawing it. */
  function measureTitle(ctx, W, H, state) {
    var text = (state.title || 'SUNSET').toUpperCase();
    var maxWidth = W * 0.94;
    var base = W * 0.155 * state.titleSize;
    var spacing = W * state.letterSpacing;
    var size = fitSize(ctx, text, maxWidth, base, '900', TITLE_FAMILY, spacing);
    ctx.save();
    ctx.font = '900 ' + size + 'px ' + TITLE_FAMILY;
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = spacing + 'px';
    var width = ctx.measureText(text).width;
    ctx.restore();
    var baselineY = state.titleY * H;
    return { text: text, size: size, width: width, top: baselineY - size, baselineY: baselineY, spacing: spacing };
  }

  /**
   * Bounding boxes of the furniture that role tags must avoid: the title,
   * the tagline pill, and the status pill. Pure measurement, no drawing.
   */
  function measureFurniture(ctx, W, H, state) {
    var title = measureTitle(ctx, W, H, state);
    var titleBox = { x: (W - title.width) / 2, y: title.top, w: title.width, h: title.size * 1.1 };
    var subSize = Math.max(14, W * 0.032 * state.titleSize);
    var subY = title.baselineY + subSize * 1.55;
    var tagSize = Math.max(11, W * 0.0165);
    ctx.save();
    ctx.font = '700 ' + tagSize + 'px ' + TITLE_FAMILY;
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = (W * 0.004) + 'px';
    var tagW = ctx.measureText((state.tagline || '').toUpperCase()).width + tagSize * 2.4;
    ctx.restore();
    var tagY = (subY + subSize * 0.9) + tagSize * 0.5;
    var taglineBox = { x: (W - tagW) / 2, y: tagY, w: tagW, h: tagSize * 2.1 };
    var statusSize = Math.max(11, W * 0.016);
    ctx.save();
    ctx.font = '900 ' + statusSize + 'px ' + TITLE_FAMILY;
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = (W * 0.002) + 'px';
    var statusW = ctx.measureText(state.status || 'COMING SOON').width + statusSize * 2.2;
    ctx.restore();
    var statusBox = { x: (W - statusW) / 2, y: H * 0.925 - statusSize * 2.0, w: statusW, h: statusSize * 2.0 };
    return { title: titleBox, tagline: taglineBox, status: statusBox };
  }

  /** Draw the huge title centred at (cx, baselineY). Returns its bounding box. */
  function drawTitle(ctx, W, H, state) {
    var text = (state.title || 'SUNSET').toUpperCase();
    var cx = W / 2;
    var m = measureTitle(ctx, W, H, state);
    var size = m.size;
    var spacing = m.spacing;
    var baselineY = m.baselineY;
    var top = m.top;
    var style = state.titleStyle || 'chrome';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = spacing + 'px';
    ctx.font = '900 ' + size + 'px ' + TITLE_FAMILY;

    if (style === 'neon') {
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = size * 0.22;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = '#ff5db1';
      ctx.lineWidth = Math.max(2, size * 0.028);
      ctx.strokeText(text, cx, baselineY);
      ctx.strokeText(text, cx, baselineY);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1c0b2e';
      ctx.fillText(text, cx, baselineY);
    } else if (style === 'striped') {
      // Offscreen so the stripes clip to the letterforms.
      var off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      var o = off.getContext('2d');
      o.textAlign = 'center';
      o.textBaseline = 'alphabetic';
      o.lineJoin = 'round';
      if (typeof o.letterSpacing !== 'undefined') o.letterSpacing = spacing + 'px';
      o.font = '900 ' + size + 'px ' + TITLE_FAMILY;
      o.strokeStyle = '#1c0b2e';
      o.lineWidth = Math.max(3, size * 0.06);
      o.strokeText(text, cx, baselineY);
      o.fillStyle = titleGradient(o, cx, top, cx, baselineY + size * 0.1);
      o.fillText(text, cx, baselineY);
      o.globalCompositeOperation = 'source-atop';
      var stripeH = Math.max(3, size * 0.085);
      o.fillStyle = 'rgba(28, 11, 46, 0.55)';
      for (var y = top; y < baselineY + size * 0.1; y += stripeH * 2) {
        o.fillRect(0, y, W, stripeH);
      }
      ctx.shadowColor = 'rgba(20, 4, 30, 0.85)';
      ctx.shadowBlur = size * 0.03;
      ctx.shadowOffsetY = size * 0.05;
      ctx.drawImage(off, 0, 0);
    } else {
      // Chrome sunset.
      ctx.shadowColor = 'rgba(20, 4, 30, 0.85)';
      ctx.shadowBlur = size * 0.035;
      ctx.shadowOffsetY = size * 0.055;
      ctx.strokeStyle = '#1c0b2e';
      ctx.lineWidth = Math.max(3, size * 0.06);
      ctx.strokeText(text, cx, baselineY);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = titleGradient(ctx, cx, top, cx, baselineY + size * 0.1);
      ctx.fillText(text, cx, baselineY);
      // Thin hot highlight along the top of the letters.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillText(text, cx, baselineY - size * 0.012);
    }
    ctx.restore();
    return { x: cx - m.width / 2, y: top, w: m.width, h: size * 1.15, size: size, baselineY: baselineY };
  }

  /** Slanted script subtitle in neon pink, just under the title. */
  function drawSubtitle(ctx, W, H, state, titleBox) {
    var text = state.subtitle || '';
    if (!text) return null;
    var size = Math.max(14, W * 0.032 * state.titleSize);
    var y = titleBox.baselineY + size * 1.55;
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.rotate(-0.035);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = (W * 0.002) + 'px';
    ctx.font = 'italic 700 ' + size + 'px Georgia, \'DejaVu Serif\', \'Times New Roman\', serif';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = size * 0.5;
    ctx.fillStyle = '#ff7ad9';
    ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd7ef';
    ctx.fillText(text, 0, -size * 0.02);
    ctx.restore();
    return { y: y, size: size };
  }

  /** Tagline pill: dark ticket with a gold edge, centred. */
  function drawTagline(ctx, W, H, state, subtitleBox) {
    var text = (state.tagline || '').toUpperCase();
    if (!text) return null;
    var size = Math.max(11, W * 0.0165);
    ctx.save();
    ctx.font = '700 ' + size + 'px ' + TITLE_FAMILY;
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = (W * 0.004) + 'px';
    var tw = ctx.measureText(text).width + size * 2.4;
    var th = size * 2.1;
    var y = (subtitleBox ? subtitleBox.y + subtitleBox.size * 0.9 : H * 0.78) + size * 0.5;
    var x = (W - tw) / 2;
    ctx.fillStyle = 'rgba(22, 10, 36, 0.88)';
    ctx.strokeStyle = '#ffc93c';
    ctx.lineWidth = Math.max(1.5, W * 0.0012);
    roundRect(ctx, x, y, tw, th, th / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff3e0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, y + th / 2 + size * 0.05);
    ctx.restore();
    return { y: y, h: th };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.SunsetCaption = {
    TITLE_FAMILY: TITLE_FAMILY,
    SCRIPT_FAMILY: SCRIPT_FAMILY,
    measureTitle: measureTitle,
    measureFurniture: measureFurniture,
    drawTitle: drawTitle,
    drawSubtitle: drawSubtitle,
    drawTagline: drawTagline,
    roundRect: roundRect,
  };
})();
