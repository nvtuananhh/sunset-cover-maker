// App boot + state + editor wiring: photo library, layout/grade pickers,
// panel selection and drag-pan, focus-point mode, caption controls and
// the three export buttons. The preview canvas re-renders on every change.
import { SAMPLE_PHOTOS, loadSampleImages } from './samples.js';
import { seedLibrary, loadPhotoImage, addUploads, removeUpload, findPhoto, photoLibrary } from './photos.js';
import { LAYOUTS, makePanels, layoutRects, heroIndex, panelAtPoint } from './panels.js';
import { GRADES, findGrade } from './grades.js';
import { drawPoster } from './poster.js';
import { exportCoverPNG, EXPORT_SIZES } from './export.js';

export const DEFAULT_STATE = {
  layout: 'vice',
  grade: 'vice',
  grain: true,
  halftone: false,
  title: 'SUNSET CITY',
  subtitle: 'Vice never sleeps',
  tagline: 'FIVE FRIENDS · ONE COAST · NO WAY BACK',
  quote: 'HOTTER THAN THE ASPHALT',
  quoteSource: 'THE PALM GAZETTE',
  billing: 'A SUNSET PICTURES PRODUCTION · STARRING YOU · SHOT ON YOUR OWN CAMERA',
  volume: 'VOL. 1',
  season: 'SEASON ONE',
  status: 'NOW SHOWING',
  titleStyle: 'chrome',
  titleColour: 'sunset',
  titleSize: 1,
  titleY: 0,
  tracking: 0.04,
  showQuote: true,
  showSeal: true,
  showBarcode: true,
  panels: [],
  selectedPanel: 2,
  focusMode: false,
};

export const state = JSON.parse(JSON.stringify(DEFAULT_STATE));
state.panels = makePanels('vice');

const images = new Map();
let previewDirty = false;

function $(id) { return document.getElementById(id); }

function previewCanvas() { return $('previewCanvas'); }

/** Load every sample image, then paint the first preview. */
export function bootEditor() {
  seedLibrary();
  buildLibraryUI();
  buildLayoutUI();
  buildGradeUI();
  buildRoleInputs();
  wireControls();
  wireCanvas();
  loadSampleImages().then((loaded) => {
    for (const [id, img] of loaded) if (img) images.set(id, img);
    scheduleRender();
  });
  scheduleRender();
  // Test hooks: headless screenshot tooling drives the app through these.
  window.__sunset = {
    state,
    images,
    renderNow,
    setState(next) { Object.assign(state, next); scheduleRender(); },
    exportSize: async (id) => {
      const mod = await import('./export.js');
      return mod.renderExportCanvas(state, images, id);
    },
  };
}

function scheduleRender() {
  if (previewDirty) return;
  previewDirty = true;
  requestAnimationFrame(renderNow);
}

function renderNow() {
  previewDirty = false;
  const canvas = previewCanvas();
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // Preview is always landscape 960x540; exports re-render at full size.
  drawPoster(ctx, canvas.width, canvas.height, state, images);
  updatePanelLabel();
}

/** Keep the preview aspect matched to the selected export preview size. */
function updatePanelLabel() {
  const panel = state.panels[state.selectedPanel];
  const hero = heroIndex(state.layout);
  const name = state.selectedPanel === hero ? 'Hero' : 'Panel ' + (state.selectedPanel + 1);
  $('panelLabel').textContent = 'Panel: ' + name + ' — ' + (panel ? panel.role : '');
  const size = EXPORT_SIZES[0];
  $('sizeLabel').textContent = size.w + ' × ' + size.h + ' · ' + findGrade(state.grade).name + ' · ' + (LAYOUTS.find((l) => l.id === state.layout) || {}).name;
}

// ---------------------------------------------------------------- library UI

function buildLibraryUI() {
  const grid = $('photoLibrary');
  grid.innerHTML = '';
  for (const entry of photoLibrary) {
    const btn = document.createElement('button');
    btn.className = 'thumb';
    btn.type = 'button';
    btn.dataset.photoId = entry.id;
    const img = document.createElement('img');
    img.src = entry.src;
    img.alt = entry.label;
    img.draggable = false;
    const cap = document.createElement('span');
    cap.textContent = entry.label;
    btn.appendChild(img);
    btn.appendChild(cap);
    if (entry.uploaded) {
      const del = document.createElement('button');
      del.className = 'del';
      del.type = 'button';
      del.textContent = '×';
      del.title = 'Remove upload';
      del.addEventListener('click', (ev) => {
        ev.stopPropagation();
        removeUpload(entry.id);
        buildLibraryUI();
        scheduleRender();
      });
      btn.appendChild(del);
    }
    btn.addEventListener('click', () => {
      const panel = state.panels[state.selectedPanel];
      if (!panel) return;
      panel.photoId = entry.id;
      const sample = SAMPLE_PHOTOS.find((s) => s.id === entry.id);
      if (sample) { panel.focusX = sample.focusX; panel.focusY = sample.focusY; }
      loadPhotoImage(entry).then((imgEl) => { if (imgEl) images.set(entry.id, imgEl); scheduleRender(); });
      markPickedThumb(entry.id);
      buildPanelStrip();
      scheduleRender();
    });
    grid.appendChild(btn);
  }
  const current = state.panels[state.selectedPanel];
  if (current) markPickedThumb(current.photoId);
}

