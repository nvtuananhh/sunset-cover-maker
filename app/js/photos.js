/* photos.js — user photo uploads (FileReader, local only) + the photo store.
   Photos are read on the user's machine and never uploaded anywhere. */
(function () {
  'use strict';
  var SCM = window.SCM = window.SCM || {};

  /* Every photo the app can place: { id, name, src, img, uploaded }.
     `img` is filled lazily by loadPhoto so the preview never blocks. */
  SCM.photos = [];
  SCM.selectedPhotoId = null;

  function loadPhoto(photo) {
    if (photo.img) return Promise.resolve(photo.img);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { photo.img = img; resolve(img); };
      img.onerror = function () { reject(new Error('could not load photo ' + photo.name)); };
      img.src = photo.src;
    });
  }
  SCM.loadPhoto = loadPhoto;

  function loadAllPhotos() {
    return Promise.all(SCM.photos.map(loadPhoto));
  }
  SCM.loadAllPhotos = loadAllPhotos;

  function addPhoto(name, src, uploaded) {
    var photo = { id: 'p' + SCM.photos.length + '-' + name.replace(/[^a-z0-9]+/gi, ''), name: name, src: src, img: null, uploaded: !!uploaded };
    SCM.photos.push(photo);
    return photo;
  }
  SCM.addPhoto = addPhoto;

  function photoById(id) {
    for (var i = 0; i < SCM.photos.length; i++) if (SCM.photos[i].id === id) return SCM.photos[i];
    return null;
  }
  SCM.photoById = photoById;

  /* Read user files with FileReader; each becomes a data: URI photo. */
  function handleUploadFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    files = files.filter(function (f) { return f.type && f.type.indexOf('image/') === 0; });
    if (!files.length) return Promise.resolve([]);
    var added = [];
    var chain = Promise.resolve();
    files.forEach(function (file) {
      chain = chain.then(function () {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () {
            var photo = addPhoto(file.name, String(reader.result), true);
            added.push(photo);
            resolve();
          };
          reader.onerror = function () { resolve(); };
          reader.readAsDataURL(file);
        });
      });
    });
    return chain.then(function () {
      if (added.length) SCM.selectedPhotoId = added[0].id;
      return added;
    });
  }
  SCM.handleUploadFiles = handleUploadFiles;
})();
