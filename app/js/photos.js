// photos.js — photo loading, caching, and uploads (local only, FileReader).
// No network: every photo is a file under app/ or a data: URI from the
// user's own machine. No wall-clock or randomness in this file.
(function () {
  'use strict';

  var cache = new Map();

  /** Load an image by URL or data: URI; cached, so repeat renders reuse it. */
  function loadImage(src) {
    if (cache.has(src)) return cache.get(src);
    var p = new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('cannot load photo: ' + src.slice(0, 80))); };
      img.src = src;
    });
    cache.set(src, p);
    return p;
  }

  /** Load every photo the current state references, in fixed order. */
  function loadAllPhotos(state) {
    var srcs = [];
    var seen = new Set();
    state.panels.forEach(function (panel) {
      if (panel.photo && !seen.has(panel.photo)) { seen.add(panel.photo); srcs.push(panel.photo); }
    });
    return Promise.all(srcs.map(loadImage)).then(function () { return true; });
  }

  /** Read user-picked files as data: URIs, in the order the picker gave them. */
  function readUploads(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    var images = files.filter(function (f) { return f.type.indexOf('image/') === 0; });
    return Promise.all(images.map(function (file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve({ id: 'up-' + file.name, src: String(reader.result), label: file.name.replace(/\.[^.]+$/, '').slice(0, 20) || 'Upload' }); };
        reader.onerror = function () { reject(new Error('cannot read ' + file.name)); };
        reader.readAsDataURL(file);
      });
    }));
  }

  window.SunsetPhotos = { loadImage: loadImage, loadAllPhotos: loadAllPhotos, readUploads: readUploads };
})();
