// app/js/samples.js — the two built-in sample photos, so the app works with
// zero uploads. Both are original sunset scenes drawn in code by
// tools/make-samples.mjs (gradient sky, skyline, palms, a person silhouette:
// no real-person photo, no game art).
import { loadPhotoUrl } from './photos.js';

export const SAMPLE_PHOTOS = [
  { src: 'samples/boulevard.png', name: 'Boulevard Sunset', label: 'Boulevard — person on a sunset street' },
  { src: 'samples/pier.png', name: 'Pier Dusk', label: 'Pier — angler at dusk' },
];

/** Load both sample photos as photo records. */
export async function loadSamplePhotos() {
  const photos = [];
  for (const sample of SAMPLE_PHOTOS) {
    try {
      photos.push(await loadPhotoUrl(sample.src, sample.name));
    } catch (err) {
      console.warn('[samples]', err.message);
    }
  }
  return photos;
}
