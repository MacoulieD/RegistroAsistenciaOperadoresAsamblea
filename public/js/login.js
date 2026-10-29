(function () {
  'use strict';

  // Si ya existe una sesión activa, ir a la selección de asamblea
  // (operadores y administradores registran asistencia primero)
  fetch('/api/sesion')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.autenticado) {
        sessionStorage.setItem('esAdmin', data.esAdmin ? 'true' : 'false');
        window.location.href = '/seleccionar-bd.html';
      }
    })
    .catch(function () {
      // Si no hay sesión activa, el usuario ve el formulario de login
    });

  var form      = document.getElementById('formLogin');
  var btnLogin  = document.getElementById('btnLogin');
  var alertEl   = document.getElementById('alertLogin');

  // Muestra un mensaje de error en el área del login
  function mostrarError(msg) {
    alertEl.textContent = msg;
    alertEl.className = 'alert alert-danger show';
  }

  // Oculta el mensaje de error
  function ocultarError() {
    alertEl.className = 'alert';
  }

  // Controlador de envío del formulario de login
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    ocultarError();

    var codigo = document.getElementById('codigo').value.trim();
    var clave  = document.getElementById('clave').value;
    var captchaToken = window.grecaptcha ? grecaptcha.getResponse() : '';

    if (!codigo || !clave) {
      mostrarError('Por favor complete todos los campos.');
      return;
    }

    if (!captchaToken) {
      mostrarError('Por favor complete el reCAPTCHA.');
      return;
    }

    btnLogin.disabled = true;
    btnLogin.innerHTML = '<span class="spinner"></span> Verificando...';

    try {
      var response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigo, clave: clave, captchaToken: captchaToken })
      });

      var data = await response.json();

      if (!response.ok) {
        if (typeof grecaptcha !== 'undefined') {
          grecaptcha.reset();
        }
        mostrarError(data.error || 'Error al iniciar sesión.');
        return;
      }

      // Si el login fue exitoso, guardamos si es admin y vamos a la selección
      // de asamblea; el admin entra al panel desde el botón de esa pantalla
      sessionStorage.setItem('esAdmin', data.esAdmin ? 'true' : 'false');
      window.location.href = '/seleccionar-bd.html';

    } catch (err) {
      mostrarError('Error de conexión. Verifique su red e intente nuevamente.');
    } finally {
      btnLogin.disabled = false;
      btnLogin.innerHTML = 'Ingresar';
    }
  });
})();
