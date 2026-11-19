// app/js/editor.js — app boot + state + the editor UI.
//
// Three steps, left to right: 1 Upload photos, 2 Arrange + caption,
// 3 Export a PNG. The centre canvas is a live preview: it paints through
// the same paintCover the exporter uses, so the preview IS the export.
import { LAYOUTS, layoutRects, layoutPanelCount, defaultPanel, clampPanel, hitPanel } from './panels.js';
import { GRADES } from './grades.js';
import { CAPTION_COLORS, defaultCaption, measureCaptionBlock } from './caption.js';
import { EXPORT_SIZES, exportSizeById, paintCover, downloadCoverPng, exportCoverPng } from './export.js';
import { loadPhotoFiles } from './photos.js';
import { loadSamplePhotos } from './samples.js';

export const state = {
  layout: 'hero',
  grade: 'sunset',
  size: '1920x1080',
  photos: [],
  panels: [defaultPanel(null), defaultPanel(null), defaultPanel(null), defaultPanel(null)],
  caption: defaultCaption(),
  effects: { grain: true, halftone: false, vignette: true },
  selectedPanel: 0,
  exports: 0,
};

const $ = (id) => document.getElementById(id);
const photoById = new Map();
const measureCanvas = document.createElement('canvas');
let previewCtx = null;
let drag = null;
let captionTouched = false;
let layoutTouched = false;

/** Rebuild the photo id -> image map after photos change. */
function rebuildPhotoMap() {
  photoById.clear();
  for (const p of state.photos) photoById.set(p.id, p.img);
}

/** Assign photos to panels: fill in order, cycling when photos are fewer. */
function autoAssignPhotos() {
  if (state.photos.length === 0) return;
  for (let i = 0; i < state.panels.length; i++) {
    if (!state.panels[i].photoId || !photoById.has(state.panels[i].photoId)) {
      state.panels[i].photoId = state.photos[i % state.photos.length].id;
    }
  }
}

/** Size the preview canvas to the export aspect (max side ~900 px). */
function sizePreviewCanvas() {
  const size = exportSizeById(state.size);
  const scale = Math.min(900 / size.w, 900 / size.h, 1);
  const canvas = $('preview');
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  previewCtx = canvas.getContext('2d');
}

/** Paint the live preview and refresh the readouts. */
export function renderPreview() {
  if (!previewCtx) sizePreviewCanvas();
  const canvas = $('preview');
  paintCover(previewCtx, canvas.width, canvas.height, state, photoById);
  $('sizeReadout').textContent = `${exportSizeById(state.size).w} × ${exportSizeById(state.size).h}`;
  $('panelLabel').textContent = `Panel ${state.selectedPanel + 1} of ${layoutPanelCount(state.layout)}`;
  updateSteps();
}

/** Step indicator: 1 Upload, 2 Arrange + caption, 3 Export. */
function updateSteps() {
  const step1 = state.photos.length > 0;
  const step2 = step1 && (captionTouched || layoutTouched);
  const step3 = state.exports > 0;
  $('stepLine').textContent = [
    step1 ? '✓ 1 Upload' : '1 Upload',
    step2 ? '✓ 2 Arrange + caption' : '2 Arrange + caption',
    step3 ? `✓ 3 Export (${state.exports} PNG)` : '3 Export',
  ].join('  ·  ');
  $('stepLine').classList.toggle('done', step3);
}

