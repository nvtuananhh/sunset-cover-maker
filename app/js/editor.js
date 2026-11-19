// editor.js — app boot + state + all editor wiring. Owns the live preview:
// every control change re-renders the same canvas the exporter writes.
(function () {
  'use strict';

  var SCM = window.SCM;

  var state = {
    layout: 'hero',
    grade: 'sunset',
    grain: true,
    halftone: false,
    frames: true,
    size: '1080x1350',
    photos: [],
    panels: [SCM.defaultPanel(), SCM.defaultPanel(), SCM.defaultPanel(), SCM.defaultPanel()],
    selectedPanel: 0,
    caption: SCM.defaultCaption(),
  };

  var preview, sizeLabel, gradeLabel, exportStatus;
  var renderQueued = false;

  function $(id) { return document.getElementById(id); }

  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      renderPreview();
    });
  }

  function renderPreview() {
    var size = SCM.sizes[state.size];
    SCM.renderCover(preview, size.w, size.h, state);
    sizeLabel.textContent = size.label;
    gradeLabel.textContent = SCM.grades[state.grade].label;
  }

  // ---- photo strip ---------------------------------------------------------
  function refreshPhotoStrip() {
    var strip = $('photoStrip');
    strip.innerHTML = '';
    if (state.photos.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'photo-thumb is-empty';
      empty.textContent = 'No photos yet';
      strip.appendChild(empty);
    }
    state.photos.forEach(function (photo, idx) {
      var img = document.createElement('img');
      img.className = 'photo-thumb';
      img.src = photo.img.src;
      img.alt = photo.label;
      img.title = photo.label;
      img.addEventListener('click', function () {
        state.panels[state.selectedPanel].photo = idx;
        refreshPanelControls();
        requestRender();
      });
      strip.appendChild(img);
    });
    refreshPanelPhotoSelect();
  }

  function refreshPanelPhotoSelect() {
    var sel = $('panelPhoto');
    sel.innerHTML = '';
    state.photos.forEach(function (photo, idx) {
      var opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = (idx + 1) + ' · ' + photo.label;
      sel.appendChild(opt);
    });
    var cur = state.panels[state.selectedPanel];
    sel.value = String(cur.photo);
    sel.disabled = state.photos.length === 0;
  }

  function refreshPanelControls() {
    var p = state.panels[state.selectedPanel];
    $('zoomSlider').value = String(p.zoom);
    $('zoomVal').textContent = p.zoom.toFixed(2) + '×';
    $('rotSlider').value = String(p.rot);
    $('rotVal').textContent = p.rot + '°';
    var count = SCM.panelCount(state.layout);
    $('panelHint').textContent =
      'Panel ' + (state.selectedPanel + 1) + ' of ' + count +
      ' selected — zoom, rotate and pan apply to it.';
    refreshPanelPhotoSelect();
  }

  function markStepDone(n) {
    var el = $('step' + n);
    if (el) el.classList.add('is-done');
  }

  // ---- caption controls ----------------------------------------------------
  function bindCaptionControls() {
    $('titleInput').addEventListener('input', function (e) {
      state.caption.title = e.target.value;
      requestRender();
    });
    $('subtitleInput').addEventListener('input', function (e) {
      state.caption.subtitle = e.target.value;
      requestRender();
    });
    $('tagInput').addEventListener('input', function (e) {
      state.caption.tag = e.target.value;
      requestRender();
    });
    $('titleSizeSlider').addEventListener('input', function (e) {
      state.caption.sizePct = Number(e.target.value);
      $('titleSizeVal').textContent = e.target.value + '%';
      requestRender();
    });
    $('spacingSlider').addEventListener('input', function (e) {
      state.caption.spacing = Number(e.target.value);
      $('spacingVal').textContent = e.target.value + ' px';
      requestRender();
    });
    $('captionColor').addEventListener('change', function (e) {
      state.caption.color = e.target.value;
      requestRender();
    });
    $('capYSlider').addEventListener('input', function (e) {
      state.caption.yPct = Number(e.target.value);
      $('capYVal').textContent = capYLabel(Number(e.target.value));
      requestRender();
    });
    $('resetBtn').addEventListener('click', function () {
      state.caption = SCM.defaultCaption();
      syncCaptionInputs();
      requestRender();
    });
    $('shuffleBtn').addEventListener('click', function () {
      var grades = SCM.gradeNames();
      var layouts = SCM.layoutNames();
      var colors = Object.keys(SCM.captionColors);
      state.grade = grades[Math.floor(Math.random() * grades.length)];
      state.layout = layouts[Math.floor(Math.random() * layouts.length)];
      state.caption.color = colors[Math.floor(Math.random() * colors.length)];
      state.caption.yPct = 62 + Math.floor(Math.random() * 26);
      syncChoiceButtons();
      syncCaptionInputs();
      refreshPanelControls();
      requestRender();
    });
  }

  function capYLabel(v) {
    if (v < 30) return 'Top';
    if (v < 60) return 'Upper middle';
    if (v < 85) return 'Lower';
    return 'Bottom';
  }

  function syncCaptionInputs() {
    $('titleInput').value = state.caption.title;
    $('subtitleInput').value = state.caption.subtitle;
    $('tagInput').value = state.caption.tag;
    $('titleSizeSlider').value = String(state.caption.sizePct);
    $('titleSizeVal').textContent = state.caption.sizePct + '%';
    $('spacingSlider').value = String(state.caption.spacing);
    $('spacingVal').textContent = state.caption.spacing + ' px';
    $('captionColor').value = state.caption.color;
    $('capYSlider').value = String(state.caption.yPct);
    $('capYVal').textContent = capYLabel(state.caption.yPct);
  }

  // ---- layout / grade / effect choices -------------------------------------
  function syncChoiceButtons() {
    document.querySelectorAll('#layoutChoices .choice').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.layout === state.layout);
    });
    document.querySelectorAll('#gradeChoices .choice').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.grade === state.grade);
    });
    document.querySelectorAll('.export-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.export === state.size);
    });
  }

  function bindChoices() {
    document.querySelectorAll('#layoutChoices .choice').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.layout = btn.dataset.layout;
        state.selectedPanel = 0;
        syncChoiceButtons();
        refreshPanelControls();
        requestRender();
      });
    });
    document.querySelectorAll('#gradeChoices .choice').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.grade = btn.dataset.grade;
        syncChoiceButtons();
        requestRender();
      });
    });
    $('grainToggle').addEventListener('change', function (e) {
      state.grain = e.target.checked;
      requestRender();
    });
    $('halftoneToggle').addEventListener('change', function (e) {
      state.halftone = e.target.checked;
      requestRender();
    });
    $('frameToggle').addEventListener('change', function (e) {
      state.frames = e.target.checked;
      requestRender();
    });
    document.querySelectorAll('.export-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.size = btn.dataset.export;
        syncChoiceButtons();
        requestRender();
      });
    });
  }

  // ---- panel controls --------------------------------------------------------
  function bindPanelControls() {
    $('panelPhoto').addEventListener('change', function (e) {
      state.panels[state.selectedPanel].photo = Number(e.target.value);
      requestRender();
    });
    $('zoomSlider').addEventListener('input', function (e) {
      state.panels[state.selectedPanel].zoom = Number(e.target.value);
      $('zoomVal').textContent = Number(e.target.value).toFixed(2) + '×';
      requestRender();
    });
    $('rotSlider').addEventListener('input', function (e) {
      state.panels[state.selectedPanel].rot = Number(e.target.value);
      $('rotVal').textContent = e.target.value + '°';
      requestRender();
    });
  }

  // ---- uploads ---------------------------------------------------------------
  function bindUploads() {
    $('photoInput').addEventListener('change', function (e) {
      addUploadedFiles(e.target.files);
      e.target.value = '';
    });
    $('useSamplesBtn').addEventListener('click', function () {
      loadSamplesIntoState();
    });
  }

  function addUploadedFiles(files) {
    SCM.readPhotoFiles(files, function (name, why) {
      exportStatus.textContent = 'Skipped ' + name + ': ' + why + '.';
    }).then(function (photos) {
      if (photos.length === 0) return;
      state.photos = state.photos.concat(photos);
      // New photos fill empty panels first, then replace the selected one.
      photos.forEach(function (photo, k) {
        var idx = state.photos.indexOf(photo);
        var empty = state.panels.findIndex(function (p) { return !state.photos[p.photo]; });
        if (empty >= 0) state.panels[empty].photo = idx;
        else if (k === 0) state.panels[state.selectedPanel].photo = idx;
      });
      markStepDone(1);
      refreshPhotoStrip();
      refreshPanelControls();
      requestRender();
    });
  }

  function loadSamplesIntoState() {
    SCM.loadSamples().then(function (samples) {
      if (samples.length === 0) {
        exportStatus.textContent = 'Sample photos could not be loaded.';
        return;
      }
      // Keep user uploads first; samples append after them. Panels take
      // alternating photos so neighbouring panels never repeat the same shot.
      var base = state.photos.length;
      state.photos = state.photos.concat(samples);
      state.panels.forEach(function (p, i) {
        p.photo = (base + i) % state.photos.length;
      });
      markStepDone(1);
      refreshPhotoStrip();
      refreshPanelControls();
      requestRender();
    });
  }

  // ---- preview dragging: caption first, else pan the panel ------------------
  function bindPreviewDrag() {
    var drag = null;
    function toCover(e) {
      var r = preview.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * preview.width,
        y: ((e.clientY - r.top) / r.height) * preview.height,
      };
    }
    preview.addEventListener('pointerdown', function (e) {
      var pt = toCover(e);
      var capRect = SCM.captionBlockRect(preview.width, preview.height, state.caption);
      if (pt.x >= capRect.x && pt.x <= capRect.x + capRect.w &&
          pt.y >= capRect.y && pt.y <= capRect.y + capRect.h) {
        drag = { kind: 'caption', startX: pt.x, startY: pt.y, xPct: state.caption.xPct, yPct: state.caption.yPct };
      } else {
        var rects = SCM.layoutRects(state.layout, preview.width, preview.height);
        var hit = SCM.hitPanel(rects, pt.x, pt.y);
        if (hit >= 0) {
          state.selectedPanel = hit;
          refreshPanelControls();
          var p = state.panels[hit];
          drag = { kind: 'pan', startX: pt.x, startY: pt.y, ox: p.ox, oy: p.oy, rect: rects[hit] };
        }
      }
      if (drag) preview.setPointerCapture(e.pointerId);
    });
    preview.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var pt = toCover(e);
      if (drag.kind === 'caption') {
        state.caption.xPct = Math.max(8, Math.min(92, drag.xPct + ((pt.x - drag.startX) / preview.width) * 100));
        state.caption.yPct = Math.max(6, Math.min(96, drag.yPct + ((pt.y - drag.startY) / preview.height) * 100));
        $('capYSlider').value = String(Math.round(state.caption.yPct));
        $('capYVal').textContent = capYLabel(Math.round(state.caption.yPct));
      } else {
        var p = state.panels[state.selectedPanel];
        p.ox = Math.max(-0.6, Math.min(0.6, drag.ox + (pt.x - drag.startX) / drag.rect.w));
        p.oy = Math.max(-0.6, Math.min(0.6, drag.oy + (pt.y - drag.startY) / drag.rect.h));
      }
      requestRender();
    });
    function endDrag() { drag = null; }
    preview.addEventListener('pointerup', endDrag);
    preview.addEventListener('pointercancel', endDrag);
  }

  // ---- export ----------------------------------------------------------------
  function bindExport() {
    $('downloadBtn').addEventListener('click', function () {
      exportStatus.textContent = 'Rendering ' + state.size + '…';
      SCM.downloadPNG(state.size, state).then(function (out) {
        exportStatus.textContent = 'Downloaded sunset-cover-' + state.size + '.png (' + out.width + ' × ' + out.height + ').';
        markStepDone(3);
      }).catch(function (err) {
        exportStatus.textContent = 'Export failed: ' + err.message;
      });
    });
  }

  // ---- deterministic URL params (for screenshots + sharing a look) -----------
  function applyUrlParams() {
    var q = new URLSearchParams(location.search);
    if (q.get('layout') && SCM.layouts[q.get('layout')]) state.layout = q.get('layout');
    if (q.get('grade') && SCM.grades[q.get('grade')]) state.grade = q.get('grade');
    if (q.get('size') && SCM.sizes[q.get('size')]) state.size = q.get('size');
    if (q.get('title') !== null) state.caption.title = q.get('title');
    if (q.get('subtitle') !== null) state.caption.subtitle = q.get('subtitle');
    if (q.get('tag') !== null) state.caption.tag = q.get('tag');
    if (q.get('color') && SCM.captionColors[q.get('color')]) state.caption.color = q.get('color');
    if (q.get('capy') !== null) state.caption.yPct = Number(q.get('capy')) || state.caption.yPct;
    if (q.get('halftone') === '1') state.halftone = true;
    if (q.get('grain') === '0') state.grain = false;
    return q;
  }

  // ---- boot ------------------------------------------------------------------
  function boot() {
    preview = $('preview');
    sizeLabel = $('sizeLabel');
    gradeLabel = $('gradeLabel');
    exportStatus = $('exportStatus');

    var q = applyUrlParams();
    bindCaptionControls();
    bindChoices();
    bindPanelControls();
    bindUploads();
    bindPreviewDrag();
    bindExport();
    syncCaptionInputs();
    syncChoiceButtons();
    $('grainToggle').checked = state.grain;
    $('halftoneToggle').checked = state.halftone;
    $('frameToggle').checked = state.frames;

    // Samples first so the app is usable with zero uploads; the URL param
    // ?sample=none skips them (bare editor shot).
    var wantSamples = q.get('sample') !== 'none';
    if (wantSamples) {
      loadSamplesIntoState();
    } else {
      refreshPhotoStrip();
    }
    refreshPanelControls();
    // Fonts load async; re-render once Anton/Inter are ready so the
    // preview (and any export) uses the real lettering.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { requestRender(); });
    }
    requestRender();
    window.SCM.state = state;
    window.SCM.ready = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
