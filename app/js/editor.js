// editor.js — app boot and state. Owns the editor state, the live preview,
// template / grade / size controls, panel selection and drag-to-pan, and
// wires every module together. No network: photos are local, fonts and
// samples are files under app/.

import { layoutRects, panelCount, defaultPanel, panelAt } from './panels.js';
import { applyGrade } from './grades.js';
import { drawCaption, bindCaptionControls } from './caption.js';
import { readPhotoFiles, renderThumbs } from './photos.js';
import { loadSamplePhotos } from './samples.js';
import { EXPORT_SIZES, renderCover, exportPng } from './export.js';
import { drawPanelPhoto } from './panels.js';

export const state = {
  photos: [],
  template: 'hero',
  grade: 'sunset',
  effects: { halftone: false, grain: true },
  caption: { title: 'VICE CITY', subtitle: 'SUNSET STORIES', tag: 'A STORY IN EVERY FRAME', titleSize: 150, spacing: 6, y: 82, color: '#ffffff' },
  sizeKey: '1080x1080',
  panels: [defaultPanel(0), defaultPanel(1), defaultPanel(0)],
  selectedPanel: 0,
};

const preview = document.getElementById('preview');

export function currentSize() {
  return EXPORT_SIZES[state.sizeKey];
}

export function ensurePanels() {
  const n = panelCount(state.template);
  while (state.panels.length < n) state.panels.push(defaultPanel(state.photos.length > 1 ? 1 : 0));
  state.panels.length = n;
  if (state.selectedPanel >= n) state.selectedPanel = 0;
}

