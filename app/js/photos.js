// app/js/photos.js — photos from the user's machine, read locally only.
// Files are read with FileReader into data URLs and decoded into Images;
// nothing is ever uploaded anywhere.
let nextId = 1;

/** Load one File into a photo record {id, name, img, src}. */
export function loadPhotoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        resolve({ id: `photo-${nextId++}`, name: file.name, img, src: String(reader.result) });
      };
      img.onerror = () => reject(new Error(`Could not decode ${file.name}`));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Load an image from a local app URL (used for the built-in samples). */
export function loadPhotoUrl(url, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ id: `photo-${nextId++}`, name, img, src: url });
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

/** Load several files, skipping the ones that fail, in file order. */
export async function loadPhotoFiles(files) {
  const loaded = [];
  for (const file of files) {
    try {
      loaded.push(await loadPhotoFile(file));
    } catch (err) {
      console.warn('[photos]', err.message);
    }
  }
  return loaded;
}
