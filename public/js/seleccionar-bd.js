(function () {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  async function verificarSesion() {
    try {
      var r = await fetch('/api/sesion');
      if (!r.ok) { window.location.href = '/'; return null; }
      return await r.json();
    } catch {
      window.location.href = '/';
      return null;
    }
  }

  async function cargarBases() {
    try {
      var r = await fetch('/api/bases-datos');
      if (r.status === 401) { window.location.href = '/'; return null; }
      if (!r.ok) throw new Error();
      return await r.json();
    } catch {
      return null;
    }
  }

  function renderizarBases(bases) {
    var loadingEl = document.getElementById('loadingBases');
    var listaEl   = document.getElementById('listaBases');
    var sinEl     = document.getElementById('sinBases');
    var errorEl   = document.getElementById('errorBases');

    loadingEl.style.display = 'none';

    if (bases === null) {
      errorEl.textContent = 'Error al cargar las asambleas. Recargue la página.';
      errorEl.className = 'alert alert-danger show';
      return;
    }

    if (bases.length === 0) {
      sinEl.style.display = 'block';
      return;
    }

    listaEl.style.display = 'grid';

    bases.forEach(function (bd) {
      var card = document.createElement('div');
      card.className = 'db-card';
      card.innerHTML =
        '<div class="db-icon">🏛️</div>' +
        '<div class="db-info">' +
          '<h3>' + escapeHtml(bd.NombreBD) + '</h3>' +
          '<p>' + escapeHtml(bd.TituloCompania || bd.NitEmpresa || '') + '</p>' +
        '</div>' +
        '<span class="db-arrow">›</span>';

      card.addEventListener('click', function () {
        sessionStorage.setItem('bdSeleccionada', JSON.stringify({
          id:      bd.Id,
          nombre:  bd.NombreBD,
          compania: bd.TituloCompania || ''
        }));
        window.location.href = '/registro.html';
      });

      listaEl.appendChild(card);
    });
  }

  async function init() {
    var sesion = await verificarSesion();
    if (!sesion) return;

    // Mostrar datos del operador
    document.getElementById('nombreOperador').textContent = sesion.nombre;
    document.getElementById('headerSubtitle').textContent = 'Código: ' + sesion.codigo;

    // Mostrar botón de administración solo si el usuario es admin.
    // Se toma de la sesión del servidor (no solo de sessionStorage, que se
    // pierde al abrir otra pestaña) y se guarda para el panel.
    var esAdmin = sesion.esAdmin === true;
    sessionStorage.setItem('esAdmin', esAdmin ? 'true' : 'false');
    if (esAdmin) {
      document.getElementById('btnAdmin').style.display = 'inline-flex';
    }

    // Botón de salir
    document.getElementById('btnLogout').addEventListener('click', async function () {
      try {
        await fetch('/api/logout', { method: 'POST' });
      } finally {
        sessionStorage.clear();
        window.location.href = '/';
      }
    });

    // Cargar y mostrar bases de datos
    var bases = await cargarBases();
    renderizarBases(bases);
  }

  init();
})();