function markPickedThumb(photoId) {
  for (const el of document.querySelectorAll('#photoLibrary .thumb')) {
    el.classList.toggle('picked', el.dataset.photoId === photoId);
  }
}

// ---------------------------------------------------------------- layout + grade UI

function buildLayoutUI() {
  const grid = $('layoutGrid');
  grid.innerHTML = '';
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.className = 'tbtn' + (state.layout === layout.id ? ' on' : '');
    btn.type = 'button';
    btn.innerHTML = '<b></b><small></small>';
    btn.querySelector('b').textContent = layout.name;
    btn.querySelector('small').textContent = layout.desc;
    btn.addEventListener('click', () => {
      state.layout = layout.id;
      state.panels = makePanels(layout.id);
      state.selectedPanel = heroIndex(layout.id) >= 0 ? heroIndex(layout.id) : 0;
      buildLayoutUI();
      buildRoleInputs();
      buildPanelStrip();
      syncCropSliders();
      scheduleRender();
    });
    grid.appendChild(btn);
  }
}

function buildGradeUI() {
  const grid = $('gradeGrid');
  grid.innerHTML = '';
  for (const grade of GRADES) {
    const btn = document.createElement('button');
    btn.className = 'tbtn' + (state.grade === grade.id ? ' on' : '');
    btn.type = 'button';
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = grade.swatch;
    btn.appendChild(sw);
    btn.appendChild(document.createTextNode(grade.name));
    btn.addEventListener('click', () => {
      state.grade = grade.id;
      buildGradeUI();
      scheduleRender();
    });
    grid.appendChild(btn);
  }
}

// ---------------------------------------------------------------- panel strip + roles

function buildPanelStrip() {
  const strip = $('panelStrip');
  strip.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const card = document.createElement('button');
    card.className = 'pcard' + (i === state.selectedPanel ? ' on' : '');
    card.type = 'button';
    const photo = findPhoto(panel.photoId);
    card.innerHTML = '<b></b><span class="role"></span><span class="ph"></span>';
    card.querySelector('b').textContent = (i === heroIndex(state.layout) ? '★ Hero' : 'Panel ' + (i + 1));
    card.querySelector('.role').textContent = panel.role;
    card.querySelector('.ph').textContent = photo ? photo.label : panel.photoId;
    card.addEventListener('click', () => {
      state.selectedPanel = i;
      buildPanelStrip();
      buildLibraryUI();
      syncCropSliders();
      scheduleRender();
    });
    strip.appendChild(card);
  });
}

function buildRoleInputs() {
  const box = $('roleInputs');
  box.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const label = document.createElement('label');
    label.className = 'field';
    label.textContent = (i === heroIndex(state.layout) ? '★ Hero' : 'Panel ' + (i + 1)) + ' role tag';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = panel.role;
    input.maxLength = 18;
    input.addEventListener('input', () => {
      panel.role = input.value.toUpperCase();
      buildPanelStrip();
      scheduleRender();
    });
    label.appendChild(input);
    box.appendChild(label);
  });
}

function syncCropSliders() {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  $('zoomSlider').value = String(panel.zoom);
  $('panXSlider').value = String(panel.panX);
  $('panYSlider').value = String(panel.panY);
  $('rotateSlider').value = String(panel.rotate);
}

// ---------------------------------------------------------------- controls

function bindText(id, key, upper) {
  $(id).addEventListener('input', (ev) => {
    state[key] = upper ? ev.target.value.toUpperCase() : ev.target.value;
    scheduleRender();
  });
}

function bindToggle(id, key) {
  $(id).addEventListener('change', (ev) => {
    state[key] = ev.target.checked;
    scheduleRender();
  });
}