export function render() {
  ensurePanels();
  const { w, h } = currentSize();
  preview.width = w;
  preview.height = h;
  const ctx = preview.getContext('2d');
  ctx.fillStyle = '#160a1e';
  ctx.fillRect(0, 0, w, h);
  layoutRects(state.template).forEach((rect, i) => {
    const panel = state.panels[i];
    const photo = state.photos[panel.photo];
    if (photo && photo.img) drawPanelPhoto(ctx, photo.img, rect, panel, w, h);
  });
  applyGrade(ctx, state.grade, w, h, state.effects);
  drawCaption(ctx, state.caption, w, h);
  // Selected-panel outline.
  const rects = layoutRects(state.template);
  const sel = rects[state.selectedPanel];
  if (sel) {
    ctx.save();
    ctx.strokeStyle = '#37e6ff';
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.setLineDash([18, 10]);
    ctx.strokeRect(sel.x * w + 2, sel.y * h + 2, sel.w * w - 4, sel.h * h - 4);
    ctx.restore();
  }
  document.getElementById('topSize').textContent = `${w} × ${h}`;
  document.getElementById('panelHint').textContent = `Panel ${state.selectedPanel + 1} of ${rects.length} selected — pick its photo and adjust zoom, pan and rotation.`;
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  const select = document.getElementById('panelPhoto');
  select.innerHTML = '';
  state.photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1} · ${p.name}`;
    select.appendChild(opt);
  });
  select.value = String(panel.photo);
  const set = (id, val, label, fmt) => {
    document.getElementById(id).value = val;
    document.getElementById(label).textContent = fmt(val);
  };
  set('zoom', panel.zoom, 'zoomVal', (v) => `${Number(v).toFixed(2)}×`);
  set('panX', panel.panX, 'panXVal', (v) => String(v));
  set('panY', panel.panY, 'panYVal', (v) => String(v));
  set('rot', panel.rot, 'rotVal', (v) => `${v}°`);
}

function markStep(n) {
  document.querySelectorAll('.step').forEach((el) => {
    el.classList.toggle('done', Number(el.dataset.step) <= n);
  });
}

function bindControls() {
  document.getElementById('fileInput').addEventListener('change', async (e) => {
    try {
      const added = await readPhotoFiles(e.target.files);
      state.photos.push(...added);
      renderThumbs(document.getElementById('thumbs'), state.photos, state.photos.length - 1, (i) => {
        state.panels[state.selectedPanel].photo = i;
        render();
      });
      markStep(2);
      render();
    } catch (err) {
      document.getElementById('exportStatus').textContent = err.message;
    }
    e.target.value = '';
  });
  document.getElementById('templateBtns').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-template]');
    if (!btn) return;
    state.template = btn.dataset.template;
    document.querySelectorAll('#templateBtns button').forEach((b) => b.classList.toggle('active', b === btn));
    render();
  });
  document.getElementById('gradeBtns').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-grade]');
    if (!btn) return;
    state.grade = btn.dataset.grade;
    document.querySelectorAll('#gradeBtns button').forEach((b) => b.classList.toggle('active', b === btn));
    render();
  });
  document.getElementById('halftoneToggle').addEventListener('change', (e) => { state.effects.halftone = e.target.checked; render(); });
  document.getElementById('grainToggle').addEventListener('change', (e) => { state.effects.grain = e.target.checked; render(); });
  document.getElementById('sizeRow').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-size]');
    if (!btn) return;
    state.sizeKey = btn.dataset.size;
    document.querySelectorAll('#sizeRow button').forEach((b) => b.classList.toggle('active', b === btn));
    render();
  });
  document.getElementById('panelPhoto').addEventListener('change', (e) => {
    state.panels[state.selectedPanel].photo = Number(e.target.value);
    render();
  });
  const bindRange = (id, key, fmt) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state.panels[state.selectedPanel][key] = Number(e.target.value);
      render();
    });
  };
  bindRange('zoom', 'zoom');
  bindRange('panX', 'panX');
  bindRange('panY', 'panY');
  bindRange('rot', 'rot');
  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const status = document.getElementById('exportStatus');
      status.textContent = `Exporting ${btn.dataset.export}…`;
      try {
        const result = await exportPng(state, btn.dataset.export);
        status.textContent = `Exported ${result.width}×${result.height} PNG (${Math.round(result.bytes / 1024)} KiB).`;
        markStep(3);
      } catch (err) {
        status.textContent = `Export failed: ${err.message}`;
      }
    });
  });
  // Click a panel to select it; drag inside it to pan its photo.
  let drag = null;
  preview.addEventListener('pointerdown', (e) => {
    const rect = preview.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * preview.width;
    const y = ((e.clientY - rect.top) / rect.height) * preview.height;
    const idx = panelAt(state.template, x, y, preview.width, preview.height);
    if (idx < 0) return;
    state.selectedPanel = idx;
    drag = { x: e.clientX, y: e.clientY, panX: state.panels[idx].panX, panY: state.panels[idx].panY };
    preview.setPointerCapture(e.pointerId);
    render();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = preview.getBoundingClientRect();
    const scale = preview.width / rect.width;
    state.panels[state.selectedPanel].panX = drag.panX + (e.clientX - drag.x) * scale;
    state.panels[state.selectedPanel].panY = drag.panY + (e.clientY - drag.y) * scale;
    render();
  });
  preview.addEventListener('pointerup', () => { drag = null; });
}

async function boot() {
  bindControls();
  bindCaptionControls(state, render);
  try {
    const samples = await loadSamplePhotos();
    state.photos.push(...samples);
    renderThumbs(document.getElementById('thumbs'), state.photos, 0, (i) => {
      state.panels[state.selectedPanel].photo = i;
      render();
    });
    document.getElementById('sampleBoulevard').addEventListener('click', () => { state.panels[state.selectedPanel].photo = 0; render(); });
    document.getElementById('samplePier').addEventListener('click', () => { state.panels[state.selectedPanel].photo = 1; render(); });
  } catch (err) {
    document.getElementById('stageNote').textContent = `Sample photos failed to load: ${err.message}`;
  }
  await document.fonts.ready;
  render();
}

boot();
