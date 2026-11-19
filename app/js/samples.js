// samples.js — the two built-in sample photos (code-drawn originals, generated
// by tools/make-samples.mjs). Loads them as images so the app works with zero
// uploads and so screenshots have a deterministic scene.
(function () {
  'use strict';

  var SAMPLE_DEFS = [
    { name: 'boulevard', label: 'Boulevard sunset', src: 'samples/boulevard.png' },
    { name: 'pier', label: 'Pier at dusk', src: 'samples/pier.png' },
  ];

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('cannot load ' + src)); };
      img.src = src;
    });
  }

  // Loads every sample photo. Resolves to [{img, label, name}] in definition
  // order. A failed sample is skipped, never fatal.
  function loadSamples() {
    return Promise.all(SAMPLE_DEFS.map(function (def) {
      return loadImage(def.src).then(function (img) {
        return { img: img, label: def.label, name: def.name, sample: true };
      }).catch(function () { return null; });
    })).then(function (loaded) {
      return loaded.filter(function (p) { return p !== null; });
    });
  }

  window.SCM = window.SCM || {};
  window.SCM.loadSamples = loadSamples;
  window.SCM.sampleDefs = SAMPLE_DEFS;
})();