function wireControls() {
  $('uploadInput').addEventListener('change', (ev) => {
    addUploads(ev.target.files).then(() => {
      buildLibraryUI();
      scheduleRender();
      ev.target.value = '';
    });
  });
  bindText('titleInput', 'title', true);
  bindText('subtitleInput', 'subtitle', false);
  bindText('taglineInput', 'tagline', true);
  bindText('quoteInput', 'quote', true);
  bindText('quoteSourceInput', 'quoteSource', true);
  bindText('billingInput', 'billing', true);
  bindText('volumeInput', 'volume', true);
  bindText('seasonInput', 'season', true);
  bindText('statusInput', 'status', true);
  bindToggle('quoteToggle', 'showQuote');
  bindToggle('sealToggle', 'showSeal');
  bindToggle('barcodeToggle', 'showBarcode');
  bindToggle('grainToggle', 'grain');
  bindToggle('halftoneToggle', 'halftone');
  $('titleSizeSlider').addEventListener('input', (ev) => { state.titleSize = Number(ev.target.value); scheduleRender(); });
  $('titleYSlider').addEventListener('input', (ev) => { state.titleY = Number(ev.target.value); scheduleRender(); });
  $('trackingSlider').addEventListener('input', (ev) => { state.tracking = Number(ev.target.value); scheduleRender(); });
  $('titleColourSelect').addEventListener('change', (ev) => { state.titleColour = ev.target.value; scheduleRender(); });
  $('titleStyleSeg').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-style]');
    if (!btn) return;
    state.titleStyle = btn.dataset.style;
    for (const b of $('titleStyleSeg').querySelectorAll('button')) b.classList.toggle('on', b === btn);
    scheduleRender();
  });
  $('zoomSlider').addEventListener('input', (ev) => { const p = state.panels[state.selectedPanel]; if (p) { p.zoom = Number(ev.target.value); scheduleRender(); } });
  $('panXSlider').addEventListener('input', (ev) => { const p = state.panels[state.selectedPanel]; if (p) { p.panX = Number(ev.target.value); scheduleRender(); } });
  $('panYSlider').addEventListener('input', (ev) => { const p = state.panels[state.selectedPanel]; if (p) { p.panY = Number(ev.target.value); scheduleRender(); } });
  $('rotateSlider').addEventListener('input', (ev) => { const p = state.panels[state.selectedPanel]; if (p) { p.rotate = Number(ev.target.value); scheduleRender(); } });
  $('resetCropBtn').addEventListener('click', () => {
    const p = state.panels[state.selectedPanel];
    if (p) { p.zoom = 1.15; p.panX = 0; p.panY = 0; p.rotate = 0; p.focusX = 0.5; p.focusY = 0.32; syncCropSliders(); scheduleRender(); }
  });
  $('focusModeBtn').addEventListener('click', () => {
    state.focusMode = !state.focusMode;
    $('focusModeBtn').classList.toggle('on', state.focusMode);
    $('focusModeBtn').textContent = state.focusMode ? '◎ Click the preview to set focus — ON' : '◎ Set focus point';
  });
  for (const btn of document.querySelectorAll('[data-export]')) {
    btn.addEventListener('click', () => {
      const sizeId = btn.dataset.export;
      btn.disabled = true;
      $('exportStatus').textContent = 'Rendering ' + sizeId + '…';
      exportCoverPNG(state, images, sizeId).then(() => {
        $('exportStatus').textContent = 'Exported sunset-cover-' + sizeId + '.png ✓';
        btn.disabled = false;
      }).catch((err) => {
        $('exportStatus').textContent = 'Export failed: ' + err.message;
        btn.disabled = false;
      });
    });
  }
  buildPanelStrip();
}

// ---------------------------------------------------------------- canvas interaction

function canvasPoint(ev) {
  const canvas = previewCanvas();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (ev.clientX - rect.left) * scaleX, y: (ev.clientY - rect.top) * scaleY };
}

function wireCanvas() {
  const canvas = previewCanvas();
  let dragging = false;
  let last = null;
  canvas.addEventListener('pointerdown', (ev) => {
    const pt = canvasPoint(ev);
    const rects = layoutRects(state.layout, canvas.width / canvas.height).map((r) => ({
      x: r.x * canvas.width, y: r.y * canvas.height, w: r.w * canvas.width, h: r.h * canvas.height,
    }));
    const hit = panelAtPoint(rects, pt.x, pt.y);
    if (hit < 0) return;
    if (state.focusMode) {
      const panel = state.panels[hit];
      const r = rects[hit];
      panel.focusX = Math.min(0.95, Math.max(0.05, (pt.x - r.x) / r.w));
      panel.focusY = Math.min(0.95, Math.max(0.05, (pt.y - r.y) / r.h));
      state.selectedPanel = hit;
      buildPanelStrip();
      scheduleRender();
      return;
    }
    state.selectedPanel = hit;
    buildPanelStrip();
    buildLibraryUI();
    syncCropSliders();
    dragging = true;
    last = pt;
    canvas.classList.add('dragging');
    canvas.setPointerCapture(ev.pointerId);
    scheduleRender();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!dragging || !last) return;
    const pt = canvasPoint(ev);
    const panel = state.panels[state.selectedPanel];
    if (panel) {
      panel.panX = Math.min(0.4, Math.max(-0.4, panel.panX + (pt.x - last.x) / canvas.width));
      panel.panY = Math.min(0.4, Math.max(-0.4, panel.panY + (pt.y - last.y) / canvas.height));
      syncCropSliders();
      scheduleRender();
    }
    last = pt;
  });
  const endDrag = () => { dragging = false; last = null; canvas.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}

bootEditor();
