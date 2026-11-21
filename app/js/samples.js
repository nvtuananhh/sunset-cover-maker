/* samples.js — the six built-in sample photos, made with an image model
   in this session (fictional people, never a real person, never game art).
   Faces sit in the upper half so the chrome title can overlap the lower half. */
(function () {
  'use strict';
  var SCM = window.SCM = window.SCM || {};

  SCM.SAMPLES = [
    { file: 'samples/hero-woman.jpg', name: 'Hero — curly hair, beach gold', role: 'THE CAPTAIN' },
    { file: 'samples/boss-man.jpg', name: 'Boss — silver hair, neon night', role: 'THE BOSS' },
    { file: 'samples/driver-woman.jpg', name: 'Driver — bob, red convertible', role: 'THE DRIVER' },
    { file: 'samples/rider-man.jpg', name: 'Rider — tank top, neon dusk', role: 'THE LOOKOUT' },
    { file: 'samples/marina.jpg', name: 'Marina — yachts at sunset', role: 'THE NAVIGATOR' },
    { file: 'samples/beach-duo.jpg', name: 'Beach duo — laughing couple', role: 'THE FIXER' }
  ];

  /* Register the samples as photos, in the fixed order above. */
  function registerSamples() {
    SCM.SAMPLES.forEach(function (s) {
      SCM.addPhoto(s.file.split('/').pop(), s.file, false);
    });
  }
  SCM.registerSamples = registerSamples;

  /* Default cast: which sample fills each panel of the default layout. */
  SCM.DEFAULT_CAST = ['hero-woman.jpg', 'boss-man.jpg', 'driver-woman.jpg', 'rider-man.jpg', 'marina.jpg', 'beach-duo.jpg', 'hero-woman.jpg'];
})();
