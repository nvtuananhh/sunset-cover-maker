// samples.js — the built-in sample photos, made in-session with an image
// model (fictional people, never a real person, never game artwork).
// Portrait-friendly: faces sit in the upper half so the chrome title can
// overlap the lower half of the cover.
(function () {
  'use strict';

  var SAMPLES = [
    { id: 'hero', src: 'samples/hero-woman.jpg', label: 'Hero — Beach', role: 'THE CAPTAIN' },
    { id: 'boss', src: 'samples/boss-man.jpg', label: 'Boss — Skyline', role: 'THE BOSS' },
    { id: 'driver', src: 'samples/driver-woman.jpg', label: 'Driver — Convertible', role: 'THE DRIVER' },
    { id: 'rider', src: 'samples/rider-man.jpg', label: 'Lookout — Rider', role: 'THE LOOKOUT' },
    { id: 'marina', src: 'samples/marina.jpg', label: 'Marina — Sunset', role: 'THE NAVIGATOR' },
    { id: 'duo', src: 'samples/beach-duo.jpg', label: 'Duo — Beach', role: 'THE FIXER' },
  ];

  /** Default cast: the six samples dealt across the six panel slots. */
  function defaultCast() {
    return SAMPLES.map(function (s) { return s.src; });
  }

  window.SunsetSamples = { SAMPLES: SAMPLES, defaultCast: defaultCast };
})();
