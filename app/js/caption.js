// caption.js — bold poster caption: condensed title with outline + shadow,
// subtitle and tag line, drawn on the cover canvas. Position, size, letter
// spacing and colour are all user-controlled from the editor.

export function drawCaption(ctx, caption, w, h) {
  // Scale type by the cover's SHORTER side, so a 1920x1080 landscape cover
  // keeps the same proportions as the square one (scaling by width alone
  // blew the title off the bottom edge in landscape).
  const unit = Math.min(w, h);
  const titleSize = (caption.titleSize / 1080) * unit;
  const spacingPx = (caption.spacing / 1080) * unit;
  // Keep the whole caption block (title + subtitle bar + tag) on-canvas.
  const blockBelow = titleSize * 0.62 + titleSize * 0.24 * 1.7 + titleSize * 0.35;
  let cy = (caption.y / 100) * h;
  cy = Math.min(cy, h - blockBelow - 12);
  cy = Math.max(cy, titleSize * 0.6);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacingPx}px`;
  // Title with thick dark outline and drop shadow.
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.lineWidth = Math.max(3, titleSize * 0.09);
  ctx.strokeStyle = 'rgba(20,4,24,0.95)';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,94,168,0.65)';
  ctx.shadowBlur = titleSize * 0.22;
  ctx.shadowOffsetY = titleSize * 0.04;
  ctx.strokeText(caption.title.toUpperCase(), w / 2, cy);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.fillStyle = caption.color;
  ctx.fillText(caption.title.toUpperCase(), w / 2, cy);
  // Subtitle on a dark ribbon bar.
  const subSize = titleSize * 0.24;
  ctx.font = `700 ${subSize}px Inter, sans-serif`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacingPx * 1.6}px`;
  const subText = caption.subtitle.toUpperCase();
  const subW = ctx.measureText(subText).width + subSize * 1.6;
  const subY = cy + titleSize * 0.62;
  ctx.fillStyle = 'rgba(16,4,22,0.82)';
  const barH = subSize * 1.7;
  ctx.fillRect(w / 2 - subW / 2, subY - barH / 2, subW, barH);
  ctx.fillStyle = '#ffd166';
  ctx.fillText(subText, w / 2, subY + subSize * 0.05);
  // Tag line, small and tracked out.
  if (caption.tag.trim()) {
    const tagSize = titleSize * 0.13;
    ctx.font = `600 ${tagSize}px Inter, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacingPx * 1.2}px`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = tagSize * 0.4;
    ctx.fillText(caption.tag.toUpperCase(), w / 2, subY + barH * 0.9 + tagSize);
  }
  ctx.restore();
}

export function bindCaptionControls(state, render) {
  const byId = (id) => document.getElementById(id);
  byId('titleInput').addEventListener('input', (e) => { state.caption.title = e.target.value; render(); });
  byId('subtitleInput').addEventListener('input', (e) => { state.caption.subtitle = e.target.value; render(); });
  byId('tagInput').addEventListener('input', (e) => { state.caption.tag = e.target.value; render(); });
  byId('titleSize').addEventListener('input', (e) => {
    state.caption.titleSize = Number(e.target.value);
    byId('titleSizeVal').textContent = e.target.value;
    render();
  });
  byId('spacing').addEventListener('input', (e) => {
    state.caption.spacing = Number(e.target.value);
    byId('spacingVal').textContent = e.target.value;
    render();
  });
  byId('captionY').addEventListener('input', (e) => {
    state.caption.y = Number(e.target.value);
    byId('captionYVal').textContent = `${e.target.value}%`;
    render();
  });
  document.getElementById('captionColors').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-color]');
    if (!btn) return;
    state.caption.color = btn.dataset.color;
    document.querySelectorAll('#captionColors button').forEach((b) => b.classList.toggle('active', b === btn));
    render();
  });
}
