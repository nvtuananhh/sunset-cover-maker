/* editor.js — app boot + state + UI wiring + live preview.
   State is plain data; every control updates it and re-renders.
   Exposes window.SunsetCover for headless playtests:
   { state, images, render, exportPNG, ready }. */
(function () {
  'use strict';
  var SCM = window.SCM = window.SCM || {};

  var state = {
    layout: 'vice',
    grade: 'vice',
    grain: true,
    halftone: false,
    caption: SCM.defaultCaption(),
    panels: SCM.defaultPanels('vice'),
    selectedPanel: 0,
    exportSize: 'wide'
  };
  SCM.state = state;

  var images = {}; /* photoFile -> HTMLImageElement */
  var preview = null, previewCtx = null;
  var renderQueued = false;

  function photoForPanel(panel) {
    if (panel.photoId) { var p = SCM.photoById(panel.photoId); return p || null; }
    for (var i = 0; i < SCM.photos.length; i++) {
      if (SCM.photos[i].name === panel.photoFile) return SCM.photos[i];
    }
    return null;
  }

  function loadImages() {
    var jobs = SCM.photos.map(function (photo) {
      return SCM.loadPhoto(photo).then(function (img) { images[photo.name] = img; images[photo.id] = img; });
    });
    return Promise.all(jobs);
  }

  function render() {
    if (!previewCtx) return;
    var W = preview.width, H = preview.height;
    previewCtx.clearRect(0, 0, W, H);
    SCM.drawPoster(previewCtx, W, H, state, images);
    updateTopMeta();
  }
  SCM.render = render;

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () { renderQueued = false; render(); });
  }

  function updateTopMeta() {
    var el = document.getElementById('topMeta');
    if (!el) return;
    var size = SCM.sizeById(state.exportSize);
    el.textContent = size.w + ' × ' + size.h + ' · ' + SCM.layoutById(state.layout).name + ' · ' + SCM.gradeById(state.grade).name;
    var steps = document.querySelectorAll('.step');
    steps.forEach(function (s, i) { s.classList.toggle('on', i === 0 || state.panels.some(function (p) { return p.photoFile; })); });
  }

  /* ---- left column: photo thumbnails ---- */
  function buildThumbs() {
    var grid = document.getElementById('photoThumbs');
    grid.innerHTML = '';
    SCM.photos.forEach(function (photo) {
      var img = document.createElement('img');
      img.src = photo.src;
      img.alt = photo.name;
      img.title = photo.name;
      if (photo.uploaded) img.className = 'up';
      if (SCM.selectedPhotoId === photo.id) img.classList.add('sel');
      img.addEventListener('click', function () {
        SCM.selectedPhotoId = photo.id;
        var panel = state.panels[state.selectedPanel];
        panel.photoId = photo.id;
        panel.photoFile = photo.name;
        loadImages().then(function () { buildThumbs(); queueRender(); });
      });
      grid.appendChild(img);
    });
  }
  SCM.buildThumbs = buildThumbs;

  /* ---- left column: layout + grade buttons ---- */
  function buildButtons() {
    var lb = document.getElementById('layoutBtns');
    lb.innerHTML = '';
    SCM.LAYOUTS.forEach(function (l) {
      var b = document.createElement('button');
      b.textContent = l.name;
      b.className = state.layout === l.id ? 'on' : '';
      b.addEventListener('click', function () { setLayout(l.id); });
      lb.appendChild(b);
    });
    var gb = document.getElementById('gradeBtns');
    gb.innerHTML = '';
    SCM.GRADES.forEach(function (g) {
      var b = document.createElement('button');
      b.textContent = g.name;
      b.className = state.grade === g.id ? 'on' : '';
      b.addEventListener('click', function () { state.grade = g.id; buildButtons(); queueRender(); });
      gb.appendChild(b);
    });
  }

  function setLayout(id) {
    var old = state.panels;
    state.layout = id;
    var next = SCM.defaultPanels(id);
    next.forEach(function (p, i) {
      if (old[i]) { p.photoId = old[i].photoId; p.photoFile = old[i].photoFile; p.focusX = old[i].focusX; p.focusY = old[i].focusY; p.zoom = old[i].zoom; p.rotate = old[i].rotate; }
    });
    state.panels = next;
    state.selectedPanel = 0;
    buildButtons(); buildPanelEditor(); queueRender();
  }
  SCM.setLayout = setLayout;

  /* ---- left column: per-panel editor (crop, focus, role, callout) ---- */
  function buildPanelEditor() {
    var box = document.getElementById('panelEditor');
    box.innerHTML = '';
    state.panels.forEach(function (panel, i) {
      var div = document.createElement('div');
      div.className = 'panel-mini' + (state.selectedPanel === i ? ' sel' : '');
      var head = document.createElement('div');
      head.className = 'pm-head';
      head.innerHTML = '<span>Panel ' + (i + 1) + (panel.hero ? ' · HERO' : '') + '</span><span>' + (photoForPanel(panel) ? photoForPanel(panel).name : '—') + '</span>';
      head.addEventListener('click', function () { state.selectedPanel = i; buildPanelEditor(); queueRender(); });
      div.appendChild(head);
      div.appendChild(labeledText('Role tag', panel.role, function (v) { panel.role = v; queueRender(); }));
      div.appendChild(labeledText('Callout', panel.callout, function (v) { panel.callout = v; queueRender(); }));
      div.appendChild(slider('Zoom', 1, 2.5, 0.05, panel.zoom, function (v) { panel.zoom = v; queueRender(); }));
      div.appendChild(slider('Rotate', -15, 15, 1, panel.rotate, function (v) { panel.rotate = v; queueRender(); }));
      div.appendChild(slider('Focus X', 0.05, 0.95, 0.01, panel.focusX, function (v) { panel.focusX = v; queueRender(); }));
      div.appendChild(slider('Focus Y', 0.05, 0.95, 0.01, panel.focusY, function (v) { panel.focusY = v; queueRender(); }));
      box.appendChild(div);
    });
  }
  SCM.buildPanelEditor = buildPanelEditor;

  function labeledText(label, value, onInput) {
    var wrap = document.createElement('label');
    wrap.textContent = label;
    var input = document.createElement('input');
    input.type = 'text'; input.value = value || '';
    input.addEventListener('input', function () { onInput(input.value); });
    wrap.appendChild(input);
    return wrap;
  }

  function slider(label, min, max, step, value, onInput) {
    var row = document.createElement('div');
    row.className = 'slider-row';
    var span = document.createElement('span');
    span.textContent = label;
    var input = document.createElement('input');
    input.type = 'range'; input.min = String(min); input.max = String(max);
    input.step = String(step); input.value = String(value);
    var b = document.createElement('b');
    b.textContent = String(value);
    input.addEventListener('input', function () { b.textContent = input.value; onInput(parseFloat(input.value)); });
    row.appendChild(span); row.appendChild(input); row.appendChild(b);
    return row;
  }

  /* ---- right column: caption inputs ---- */
  function bindCaption() {
    var c = state.caption;
    var bind = function (id, key) {
      var el = document.getElementById(id);
      el.addEventListener('input', function () { c[key] = el.value; queueRender(); });
    };
    bind('inTitle', 'title'); bind('inSubtitle', 'subtitle'); bind('inTagline', 'tagline');
    bind('inQuote', 'quote'); bind('inQuoteSrc', 'quoteSource'); bind('inBilling', 'billing');
    bind('inVolume', 'volume'); bind('inSeason', 'season');
    document.getElementById('inTitleStyle').addEventListener('change', function (e) { c.titleStyle = e.target.value; queueRender(); });
    document.getElementById('inStatus').addEventListener('change', function (e) { c.status = e.target.value; queueRender(); });
    var num = function (id, key, fmt) {
      var el = document.getElementById(id);
      el.addEventListener('input', function () {
        c[key] = parseFloat(el.value);
        var val = document.getElementById(id.replace('in', '') + 'Val');
        if (val) val.textContent = fmt ? fmt(el.value) : el.value;
        queueRender();
      });
    };
    num('inTitleSize', 'titleSize');
    num('inSpacing', 'letterSpacing');
    document.getElementById('inTitleY').addEventListener('input', function (e) {
      c.titleY = parseFloat(e.target.value) / 100;
      document.getElementById('titleYVal').textContent = e.target.value + '%';
      queueRender();
    });
    var chk = function (id, key) {
      document.getElementById(id).addEventListener('change', function (e) { c[key] = e.target.checked; queueRender(); });
    };
    chk('chkSeal', 'showSeal'); chk('chkBarcode', 'showBarcode'); chk('chkQuote', 'showQuote');
    document.getElementById('grainChk').addEventListener('change', function (e) { state.grain = e.target.checked; queueRender(); });
    document.getElementById('halftoneChk').addEventListener('change', function (e) { state.halftone = e.target.checked; queueRender(); });
  }

  /* ---- centre: size picker + export buttons ---- */
  function buildSizes() {
    var row = document.getElementById('sizeRow');
    row.innerHTML = '';
    SCM.EXPORT_SIZES.forEach(function (s) {
      var b = document.createElement('button');
      b.textContent = s.label;
      b.className = state.exportSize === s.id ? 'on' : '';
      b.addEventListener('click', function () {
        state.exportSize = s.id;
        preview.width = s.w; preview.height = s.h;
        buildSizes(); queueRender();
      });
      row.appendChild(b);
    });
    var ex = document.getElementById('exportBtns');
    ex.innerHTML = '';
    SCM.EXPORT_SIZES.forEach(function (s) {
      var b = document.createElement('button');
      b.textContent = 'Export PNG · ' + s.label;
      b.addEventListener('click', function () {
        SCM.exportPNG(state, images, s.id).then(function (r) {
          var hint = document.getElementById('lastExport');
          if (r) hint.textContent = 'Saved sunset-cover-' + r.size.w + 'x' + r.size.h + '.png (' + r.bytes + ' bytes).';
        });
      });
      ex.appendChild(b);
    });
  }

  /* ---- preview interaction: drag pans, shift-click sets focus ---- */
  function bindPreview() {
    var dragging = false, lastX = 0, lastY = 0;
    function panelAt(mx, my) {
      var rect = preview.getBoundingClientRect();
      var px = (mx - rect.left) * (preview.width / rect.width);
      var py = (my - rect.top) * (preview.height / rect.height);
      var area = { x: preview.width * 0.016, y: preview.width * 0.016, w: preview.width * 0.968, h: preview.height - preview.width * 0.032 };
      var rects = SCM.panelRects(state.layout, area);
      for (var i = rects.length - 1; i >= 0; i--) {
        var r = rects[i];
        if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return { index: i, rect: r, px: px, py: py };
      }
      return null;
    }
    preview.addEventListener('mousedown', function (e) {
      var hit = panelAt(e.clientX, e.clientY);
      if (!hit) return;
      state.selectedPanel = hit.index;
      buildPanelEditor();
      if (e.shiftKey) {
        var panel = state.panels[hit.index];
        panel.focusX = (hit.px - hit.rect.x) / hit.rect.w;
        panel.focusY = (hit.py - hit.rect.y) / hit.rect.h;
        buildPanelEditor(); queueRender();
        return;
      }
      dragging = true; lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var panel = state.panels[state.selectedPanel];
      var rect = preview.getBoundingClientRect();
      var dx = (e.clientX - lastX) * (preview.width / rect.width);
      var dy = (e.clientY - lastY) * (preview.height / rect.height);
      panel.focusX = Math.min(0.95, Math.max(0.05, panel.focusX - dx / preview.width * 2));
      panel.focusY = Math.min(0.95, Math.max(0.05, panel.focusY - dy / preview.height * 2));
      lastX = e.clientX; lastY = e.clientY;
      queueRender();
    });
    window.addEventListener('mouseup', function () { dragging = false; });
  }

  /* Deep-linkable state for playtests and screenshots:
     ?layout=cast6&grade=neon&size=portrait&export=1920x1080 shows the
     export full-bleed so a headless screenshot captures the PNG itself. */
  function applyQuery() {
    var q = new URLSearchParams(window.location.search);
    if (q.get('layout')) setLayout(q.get('layout'));
    if (q.get('grade')) { state.grade = q.get('grade'); buildButtons(); }
    if (q.get('size')) {
      var s = SCM.sizeById(q.get('size'));
      state.exportSize = s.id;
      preview.width = s.w; preview.height = s.h;
    }
    return q;
  }

  function boot() {
    preview = document.getElementById('preview');
    previewCtx = preview.getContext('2d');
    SCM.registerSamples();
    SCM.selectedPhotoId = SCM.photos.length ? SCM.photos[0].id : null;
    document.getElementById('uploadInput').addEventListener('change', function (e) {
      SCM.handleUploadFiles(e.target.files).then(function () { loadImages().then(function () { buildThumbs(); queueRender(); }); });
    });
    buildThumbs(); buildButtons(); buildPanelEditor(); bindCaption(); buildSizes(); bindPreview();
    var q = applyQuery();
    loadImages().then(function () {
      render();
      window.SunsetCover = { state: state, images: images, render: render, exportPNG: SCM.exportPNG, ready: true };
      var exp = q.get('export');
      if (exp) {
        var parts = exp.split('x');
        var size = { w: parseInt(parts[0], 10), h: parseInt(parts[1], 10) };
        var canvas = SCM.renderExport(state, images, size);
        document.body.innerHTML = '';
        var img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.style.cssText = 'display:block;width:' + size.w + 'px;height:' + size.h + 'px;margin:0;';
        document.body.appendChild(img);
        document.body.style.margin = '0';
        document.title = 'export ' + size.w + 'x' + size.h;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
