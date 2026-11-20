// editor.js — app boot, state, and every control. The editor is a thin
// shell over renderCover(): any control change re-renders the preview
// from the same state the export uses, so preview and PNG always agree.
// No wall-clock or randomness in this file.
(function () {
  'use strict';

  var Panels = window.SunsetPanels;
  var Grades = window.SunsetGrades;
  var Samples = window.SunsetSamples;

  var CAST = [
    { src: 'samples/boss-man.jpg', role: 'THE BOSS', focus: { x: 0.5, y: 0.32 } },
    { src: 'samples/driver-woman.jpg', role: 'THE DRIVER', focus: { x: 0.5, y: 0.32 } },
    { src: 'samples/hero-woman.jpg', role: 'THE CAPTAIN', focus: { x: 0.5, y: 0.30 } },
    { src: 'samples/rider-man.jpg', role: 'THE LOOKOUT', focus: { x: 0.5, y: 0.32 } },
    { src: 'samples/beach-duo.jpg', role: 'THE FIXER', focus: { x: 0.5, y: 0.35 } },
    { src: 'samples/marina.jpg', role: 'THE NAVIGATOR', focus: { x: 0.5, y: 0.50 } },
  ];

  function defaultPanels() {
    return CAST.map(function (c, i) {
      var p = Panels.makePanel(c.src, i);
      p.role = c.role;
      p.focus = { x: c.focus.x, y: c.focus.y };
      return p;
    });
  }

  var state = {
    layout: 'vice',
    grade: 'vice-sunset',
    title: 'SUNSET',
    titleStyle: 'chrome',
    subtitle: 'five friends · one coast',
    tagline: 'FIVE FRIENDS · ONE COAST · NO WAY BACK',
    quote: 'HOTTER THAN THE ASPHALT',
    quoteSource: 'THE PALM GAZETTE',
    billing: 'A SUNSET PICTURES PRODUCTION · STARRING YOU · SHOT ON YOUR OWN CAMERA · GRADED BY HAND',
    catalogue: 'SCM-2026-001',
    titleSize: 1,
    titleY: 0.62,
    letterSpacing: 0.02,
    showQuote: true,
    showBilling: true,
    showBarcode: true,
    showSeal: true,
    showLabels: true,
    status: 'COMING SOON',
    grain: true,
    halftone: false,
    vignette: true,
    exportW: 1920,
    exportH: 1080,
    selected: 2,
    panels: defaultPanels(),
    uploads: [],
  };

  var preview = null;
  var renderQueued = false;
  var ready = false;

  function $(id) { return document.getElementById(id); }

  function allPhotos() {
    var list = Samples.SAMPLES.map(function (s) { return { src: s.src, label: s.label }; });
    state.uploads.forEach(function (u) { list.push({ src: u.src, label: u.label }); });
    return list;
  }

  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      renderPreview();
    });
  }

  function renderPreview() {
    if (!preview) return Promise.resolve(false);
    return window.SunsetExport.renderPreviewInto(preview).then(function () {
      if (!ready) {
        ready = true;
        window.__sunsetReady = true;
      }
      updateInfo();
      return true;
    }).catch(function (err) {
      window.__sunsetError = String(err && err.message || err);
      return false;
    });
  }

  function updateInfo() {
    var layout = Panels.LAYOUTS[state.layout];
    var grade = Grades.GRADES[state.grade];
    $('previewInfo').textContent = state.exportW + ' × ' + state.exportH + ' · ' + layout.name + ' · ' + grade.name;
    var panel = state.panels[state.selected];
    var visible = Panels.panelCount(state.layout);
    var label = panel ? panel.role : '—';
    $('panelLabel').textContent = 'Panel ' + (state.selected + 1) + ' of ' + visible + ' — ' + label;
    if (panel) {
      $('roleInput').value = panel.role;
      $('zoomRange').value = Math.round(panel.zoom * 100);
      $('zoomVal').textContent = Math.round(panel.zoom * 100) + '%';
      $('rotRange').value = panel.rot;
      $('rotVal').textContent = panel.rot + '°';
      $('photoPicker').value = panel.photo;
    }
  }

  function buildPhotoGrid() {
    var grid = $('photoGrid');
    grid.innerHTML = '';
    Samples.SAMPLES.forEach(function (s) {
      var fig = document.createElement('figure');
      fig.title = s.label;
      var img = document.createElement('img');
      img.src = s.src;
      img.alt = s.label;
      var cap = document.createElement('figcaption');
      cap.textContent = s.label;
      fig.appendChild(img);
      fig.appendChild(cap);
      fig.addEventListener('click', function () {
        state.panels[state.selected].photo = s.src;
        state.panels[state.selected].role = s.role;
        refreshPhotoPicker();
        requestRender();
      });
      grid.appendChild(fig);
    });
  }

  function refreshPhotoPicker() {
    var sel = $('photoPicker');
    var current = state.panels[state.selected] ? state.panels[state.selected].photo : '';
    sel.innerHTML = '';
    allPhotos().forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p.src;
      opt.textContent = p.label;
      sel.appendChild(opt);
    });
    if (current && !allPhotos().some(function (p) { return p.src === current; })) {
      var opt = document.createElement('option');
      opt.value = current;
      opt.textContent = 'Current photo';
      sel.appendChild(opt);
    }
    sel.value = current;
  }

  function buildChoiceLists() {
    var tl = $('templateList');
    tl.innerHTML = '';
    Panels.LAYOUT_ORDER.forEach(function (id) {
      var l = Panels.LAYOUTS[id];
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.layout = id;
      b.innerHTML = '';
      var name = document.createElement('span');
      name.textContent = l.name;
      var blurb = document.createElement('small');
      blurb.textContent = l.blurb;
      var left = document.createElement('span');
      left.appendChild(name);
      left.appendChild(blurb);
      b.appendChild(left);
      if (id === state.layout) b.classList.add('active');
      b.addEventListener('click', function () {
        state.layout = id;
        if (state.selected >= Panels.panelCount(id)) state.selected = 0;
        tl.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x.dataset.layout === id); });
        refreshPhotoPicker();
        requestRender();
      });
      tl.appendChild(b);
    });

    var gl = $('gradeList');
    gl.innerHTML = '';
    Grades.GRADE_ORDER.forEach(function (id) {
      var g = Grades.GRADES[id];
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.grade = id;
      var name = document.createElement('span');
      name.textContent = g.name;
      var sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = g.swatch;
      b.appendChild(name);
      b.appendChild(sw);
      if (id === state.grade) b.classList.add('active');
      b.addEventListener('click', function () {
        state.grade = id;
        gl.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x.dataset.grade === id); });
        requestRender();
      });
      gl.appendChild(b);
    });
  }

  function bindText(id, key, transform) {
    $(id).addEventListener('input', function (e) {
      state[key] = transform ? transform(e.target.value) : e.target.value;
      requestRender();
    });
  }

  function bindCheck(id, key) {
    $(id).addEventListener('change', function (e) {
      state[key] = e.target.checked;
      requestRender();
    });
  }

  function bindRange(id, key, valId, fmt) {
    $(id).addEventListener('input', function (e) {
      var v = Number(e.target.value);
      state[key] = v;
      $(valId).textContent = fmt(v);
      requestRender();
    });
  }

  function setExportSize(w, h, btn) {
    state.exportW = w;
    state.exportH = h;
    document.querySelectorAll('.size-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
    // Preview follows the export aspect: 960 wide for landscape, 600 for the rest.
    if (w >= h) { preview.width = 960; preview.height = 540; }
    else if (w === h) { preview.width = 600; preview.height = 600; }
    else { preview.width = 600; preview.height = 750; }
    requestRender();
  }

  function bindAll() {
    $('uploadInput').addEventListener('change', function (e) {
      window.SunsetPhotos.readUploads(e.target.files).then(function (ups) {
        if (ups.length === 0) return;
        state.uploads = state.uploads.concat(ups);
        state.panels[state.selected].photo = ups[0].src;
        refreshPhotoPicker();
        requestRender();
      }).catch(function (err) {
        $('exportInfo').textContent = 'Upload failed: ' + err.message;
      });
    });
    $('fillAllBtn').addEventListener('click', function () {
      var photos = allPhotos();
      var n = Panels.panelCount(state.layout);
      for (var i = 0; i < n; i++) state.panels[i].photo = photos[i % photos.length].src;
      requestRender();
    });
    $('shuffleBtn').addEventListener('click', function () {
      // Fixed one-slot rotation: a deterministic re-deal of the cast.
      var n = Panels.panelCount(state.layout);
      var first = state.panels[0].photo;
      var firstRole = state.panels[0].role;
      for (var i = 0; i < n - 1; i++) {
        state.panels[i].photo = state.panels[i + 1].photo;
        state.panels[i].role = state.panels[i + 1].role;
      }
      state.panels[n - 1].photo = first;
      state.panels[n - 1].role = firstRole;
      requestRender();
    });
    $('photoPicker').addEventListener('change', function (e) {
      state.panels[state.selected].photo = e.target.value;
      requestRender();
    });
    $('roleInput').addEventListener('input', function (e) {
      state.panels[state.selected].role = e.target.value.toUpperCase().slice(0, 24);
      updateInfo();
      requestRender();
    });
    $('zoomRange').addEventListener('input', function (e) {
      state.panels[state.selected].zoom = Number(e.target.value) / 100;
      $('zoomVal').textContent = e.target.value + '%';
      requestRender();
    });
    $('rotRange').addEventListener('input', function (e) {
      state.panels[state.selected].rot = Number(e.target.value);
      $('rotVal').textContent = e.target.value + '°';
      requestRender();
    });
    $('resetPanelBtn').addEventListener('click', function () {
      var fresh = defaultPanels()[state.selected];
      state.panels[state.selected] = fresh;
      refreshPhotoPicker();
      requestRender();
    });
    $('swapBtn').addEventListener('click', function () {
      var n = Panels.panelCount(state.layout);
      var a = state.selected;
      var b = (a + 1) % n;
      var pa = state.panels[a];
      state.panels[a] = state.panels[b];
      state.panels[b] = pa;
      state.selected = b;
      refreshPhotoPicker();
      requestRender();
    });

    bindText('titleInput', 'title', function (v) { return v.toUpperCase().slice(0, 18); });
    $('titleStyle').addEventListener('change', function (e) { state.titleStyle = e.target.value; requestRender(); });
    bindRange('titleSizeRange', 'titleSize', 'titleSizeVal', function (v) { return v + '%'; });
    // Ranges give 70..130; state keeps the 0.7..1.3 factor.
    $('titleSizeRange').addEventListener('input', function (e) { state.titleSize = Number(e.target.value) / 100; });
    bindRange('titleYRange', 'titleY', 'titleYVal', function (v) { return v + '%'; });
    $('titleYRange').addEventListener('input', function (e) { state.titleY = Number(e.target.value) / 100; });
    bindRange('spacingRange', 'letterSpacing', 'spacingVal', function (v) { return v + '%'; });
    $('spacingRange').addEventListener('input', function (e) { state.letterSpacing = Number(e.target.value) / 100; });
    bindText('subtitleInput', 'subtitle');
    bindText('taglineInput', 'tagline');
    bindText('quoteInput', 'quote');
    bindText('quoteSourceInput', 'quoteSource');
    bindText('billingInput', 'billing');
    bindCheck('toggleQuote', 'showQuote');
    bindCheck('toggleBilling', 'showBilling');
    bindCheck('toggleBarcode', 'showBarcode');
    bindCheck('toggleSeal', 'showSeal');
    bindCheck('toggleLabels', 'showLabels');
    bindCheck('toggleGrain', 'grain');
    bindCheck('toggleHalftone', 'halftone');
    bindCheck('toggleVignette', 'vignette');
    $('statusSelect').addEventListener('change', function (e) { state.status = e.target.value; requestRender(); });

    document.querySelectorAll('.size-btn').forEach(function (b) {
      b.addEventListener('click', function () { setExportSize(Number(b.dataset.w), Number(b.dataset.h), b); });
    });
    $('exportBtn').addEventListener('click', function () {
      var btn = $('exportBtn');
      btn.disabled = true;
      $('exportInfo').textContent = 'Rendering ' + state.exportW + ' × ' + state.exportH + '…';
      window.SunsetExport.exportPNG(state.exportW, state.exportH).then(function () {
        $('exportInfo').textContent = 'Saved sunset-cover-' + state.exportW + 'x' + state.exportH + '.png';
        btn.disabled = false;
      }).catch(function (err) {
        $('exportInfo').textContent = 'Export failed: ' + err.message;
        btn.disabled = false;
      });
    });

    // Preview pointer: click selects a panel and sets its face focus;
    // drag pans the selected panel's photo.
    var dragging = false;
    var moved = 0;
    var lastX = 0;
    var lastY = 0;
    preview.addEventListener('pointerdown', function (e) {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      preview.setPointerCapture(e.pointerId);
    });
    preview.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 4) {
        var rect = preview.getBoundingClientRect();
        var panel = state.panels[state.selected];
        panel.panX = Math.max(-0.3, Math.min(0.3, panel.panX + dx / rect.width));
        panel.panY = Math.max(-0.3, Math.min(0.3, panel.panY + dy / rect.height));
        requestRender();
      }
    });
    preview.addEventListener('pointerup', function (e) {
      dragging = false;
      var rect = preview.getBoundingClientRect();
      var px = (e.clientX - rect.left) * (preview.width / rect.width);
      var py = (e.clientY - rect.top) * (preview.height / rect.height);
      var idx = Panels.panelAt(state.layout, preview.width, preview.height, px, py);
      if (idx < 0) return;
      state.selected = idx;
      if (moved <= 4) {
        // A click sets the face focus point inside that panel.
        var r = Panels.layoutRects(state.layout, preview.width, preview.height)[idx];
        var panel = state.panels[idx];
        panel.focus.x = Math.max(0.05, Math.min(0.95, (px - r.x) / r.w));
        panel.focus.y = Math.max(0.05, Math.min(0.95, (py - r.y) / r.h));
        panel.panX = 0;
        panel.panY = 0;
      }
      refreshPhotoPicker();
      requestRender();
    });
  }

  function boot() {
    preview = $('preview');
    buildPhotoGrid();
    buildChoiceLists();
    refreshPhotoPicker();
    bindAll();
    updateInfo();
    window.SunsetPhotos.loadAllPhotos(state).then(function () { return renderPreview(); });
  }

  window.SunsetCover = {
    state: state,
    renderPreview: renderPreview,
    requestRender: requestRender,
    setLayout: function (id) { state.layout = id; requestRender(); },
    setGrade: function (id) { state.grade = id; requestRender(); },
    exportDataURL: function (w, h) { return window.SunsetExport.exportDataURL(w, h); },
    exportPNG: function (w, h) { return window.SunsetExport.exportPNG(w, h); },
    defaultPanels: defaultPanels,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
