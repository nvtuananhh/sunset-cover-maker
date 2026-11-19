// samples.js — the two built-in sample photos, drawn in-session by
// tools/make-samples.mjs (original sunset cityscapes, no real-person photo).
// Loading them needs no upload, so the app works with zero user photos.

export const SAMPLE_PHOTOS = [
  { name: 'Boulevard — sunset skyline', src: 'samples/boulevard.png' },
  { name: 'Pier — neon dusk', src: 'samples/pier.png' },
];

export function loadSamplePhotos() {
  return Promise.all(SAMPLE_PHOTOS.map((s) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ name: s.name, src: s.src, img });
    img.onerror = () => reject(new Error(`Could not load ${s.src}`));
    img.src = s.src;
  })));
}
