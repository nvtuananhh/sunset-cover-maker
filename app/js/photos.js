// Photo library: built-in samples plus user uploads. Uploads are read with
// FileReader on the user's own machine and never leave it.
import { SAMPLE_PHOTOS } from './samples.js';

export const photoLibrary = [];
let uploadCounter = 0;

/** Fill the library with the built-in samples (src paths, loaded lazily). */
export function seedLibrary() {
  photoLibrary.length = 0;
  for (const p of SAMPLE_PHOTOS) {
    photoLibrary.push({ id: p.id, label: p.label, src: p.src, focusX: p.focusX, focusY: p.focusY, role: p.role, uploaded: false, img: null });
  }
  return photoLibrary;
}

/** Load the image element for one library entry (cached on the entry). */
export function loadPhotoImage(entry) {
  if (entry.img) return Promise.resolve(entry.img);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { entry.img = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = entry.src;
  });
}

/** Read uploaded files into the library as data: URIs; returns added entries. */
export function addUploads(fileList) {
  const files = Array.from(fileList || []).filter((f) => f.type && f.type.indexOf('image/') === 0);
  const jobs = files.map((file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      uploadCounter += 1;
      const entry = { id: 'upload-' + uploadCounter, label: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Upload', src: String(reader.result), focusX: 0.5, focusY: 0.35, role: 'THE CREW', uploaded: true, img: null };
      photoLibrary.push(entry);
      resolve(entry);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  }));
  return Promise.all(jobs).then((list) => list.filter(Boolean));
}

/** Remove an uploaded entry from the library (samples cannot be removed). */
export function removeUpload(entryId) {
  const i = photoLibrary.findIndex((p) => p.id === entryId && p.uploaded);
  if (i >= 0) photoLibrary.splice(i, 1);
  return i >= 0;
}

/** Find a library entry by id. */
export function findPhoto(photoId) {
  return photoLibrary.find((p) => p.id === photoId) || null;
}