// ------------------------------------------------------------------ panels UI
/** Rebuild the photo thumbnail strip. */
function renderPhotoList() {
  const list = $('photoList');
  list.innerHTML = '';
  for (const photo of state.photos) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = `${photo.name} — click to put in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    const span = document.createElement('span');
    span.textContent = photo.name;
    btn.append(img, span);
    btn.addEventListener('click', () => {
      state.panels[state.selectedPanel].photoId = photo.id;
      renderPreview();
      renderPanelControls();
    });
    list.appendChild(btn);
  }
  if (state.photos.length === 0) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'No photos yet — upload yours or load the samples.';
    list.appendChild(p);
  }
}

/** Rebuild the per-panel photo picker + sliders for the selected panel. */
function renderPanelControls() {
  const panel = state.panels[state.selectedPanel];
  const select = $('panelPhoto');
  select.innerHTML = '';
  for (const photo of state.photos) {
    const opt = document.createElement('option');
    opt.value = photo.id;
    opt.textContent = photo.name;
    select.appendChild(opt);
  }
  select.value = panel.photoId || '';
  select.disabled = state.photos.length === 0;
  $('zoomRange').value = String(panel.zoom);
  $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
  $('rotRange').value = String(panel.rot);
  $('rotVal').textContent = `${panel.rot > 0 ? '+' : ''}${Math.round(panel.rot)}°`;
  document.querySelectorAll('#templateList .choice').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === state.layout);
  });
  document.querySelectorAll('#gradeList .choice').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === state.grade);
  });
  document.querySelectorAll('#sizeList .choice').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === state.size);
  });
}

/** Build the template / grade / colour / size choice buttons. */
function buildChoices() {
  const templates = $('templateList');
  for (const [id, layout] of Object.entries(LAYOUTS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.dataset.id = id;
    btn.innerHTML = `<strong>${layout.name}</strong><span>${layout.blurb}</span>`;
    btn.addEventListener('click', () => {
      state.layout = id;
      layoutTouched = true;
      if (state.selectedPanel >= layoutPanelCount(id)) state.selectedPanel = 0;
      renderPanelControls();
      renderPreview();
    });
    templates.appendChild(btn);
  }
  const grades = $('gradeList');
  for (const [id, grade] of Object.entries(GRADES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.dataset.id = id;
    const sw = grade.swatch.map((c) => `<i style="background:${c}"></i>`).join('');
    btn.innerHTML = `<span class="swatches">${sw}</span><strong>${grade.name}</strong><span>${grade.blurb}</span>`;
    btn.addEventListener('click', () => {
      state.grade = id;
      renderPanelControls();
      renderPreview();
    });
    grades.appendChild(btn);
  }
  const colors = $('colorList');
  CAPTION_COLORS.forEach((preset, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch-btn';
    btn.dataset.index = String(i);
    btn.title = preset.name;
    btn.style.background = preset.gradient
      ? `linear-gradient(135deg, ${preset.gradient[0]}, ${preset.gradient[1]})`
      : preset.fill;
    btn.addEventListener('click', () => {
      state.caption.color = i;
      captionTouched = true;
      document.querySelectorAll('#colorList .swatch-btn').forEach((el) => {
        el.classList.toggle('active', Number(el.dataset.index) === i);
      });
      renderPreview();
    });
    colors.appendChild(btn);
  });
  const sizes = $('sizeList');
  for (const size of EXPORT_SIZES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.dataset.id = size.id;
    btn.innerHTML = `<strong>${size.label} · ${size.w}×${size.h}</strong><span>${size.sub}</span>`;
    btn.addEventListener('click', () => {
      state.size = size.id;
      sizePreviewCanvas();
      renderPanelControls();
      renderPreview();
    });
    sizes.appendChild(btn);
  }
}

// ------------------------------------------------------------------ caption UI
function bindCaptionControls() {
  const cap = state.caption;
  $('titleInput').value = cap.title;
  $('subtitleInput').value = cap.subtitle;
  $('taglineInput').value = cap.tagline;
  const markTouched = () => {
    captionTouched = true;
  };
  $('titleInput').addEventListener('input', (e) => {
    cap.title = e.target.value || 'UNTITLED';
    markTouched();
    renderPreview();
  });
  $('subtitleInput').addEventListener('input', (e) => {
    cap.subtitle = e.target.value;
    markTouched();
    renderPreview();
  });
  $('taglineInput').addEventListener('input', (e) => {
    cap.tagline = e.target.value;
    markTouched();
    renderPreview();
  });
  $('capSizeRange').addEventListener('input', (e) => {
    cap.size = Number(e.target.value);
    $('capSizeVal').textContent = `${Math.round(cap.size * 100)}%`;
    markTouched();
    renderPreview();
  });
  $('spacingRange').addEventListener('input', (e) => {
    cap.spacing = Number(e.target.value);
    $('spacingVal').textContent = `${Math.round(cap.spacing * 1000) / 10}%`;
    markTouched();
    renderPreview();
  });
  $('resetCaptionBtn').addEventListener('click', () => {
    state.caption = defaultCaption();
    $('titleInput').value = state.caption.title;
    $('subtitleInput').value = state.caption.subtitle;
    $('taglineInput').value = state.caption.tagline;
    $('capSizeRange').value = '1';
    $('spacingRange').value = '0.04';
    $('capSizeVal').textContent = '100%';
    $('spacingVal').textContent = '4%';
    renderPreview();
  });
}

// ------------------------------------------------------------------ panel controls
function bindPanelControls() {
  $('panelPhoto').addEventListener('change', (e) => {
    state.panels[state.selectedPanel].photoId = e.target.value || null;
    renderPreview();
  });
  $('fillAllBtn').addEventListener('click', () => {
    const id = state.panels[state.selectedPanel].photoId;
    if (!id) return;
    for (const p of state.panels) p.photoId = id;
    renderPreview();
  });
  $('zoomRange').addEventListener('input', (e) => {
    const panel = state.panels[state.selectedPanel];
    panel.zoom = Number(e.target.value);
    clampPanel(panel);
    $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
    renderPreview();
  });
  $('rotRange').addEventListener('input', (e) => {
    const panel = state.panels[state.selectedPanel];
    panel.rot = Number(e.target.value);
    clampPanel(panel);
    $('rotVal').textContent = `${panel.rot > 0 ? '+' : ''}${Math.round(panel.rot)}°`;
    renderPreview();
  });
  $('resetPanelBtn').addEventListener('click', () => {
    const keep = state.panels[state.selectedPanel].photoId;
    state.panels[state.selectedPanel] = defaultPanel(keep);
    renderPanelControls();
    renderPreview();
  });
}

// ------------------------------------------------------------------ canvas drag
/** Canvas pixel coordinates for a pointer event. */
function eventPoint(e) {
  const canvas = $('preview');
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function bindCanvasDrag() {
  const canvas = $('preview');
  const mctx = measureCanvas.getContext('2d');
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = eventPoint(e);
    const block = measureCaptionBlock(mctx, canvas.width, canvas.height, state.caption);
    if (p.x >= block.x - 8 && p.x <= block.x + block.w + 8 && p.y >= block.y - 8 && p.y <= block.y + block.h + 8) {
      drag = { mode: 'caption', last: p };
      return;
    }
    const rects = layoutRects(state.layout, canvas.width, canvas.height);
    const hit = hitPanel(rects, p.x, p.y);
    if (hit >= 0) {
      state.selectedPanel = hit;
      renderPanelControls();
      renderPreview();
      drag = { mode: 'pan', last: p, rect: rects[hit] };
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = eventPoint(e);
    const dx = p.x - drag.last.x;
    const dy = p.y - drag.last.y;
    drag.last = p;
    if (drag.mode === 'caption') {
      state.caption.x = Math.min(0.94, Math.max(0.06, state.caption.x + dx / canvas.width));
      state.caption.y = Math.min(0.97, Math.max(0.08, state.caption.y + dy / canvas.height));
      captionTouched = true;
    } else if (drag.mode === 'pan') {
      const panel = state.panels[state.selectedPanel];
      panel.ox += dx / drag.rect.w;
      panel.oy += dy / drag.rect.h;
      clampPanel(panel);
      $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
    }
    renderPreview();
  });
  const endDrag = () => {
    drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[state.selectedPanel];
    panel.zoom = Math.min(3, Math.max(1, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    clampPanel(panel);
    renderPanelControls();
    renderPreview();
  }, { passive: false });
  canvas.addEventListener('dblclick', () => {
    const panel = state.panels[state.selectedPanel];
    const keep = panel.photoId;
    state.panels[state.selectedPanel] = defaultPanel(keep);
    renderPanelControls();
    renderPreview();
  });
}

// ------------------------------------------------------------------ upload + export
function bindUploadAndExport() {
  $('uploadBtn').addEventListener('click', () => $('uploadInput').click());
  $('uploadInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (files.length === 0) return;
    const loaded = await loadPhotoFiles(files);
    state.photos.push(...loaded);
    rebuildPhotoMap();
    autoAssignPhotos();
    renderPhotoList();
    renderPanelControls();
    renderPreview();
    e.target.value = '';
  });
  $('loadSamplesBtn').addEventListener('click', async () => {
    const samples = await loadSamplePhotos();
    for (const s of samples) {
      if (!state.photos.some((p) => p.name === s.name)) state.photos.push(s);
    }
    rebuildPhotoMap();
    autoAssignPhotos();
    renderPhotoList();
    renderPanelControls();
    renderPreview();
  });
  const setFx = (key, input) => {
    input.addEventListener('change', () => {
      state.effects[key] = input.checked;
      renderPreview();
    });
  };
  setFx('grain', $('fxGrain'));
  setFx('halftone', $('fxHalftone'));
  setFx('vignette', $('fxVignette'));
  $('exportBtn').addEventListener('click', async () => {
    $('exportBtn').disabled = true;
    $('exportStatus').textContent = 'Rendering PNG…';
    try {
      const { size, bytes } = await downloadCoverPng(state, photoById, state.size);
      state.exports += 1;
      $('exportStatus').textContent = `Saved sunset-cover-${size.id}.png (${size.w}×${size.h}, ~${Math.round(bytes / 1024)} KB)`;
      renderPreview();
    } catch (err) {
      $('exportStatus').textContent = `Export failed: ${err.message}`;
      console.error(err);
    } finally {
      $('exportBtn').disabled = false;
    }
  });
  $('exportAllBtn').addEventListener('click', async () => {
    $('exportAllBtn').disabled = true;
    $('exportStatus').textContent = 'Rendering all 3 sizes…';
    try {
      for (const size of EXPORT_SIZES) {
        await downloadCoverPng(state, photoById, size.id);
        state.exports += 1;
      }
      $('exportStatus').textContent = 'Saved all 3 sizes: 1080×1080, 1080×1350, 1920×1080.';
      renderPreview();
    } catch (err) {
      $('exportStatus').textContent = `Export failed: ${err.message}`;
      console.error(err);
    } finally {
      $('exportAllBtn').disabled = false;
    }
  });
}

// ------------------------------------------------------------------ boot
async function boot() {
  buildChoices();
  bindCaptionControls();
  bindPanelControls();
  bindCanvasDrag();
  bindUploadAndExport();
  document.querySelectorAll('#colorList .swatch-btn')[0]?.classList.add('active');
  sizePreviewCanvas();
  renderPanelControls();
  renderPreview();
  // Built-in samples first, so the app works with zero uploads.
  const samples = await loadSamplePhotos();
  state.photos.push(...samples);
  rebuildPhotoMap();
  autoAssignPhotos();
  renderPhotoList();
  renderPanelControls();
  // Wait for the display fonts so the first paint already has real lettering.
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('600 20px Inter'),
      document.fonts.ready,
    ]);
  } catch (err) {
    console.warn('[fonts]', err.message);
  }
  renderPreview();
  window.SunsetCover = {
    state,
    photoById,
    paintCover,
    exportCoverPng,
    EXPORT_SIZES,
    renderPreview,
    ready: true,
  };
  window.dispatchEvent(new CustomEvent('sunset-ready'));
}

boot();
