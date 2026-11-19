// caption.js — the bold poster caption: big condensed title, subtitle and
// tag line, drawn with glyph-accurate letter spacing so the block never
// overflows the cover. Colour presets, outline + shadow, draggable position.
(function () {
  'use strict';

  var CAPTION_COLORS = {
    white: { fill: '#ffffff', stroke: '#1a0b26', bar: '#ff7a3d' },
    sunset: { gradient: true, stroke: '#1a0b26', bar: '#ffc46b' },
    neon: { fill: '#ff4dd2', stroke: '#12081c', bar: '#37e0c8' },
    gold: { fill: '#ffc46b', stroke: '#1a0b26', bar: '#ff4d8d' },
    black: { fill: '#14101a', stroke: '#ffffff', bar: '#ff7a3d' },
  };

  function defaultCaption() {
    return {
      title: 'NEON SHORE',
      subtitle: 'VICE CITY NIGHTS',
      tag: 'OUT NOW · SUNSET COVER MAKER',
      sizePct: 100,
      spacing: 6,
      color: 'white',
      xPct: 50,
      yPct: 82,
    };
  }

  // Width of text drawn with `spacing` px between glyphs, at the ctx's font.
  function spacedWidth(ctx, text, spacing) {
    if (!text) return 0;
    var w = 0;
    for (var i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width;
    return w + spacing * Math.max(0, text.length - 1);
  }

  // Draws text centred on cx, glyph by glyph, honouring letter spacing.
  function drawSpacedText(ctx, text, cx, y, spacing) {
    if (!text) return;
    var w = spacedWidth(ctx, text, spacing);
    var x = cx - w / 2;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      ctx.fillText(ch, x, y);
      ctx.strokeText(ch, x, y);
      x += ctx.measureText(ch).width + spacing;
    }
  }

  // Same, but only the fill (used for the shadow pass).
  function drawSpacedFillOnly(ctx, text, cx, y, spacing) {
    if (!text) return;
    var w = spacedWidth(ctx, text, spacing);
    var x = cx - w / 2;
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], x, y);
      x += ctx.measureText(text[i]).width + spacing;
    }
  }

  // Measures the caption block (title + subtitle + tag) at a given width so
  // the editor can hit-test it for dragging.
  function captionBlockRect(W, H, caption) {
    var s = Math.min(W, H);
    var titlePx = (s * 0.115 * caption.sizePct) / 100;
    var subPx = Math.max(14, s * 0.032);
    var tagPx = Math.max(12, s * 0.02);
    var cx = (W * caption.xPct) / 100;
    var cy = (H * caption.yPct) / 100;
    var blockH = titlePx * 1.05 + subPx * 1.9 + tagPx * 2.6;
    var blockW = Math.min(W * 0.94, titlePx * 0.62 * Math.max(1, caption.title.length));
    return { x: cx - blockW / 2, y: cy - blockH / 2, w: blockW, h: blockH, cx: cx, cy: cy };
  }

  function drawCaption(ctx, W, H, caption) {
    var preset = CAPTION_COLORS[caption.color] || CAPTION_COLORS.white;
    var s = Math.min(W, H);
    var scale = s / 1080; // spacing and strokes scale with the cover
    var cx = (W * caption.xPct) / 100;
    var cy = (H * caption.yPct) / 100;
    var titlePx = (s * 0.115 * caption.sizePct) / 100;
    var spacing = caption.spacing * scale * (s / 1080 + 0.6);
    var subPx = Math.max(13, s * 0.032);
    var tagPx = Math.max(11, s * 0.02);

    var title = (caption.title || '').toUpperCase();
    var subtitle = (caption.subtitle || '').toUpperCase();
    var tag = (caption.tag || '').toUpperCase();

    // Title font, shrunk until the spaced title fits 92% of the width.
    var fontPx = titlePx;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    while (fontPx > 20) {
      ctx.font = fontPx + 'px Anton, sans-serif';
      if (spacedWidth(ctx, title, spacing) <= W * 0.92) break;
      fontPx *= 0.92;
    }
    var titleFont = fontPx + 'px Anton, sans-serif';
    var titleH = fontPx;
    var subH = subPx * 1.9;
    var tagH = tagPx * 2.4;
    var top = cy - (titleH + subH + tagH) / 2;

    // Sunset bar above the title.
    var barW = Math.min(W * 0.34, spacedWidth(ctx, title, spacing) * 0.5);
    var barH = Math.max(4, 7 * scale);
    ctx.save();
    ctx.fillStyle = preset.bar;
    ctx.fillRect(cx - barW / 2, top, barW, barH);
    ctx.restore();

    var titleY = top + barH + titleH / 2 + titleH * 0.08;
    var subY = titleY + titleH / 2 + subPx * 0.95;
    var tagY = subY + subPx * 0.95 + tagPx * 1.1;

    // Title: hard offset shadow, thick outline, then the fill.
    ctx.save();
    ctx.font = titleFont;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, fontPx * 0.085);
    var shadowOff = Math.max(3, fontPx * 0.045);
    ctx.fillStyle = 'rgba(18,8,28,0.85)';
    ctx.strokeStyle = 'rgba(18,8,28,0.85)';
    drawSpacedFillOnly(ctx, title, cx + shadowOff, titleY + shadowOff, spacing);
    ctx.strokeStyle = preset.stroke;
    ctx.fillStyle = preset.fill || '#ffffff';
    if (preset.gradient) {
      var g = ctx.createLinearGradient(cx - W * 0.3, titleY, cx + W * 0.3, titleY);
      g.addColorStop(0, '#ffc46b');
      g.addColorStop(0.5, '#ff7a3d');
      g.addColorStop(1, '#ff4d8d');
      ctx.fillStyle = g;
    }
    drawSpacedText(ctx, title, cx, titleY, spacing);
    ctx.restore();

    // Subtitle: bold Inter, wide tracking, with a thin underline.
    ctx.save();
    ctx.font = '700 ' + subPx + 'px Inter, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, subPx * 0.12);
    ctx.strokeStyle = 'rgba(18,8,28,0.9)';
    ctx.fillStyle = '#ffffff';
    var subSpacing = spacing * 0.9 + subPx * 0.12;
    drawSpacedText(ctx, subtitle, cx, subY, subSpacing);
    var subW = spacedWidth(ctx, subtitle, subSpacing);
    ctx.fillStyle = preset.bar;
    ctx.fillRect(cx - subW / 2, subY + subPx * 0.85, subW, Math.max(2, 3 * scale));
    ctx.restore();

    // Tag line: small caps inside a dark pill.
    if (tag) {
      ctx.save();
      ctx.font = '600 ' + tagPx + 'px Inter, sans-serif';
      var tagSpacing = tagPx * 0.14;
      var tagW = spacedWidth(ctx, tag, tagSpacing);
      var pillW = tagW + tagPx * 2.2;
      var pillH = tagPx * 2.1;
      var pillX = cx - pillW / 2;
      var pillY = tagY - pillH / 2;
      ctx.fillStyle = 'rgba(18,8,28,0.72)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
      else ctx.rect(pillX, pillY, pillW, pillH);
      ctx.fill();
      ctx.fillStyle = '#ffe9c9';
      ctx.strokeStyle = 'rgba(18,8,28,0)';
      drawSpacedText(ctx, tag, cx, tagY + tagPx * 0.06, tagSpacing);
      ctx.restore();
    }
  }

  window.SCM = window.SCM || {};
  window.SCM.captionColors = CAPTION_COLORS;
  window.SCM.defaultCaption = defaultCaption;
  window.SCM.drawCaption = drawCaption;
  window.SCM.captionBlockRect = captionBlockRect;
  window.SCM.spacedWidth = spacedWidth;
})();
