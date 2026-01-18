
    function updatePreview(url) {
      const modalImg = document.getElementById('fullResImage');
      modalImg.src = url;
    }

    // Opcional: Limpiar la imagen al cerrar para que la siguiente carga sea limpia
    const myModalEl = document.getElementById('previewModal');
    if (myModalEl) {
      myModalEl.addEventListener('hidden.bs.modal', function () {
        document.getElementById('fullResImage').src = '';
      });
    }
