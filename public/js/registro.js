(function () {
  'use strict';

  var fotoBase64     = null;
  var bdSeleccionada = null;

  async function verificarSesion() {
    try {
      var r = await fetch('/api/sesion');
      if (!r.ok) { window.location.href = '/'; return false; }
      return true;
    } catch {
      window.location.href = '/';
      return false;
    }
  }

  // Comprime la imagen en el cliente antes de enviarla al servidor
  function comprimirImagen(file, maxWidth, calidad) {
    maxWidth = maxWidth || 1280;
    calidad  = calidad  || 0.82;

    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onerror = function () { reject(new Error('No se pudo leer el archivo')); };

      reader.onload = function (e) {
        var img = new Image();

        img.onerror = function () { reject(new Error('No se pudo cargar la imagen')); };

        img.onload = function () {
          var w = img.width;
          var h = img.height;

          if (w > maxWidth) {
            h = Math.round((maxWidth / w) * h);
            w = maxWidth;
          }

          var canvas = document.createElement('canvas');
          canvas.width  = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', calidad));
        };

        img.src = e.target.result;
      };

      reader.readAsDataURL(file);
    });
  }

  function mostrarMensaje(tipo, msg) {
    var el = document.getElementById('alertRegistro');
    el.textContent = msg;
    el.className = 'alert alert-' + tipo + ' show';
  }

  function ocultarMensaje() {
    document.getElementById('alertRegistro').className = 'alert';
  }

  async function init() {
    var ok = await verificarSesion();
    if (!ok) return;

    // Recuperar la BD seleccionada desde sessionStorage
    var bdStr = sessionStorage.getItem('bdSeleccionada');
    if (!bdStr) {
      window.location.href = '/seleccionar-bd.html';
      return;
    }

    bdSeleccionada = JSON.parse(bdStr);
    var nombreMostrar = bdSeleccionada.nombre;
    if (bdSeleccionada.compania) nombreMostrar += ' — ' + bdSeleccionada.compania;
    document.getElementById('nombreBD').textContent = nombreMostrar;

    // Botón volver
    document.getElementById('btnVolver').addEventListener('click', function () {
      window.location.href = '/seleccionar-bd.html';
    });

    // Cuando el operador selecciona / toma una foto
    var fotoInput = document.getElementById('fotoInput');
    fotoInput.addEventListener('change', async function () {
      var file = this.files[0];
      if (!file) return;

      ocultarMensaje();
      mostrarMensaje('info', 'Procesando imagen...');

      try {
        fotoBase64 = await comprimirImagen(file);

        document.getElementById('previewImg').src = fotoBase64;
        document.getElementById('previewContainer').classList.add('show');
        document.getElementById('photoArea').style.display = 'none';
        document.getElementById('btnRegistrar').disabled = false;
        ocultarMensaje();

      } catch (err) {
        fotoBase64 = null;
        mostrarMensaje('danger', 'Error al procesar la imagen. Intente nuevamente.');
      }
    });

    // Botón cambiar foto
    document.getElementById('btnCambiarFoto').addEventListener('click', function () {
      fotoBase64 = null;
      fotoInput.value = '';
      document.getElementById('previewContainer').classList.remove('show');
      document.getElementById('photoArea').style.display = 'flex';
      document.getElementById('btnRegistrar').disabled = true;
      ocultarMensaje();
    });

    // Botón registrar asistencia
    document.getElementById('btnRegistrar').addEventListener('click', async function () {
      if (!fotoBase64) {
        mostrarMensaje('danger', 'Debe capturar una foto antes de registrar.');
        return;
      }

      var btn = document.getElementById('btnRegistrar');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Guardando...';
      ocultarMensaje();

      try {
        var r = await fetch('/api/registro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idBaseDatos: bdSeleccionada.id,
            fotoBase64:  fotoBase64,
            novedad:     document.getElementById('novedadInput').value.trim() || null
          })
        });

        var data = await r.json();

        if (!r.ok) {
          mostrarMensaje('danger', data.error || 'Error al registrar asistencia.');
          btn.disabled = false;
          btn.innerHTML = '✅ Registrar Asistencia';
          return;
        }

        mostrarMensaje('success', '✅ Asistencia registrada correctamente. Redirigiendo...');
        btn.innerHTML = '✅ Registrado';

        // Limpiar y regresar tras 2 segundos
        setTimeout(function () {
          sessionStorage.removeItem('bdSeleccionada');
          window.location.href = '/seleccionar-bd.html';
        }, 2000);

      } catch (err) {
        mostrarMensaje('danger', 'Error de conexión. Verifique su red e intente nuevamente.');
        btn.disabled = false;
        btn.innerHTML = '✅ Registrar Asistencia';
      }
    });
  }

  init();
})();
