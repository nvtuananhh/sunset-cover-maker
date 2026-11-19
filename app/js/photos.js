// photos.js — reading the user's own photos from their machine (FileReader,
// local only: nothing is uploaded anywhere) and turning them into images the
// cover renderer can draw.
(function () {
  'use strict';

  function loadImageFromDataUrl(dataUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('unreadable image')); };
      img.src = dataUrl;
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('cannot read ' + file.name)); };
      reader.readAsDataURL(file);
    });
  }

  // Reads each File into {img, label, sample:false}. Files that are not
  // images, or that fail to decode, are skipped and reported via onSkip.
  function readPhotoFiles(files, onSkip) {
    var list = Array.prototype.slice.call(files || []);
    return Promise.all(list.map(function (file) {
      if (!/^image\//.test(file.type || '')) {
        if (onSkip) onSkip(file.name, 'not an image');
        return null;
      }
      return readFileAsDataUrl(file)
        .then(loadImageFromDataUrl)
        .then(function (img) { return { img: img, label: file.name, sample: false }; })
        .catch(function () {
          if (onSkip) onSkip(file.name, 'could not be decoded');
          return null;
        });
    })).then(function (photos) {
      return photos.filter(function (p) { return p !== null; });
    });
  }

  window.SCM = window.SCM || {};
  window.SCM.readPhotoFiles = readPhotoFiles;
  window.SCM.loadImageFromDataUrl = loadImageFromDataUrl;
})();
