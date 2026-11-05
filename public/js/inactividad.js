// Cierre de sesión por inactividad en las páginas protegidas.
// El servidor vence la sesión tras inactividadMs sin peticiones (rolling);
// este script lleva la misma cuenta en el navegador para avisar un minuto
// antes y llevar al login cuando vence.
(function () {
  'use strict';

  var AVISO_ANTES_MS = 60 * 1000;

  var inactividadMs   = null; // llega en la respuesta de /api/sesion
  var ultimaActividad = Date.now();
  var avisoEl         = null;
  var intervalo       = null;
  var fetchOriginal   = window.fetch.bind(window);

  function rutaDe(recurso) {
    var url = typeof recurso === 'string' ? recurso : (recurso && recurso.url) || '';
    return url.replace(window.location.origin, '');
  }

  // Cada petición exitosa al API renueva la sesión en el servidor,
  // así que también reinicia la cuenta aquí.
  window.fetch = function (recurso) {
    var ruta = rutaDe(recurso);
    return fetchOriginal.apply(null, arguments).then(function (r) {
      if (r.ok && ruta.indexOf('/api/') === 0) {
        marcarActividad();
        if (ruta.indexOf('/api/sesion') === 0) {
          r.clone().json().then(function (data) {
            if (data && data.inactividadMs) inactividadMs = data.inactividadMs;
          }).catch(function () {});
        }
      }
      return r;
    });
  };

  function marcarActividad() {
    ultimaActividad = Date.now();
    if (avisoEl) avisoEl.style.display = 'none';
  }

  function mostrarAviso(restanteMs) {
    if (!avisoEl) {
      avisoEl = document.createElement('div');
      avisoEl.className = 'aviso-inactividad';
      avisoEl.setAttribute('role', 'alert');
      avisoEl.innerHTML =
        '<span id="avisoInactividadTexto"></span>' +
        '<button type="button" class="btn btn-primary" id="btnSeguirConectado">Seguir conectado</button>';
      document.body.appendChild(avisoEl);
      document.getElementById('btnSeguirConectado').addEventListener('click', function () {
        fetch('/api/sesion');
      });
    }
    var segundos = Math.ceil(restanteMs / 1000);
    document.getElementById('avisoInactividadTexto').textContent =
      'Su sesión se cerrará en ' + segundos + ' s por inactividad.';
    avisoEl.style.display = 'flex';
  }

  function cerrarPorInactividad() {
    clearInterval(intervalo);
    fetchOriginal('/api/logout', { method: 'POST' })
      .catch(function () {})
      .then(function () { window.location.href = '/?inactividad=1'; });
  }

  // Se compara contra la hora real (no un setTimeout largo) porque el
  // celular pausa los temporizadores cuando la pantalla se apaga.
  function revisar() {
    if (!inactividadMs) return;
    var restante = inactividadMs - (Date.now() - ultimaActividad);
    if (restante <= 0) {
      cerrarPorInactividad();
    } else if (restante <= AVISO_ANTES_MS) {
      mostrarAviso(restante);
    }
  }

  intervalo = setInterval(revisar, 1000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) revisar();
  });
})();
