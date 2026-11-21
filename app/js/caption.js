/* caption.js — caption state + the chrome-title / script-subtitle /
   tagline rendering. All poster type is drawn on the canvas so the
   export matches the preview exactly. */
(function () {
  'use strict';
  var SCM = window.SCM = window.SCM || {};

  SCM.TITLE_FONT = '"Noto Sans Condensed Black", "Noto Sans Condensed", "Arial Narrow", sans-serif';
  SCM.UI_FONT = '"Noto Sans", "Segoe UI", Arial, sans-serif';
  SCM.SCRIPT_FONT = 'italic 700 ';

  function defaultCaption() {
    return {
      title: 'SUNSET DRIVE',
      titleStyle: 'striped',
      titleSize: 128,
      letterSpacing: 10,
      titleY: 0.72,
      subtitle: 'five friends · one coast · no way back',
      tagline: 'FIVE FRIENDS · ONE COAST · NO WAY BACK',
      quote: 'HOTTER THAN THE ASPHALT',
      quoteSource: 'THE PALM GAZETTE',
      billing: 'A SUNSET PICTURES PRODUCTION · STARRING YOU · SHOT ON YOUR OWN CAMERA · GRADED BY HAND',
      volume: 'VOL. 1', season: 'SEASON ONE', status: 'NOW SHOWING',
      showSeal: true, showBarcode: true, showQuote: true
    };
  }
  SCM.defaultCaption = defaultCaption;

  /* Letter-spaced text width, measured with the same font the draw uses. */
  function spacedWidth(ctx, text, spacing) {
    var w = 0;
    for (var i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + spacing;
    return w - spacing;
  }

  function drawSpacedText(ctx, text, cx, y, spacing) {
    var w = spacedWidth(ctx, text, spacing);
    var x = cx - w / 2;
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], x, y);
      ctx.strokeText(text[i], x, y);
      x += ctx.measureText(text[i]).width + spacing;
    }
  }

  /* The huge chrome title: sunset-gradient fill, thick dark outline,
     offset drop shadow. Striped retro-chrome adds horizontal stripes
     clipped inside the letters; neon is a glowing pink outline. */
  function drawChromeTitle(ctx, W, H, caption) {
    var size = caption.titleSize * (W / 1920);
    var spacing = caption.letterSpacing * (W / 1920);
    var y = caption.titleY * H;
    var font = '900 ' + size + 'px ' + SCM.TITLE_FONT;
    ctx.save();
    ctx.font = font;
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    var grad = ctx.createLinearGradient(0, y - size, 0, y + size * 0.12);
    grad.addColorStop(0, '#ffe95e'); grad.addColorStop(0.35, '#ffb03d');
    grad.addColorStop(0.62, '#ff5e62'); grad.addColorStop(0.85, '#e75480');
    grad.addColorStop(1, '#8e44ad');
    var outline = Math.max(3, size * 0.085);
    var shadowOff = Math.max(4, size * 0.055);

    function strokeFill(fillStyle, lineWidth, strokeStyle) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeStyle;
      ctx.fillStyle = fillStyle;
      ctx.shadowColor = 'rgba(20,2,12,0.85)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = shadowOff; ctx.shadowOffsetY = shadowOff;
      drawSpacedText(ctx, caption.title, W / 2, y, spacing);
      ctx.shadowColor = 'transparent'; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    }

    if (caption.titleStyle === 'neon') {
      ctx.lineWidth = Math.max(2, size * 0.03);
      ctx.strokeStyle = '#ff5da2';
      ctx.shadowColor = '#ff2d78'; ctx.shadowBlur = size * 0.35;
      ctx.fillStyle = 'rgba(255,240,250,0.92)';
      drawSpacedText(ctx, caption.title, W / 2, y, spacing);
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1.5, size * 0.015);
      ctx.strokeStyle = '#ffffff';
      drawSpacedText(ctx, caption.title, W / 2, y, spacing);
    } else if (caption.titleStyle === 'striped') {
      /* Draw the letters to an offscreen layer, then stripe them. */
      var layer = document.createElement('canvas');
      layer.width = W; layer.height = H;
      var lctx = layer.getContext('2d');
      lctx.font = font; lctx.textBaseline = 'alphabetic'; lctx.lineJoin = 'round';
      lctx.lineWidth = outline; lctx.strokeStyle = '#160412'; lctx.fillStyle = grad;
      lctx.shadowColor = 'rgba(20,2,12,0.85)'; lctx.shadowOffsetX = shadowOff; lctx.shadowOffsetY = shadowOff;
      drawSpacedText.call(null, lctx, caption.title, W / 2, y, spacing);
      lctx.shadowColor = 'transparent'; lctx.shadowOffsetX = 0; lctx.shadowOffsetY = 0;
      /* Horizontal retro stripes, clipped inside the letters. */
      lctx.globalCompositeOperation = 'source-atop';
      var stripeH = Math.max(4, size * 0.09);
      for (var sy = y - size; sy < y + size * 0.12; sy += stripeH * 2) {
        lctx.fillStyle = 'rgba(255,255,255,0.15)';
        lctx.fillRect(0, sy, W, stripeH);
        lctx.fillStyle = 'rgba(40,4,40,0.10)';
        lctx.fillRect(0, sy + stripeH, W, stripeH * 0.55);
      }
      lctx.globalCompositeOperation = 'source-over';
      /* Crisp white inner edge so the stripes read as chrome. */
      lctx.globalCompositeOperation = 'source-atop';
      lctx.lineWidth = Math.max(1.5, size * 0.012);
      lctx.strokeStyle = 'rgba(255,255,255,0.30)';
      drawSpacedText.call(null, lctx, caption.title, W / 2, y, spacing);
      ctx.drawImage(layer, 0, 0);
    } else {
      strokeFill(grad, outline, '#160412');
      ctx.lineWidth = Math.max(1.5, size * 0.012);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.fillStyle = grad;
      drawSpacedText(ctx, caption.title, W / 2, y, spacing);
    }
    ctx.restore();
    return y;
  }
  SCM.drawChromeTitle = drawChromeTitle;

  /* Slanted script subtitle in neon pink under the title. */
  function drawSubtitle(ctx, W, H, caption, titleY) {
    var size = Math.round(44 * (W / 1920));
    ctx.save();
    ctx.font = SCM.SCRIPT_FONT + size + 'px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#ff5da2';
    ctx.shadowColor = '#ff2d78'; ctx.shadowBlur = size * 0.45;
    ctx.fillText(caption.subtitle, W / 2, titleY + size * 0.28);
    ctx.restore();
  }
  SCM.drawSubtitle = drawSubtitle;

  /* Pill tagline under the subtitle. */
  function drawTaglinePill(ctx, W, H, caption, y) {
    var size = Math.round(26 * (W / 1920));
    ctx.save();
    ctx.font = '800 ' + size + 'px ' + SCM.UI_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var w = ctx.measureText(caption.tagline).width + size * 2.4;
    var h = size * 2.1;
    var x = (W - w) / 2;
    ctx.fillStyle = 'rgba(22,4,18,0.88)';
    ctx.strokeStyle = '#ffc93d'; ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, h / 2); else ctx.rect(x, y, w, h);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(caption.tagline, W / 2, y + h / 2 + 1);
    ctx.restore();
    return y + h;
  }
  SCM.drawTaglinePill = drawTaglinePill;
})();
