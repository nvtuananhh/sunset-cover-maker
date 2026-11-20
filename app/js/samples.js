// Built-in sample photos: fictional people photographed by an image model
// in this session (never a real person, never game artwork). Faces sit in
// the upper half so the chrome title can overlap the lower half.
export const SAMPLE_PHOTOS = [
  { id: 'hero-woman', label: 'Hero · curly hair', src: 'samples/hero-woman.jpg', focusX: 0.5, focusY: 0.32, role: 'THE CAPTAIN' },
  { id: 'boss-man', label: 'Boss · silver hair', src: 'samples/boss-man.jpg', focusX: 0.5, focusY: 0.3, role: 'THE BOSS' },
  { id: 'driver-woman', label: 'Driver · red car', src: 'samples/driver-woman.jpg', focusX: 0.5, focusY: 0.3, role: 'THE DRIVER' },
  { id: 'rider-man', label: 'Rider · neon dusk', src: 'samples/rider-man.jpg', focusX: 0.5, focusY: 0.3, role: 'THE LOOKOUT' },
  { id: 'marina', label: 'Marina · sunset', src: 'samples/marina.jpg', focusX: 0.5, focusY: 0.45, role: 'THE NAVIGATOR' },
  { id: 'beach-duo', label: 'Duo · beach', src: 'samples/beach-duo.jpg', focusX: 0.5, focusY: 0.32, role: 'THE FIXER' },
];

// Default panel-to-photo assignment for the Vice Poster layout: every panel
// gets a different photographic face, so the default cover is dense.
export const DEFAULT_CAST = ['driver-woman', 'boss-man', 'hero-woman', 'rider-man', 'marina'];
export const DEFAULT_ROLES = ['THE DRIVER', 'THE BOSS', 'THE CAPTAIN', 'THE LOOKOUT', 'THE NAVIGATOR', 'THE FIXER'];

/** Preload every sample image and return a map id -> HTMLImageElement. */
export function loadSampleImages() {
  const out = new Map();
  const jobs = SAMPLE_PHOTOS.map((p) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { out.set(p.id, img); resolve(img); };
    img.onerror = () => resolve(null);
    img.src = p.src;
  }));
  return Promise.all(jobs).then(() => out);
}
