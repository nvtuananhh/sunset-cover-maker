// photos.js — photo uploads from the user's machine (FileReader, local only)
// and the thumbnail strip. Photos are never sent anywhere.

export function readPhotoFiles(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  return Promise.all(images.map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({ name: file.name, src: reader.result, img });
      img.onerror = () => reject(new Error(`Could not read ${file.name}`));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  })));
}

export function renderThumbs(container, photos, selectedIndex, onSelect) {
  container.innerHTML = '';
  photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.src = photo.src;
    thumb.alt = photo.name;
    thumb.classList.toggle('selected', i === selectedIndex);
    thumb.addEventListener('click', () => onSelect(i));
    container.appendChild(thumb);
  });
}
