(function () {
  'use strict';

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

  function verificarPermisoAdmin() {
    var esAdmin = sessionStorage.getItem('esAdmin') === 'true';
    if (!esAdmin) {
      document.body.innerHTML = '<div class="container" style="text-align: center; padding: 4rem;"><div class="card"><p style="font-size: 1.1rem; color: #d32f2f;">Acceso denegado: No tiene permisos de administrador.</p><a href="/seleccionar-bd.html" class="btn btn-primary" style="margin-top: 1rem;">Volver</a></div></div>';
      return false;
    }
    return true;
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  function formatFecha(fechaStr) {
    return formatFechaBogota(fechaStr);
  }

  // Establece las fechas por defecto: primer día del mes hasta hoy
  function establecerFechasPorDefecto() {
    var hoy    = new Date();
    var primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    var fmt = function (d) {
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      return d.getFullYear() + '-' + mm + '-' + dd;
    };

    document.getElementById('filtroFechaInicio').value = fmt(primero);
    document.getElementById('filtroFechaFin').value    = fmt(hoy);
  }

  async function cargarFiltros() {
    try {
      var results = await Promise.all([
        fetch('/api/usuarios'),
        fetch('/api/todas-bases')
      ]);

      if (results[0].status === 403 || results[1].status === 403) {
        document.body.innerHTML = '<div class="container" style="text-align: center; padding: 4rem;"><div class="card"><p style="font-size: 1.1rem; color: #d32f2f;">Acceso denegado: No tiene permisos de administrador.</p><a href="/seleccionar-bd.html" class="btn btn-primary" style="margin-top: 1rem;">Volver</a></div></div>';
        return;
      }

      var usuarios = await results[0].json();
      var bases    = await results[1].json();

      var selOp = document.getElementById('filtroOperador');
      usuarios.forEach(function (u) {
        var opt = document.createElement('option');
        opt.value       = u.Id;
        opt.textContent = u.Nombre + ' (' + u.Codigo + ')';
        selOp.appendChild(opt);
      });

      var selBase = document.getElementById('filtroBase');
      bases.forEach(function (b) {
        var opt = document.createElement('option');
        opt.value       = b.Id;
        opt.textContent = b.NombreBD;
        selBase.appendChild(opt);
      });

    } catch (err) {
      console.error('Error al cargar filtros:', err);
    }
  }

  function construirParamsFiltros() {
    var params = new URLSearchParams();
    var fi = document.getElementById('filtroFechaInicio').value;
    var ff = document.getElementById('filtroFechaFin').value;
    var op = document.getElementById('filtroOperador').value;
    var bd = document.getElementById('filtroBase').value;

    if (fi) params.append('fechaInicio', fi);
    if (ff) params.append('fechaFin',    ff);
    if (op) params.append('idUsuario',   op);
    if (bd) params.append('idBaseDatos', bd);

    return params;
  }

  function exportarExcel() {
    var params = construirParamsFiltros();
    window.location.href = '/api/asistencias/exportar?' + params.toString();
  }

  var TAMANOS_PAGINA       = ['10', '30', '50', '100'];
  var TAMANO_POR_DEFECTO   = '10';
  var CLAVE_TAMANO_PAGINA  = 'asistencias.tamanoPagina';

  // Recupera el último tamaño elegido; si el navegador bloquea el
  // almacenamiento o el valor no es válido, usa el de por defecto.
  function leerTamanoGuardado() {
    try {
      var guardado = localStorage.getItem(CLAVE_TAMANO_PAGINA);
      if (TAMANOS_PAGINA.indexOf(guardado) !== -1) return guardado;
    } catch (e) { /* almacenamiento no disponible */ }
    return TAMANO_POR_DEFECTO;
  }

  function guardarTamano(valor) {
    try { localStorage.setItem(CLAVE_TAMANO_PAGINA, valor); } catch (e) { /* almacenamiento no disponible */ }
  }

  function tamanoPaginaActual() {
    return document.getElementById('tamanoPagina').value;
  }

  function crearBotonPagina(texto, pagina, opciones) {
    var btn = document.createElement('button');
    btn.type        = 'button';
    btn.className   = 'pag-btn' + (opciones.activo ? ' activo' : '');
    btn.textContent = texto;
    btn.disabled    = !!opciones.deshabilitado;
    btn.dataset.pagina = pagina;
    if (opciones.titulo) btn.title = opciones.titulo;
    if (opciones.titulo) btn.setAttribute('aria-label', opciones.titulo);
    if (opciones.activo) btn.setAttribute('aria-current', 'page');
    return btn;
  }

  // Barra inferior: siempre visible cuando hay registros, aunque haya una sola página
  function renderizarPaginacion(pagina, total, tamanoPagina) {
    var totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina));
    var desde = (pagina - 1) * tamanoPagina + 1;
    var hasta = Math.min(pagina * tamanoPagina, total);

    document.getElementById('paginacionInfo').textContent =
      desde + '–' + hasta + ' de ' + total;

    var nav = document.getElementById('paginacionBotones');
    nav.textContent = '';

    nav.appendChild(crearBotonPagina('«', 1,          { deshabilitado: pagina <= 1, titulo: 'Primera página' }));
    nav.appendChild(crearBotonPagina('‹', pagina - 1, { deshabilitado: pagina <= 1, titulo: 'Página anterior' }));

    calcularPaginasVisibles(pagina, totalPaginas).forEach(function (p) {
      if (p === '…') {
        var elipsis = document.createElement('span');
        elipsis.className   = 'pag-elipsis';
        elipsis.textContent = '…';
        nav.appendChild(elipsis);
      } else {
        nav.appendChild(crearBotonPagina(String(p), p, {
          activo: p === pagina,
          deshabilitado: p === pagina,
          titulo: 'Página ' + p
        }));
      }
    });

    nav.appendChild(crearBotonPagina('›', pagina + 1,   { deshabilitado: pagina >= totalPaginas, titulo: 'Página siguiente' }));
    nav.appendChild(crearBotonPagina('»', totalPaginas, { deshabilitado: pagina >= totalPaginas, titulo: 'Última página' }));

    document.getElementById('paginacion').style.display = 'flex';
  }

  function ocultarPaginacion() {
    document.getElementById('paginacion').style.display = 'none';
  }

  async function buscarAsistencias(pagina) {
    pagina = pagina || 1;
    var params = construirParamsFiltros();
    params.append('pagina', pagina);
    params.append('tamano', tamanoPaginaActual());

    var contenido = document.getElementById('tablaContenido');
    contenido.innerHTML = '<div class="loading-state"><p>Buscando registros...</p></div>';

    try {
      var r = await fetch('/api/asistencias?' + params.toString());

      if (r.status === 401) { window.location.href = '/'; return; }
      if (r.status === 403) {
        ocultarPaginacion();
        contenido.innerHTML = '<div class="card"><p style="color: #d32f2f; text-align: center;">Acceso denegado: No tiene permisos para consultar registros.</p></div>';
        return;
      }
      if (!r.ok) throw new Error();

      var data      = await r.json();
      var registros = data.registros;
      var offset    = (data.pagina - 1) * data.tamanoPagina;
      document.getElementById('contadorRegistros').textContent = data.total;

      if (registros.length === 0) {
        ocultarPaginacion();
        contenido.innerHTML =
          '<div class="empty-state">' +
            '<div class="icon">📭</div>' +
            '<p>No se encontraron registros con los filtros aplicados.</p>' +
          '</div>';
        return;
      }

      var filas = registros.map(function (reg, i) {
        return '<tr>' +
          '<td style="color:var(--text-muted);">' + (offset + i + 1) + '</td>' +
          '<td><strong>' + escapeHtml(reg.NombreOperador) + '</strong></td>' +
          '<td>' + escapeHtml(reg.CodigoOperador) + '</td>' +
          '<td>' + escapeHtml(reg.NombreBD) + '</td>' +
          '<td>' + escapeHtml(reg.TituloCompania || '') + '</td>' +
          '<td>' + formatFecha(reg.Fecha) + '</td>' +
          '<td>' +
            '<button class="btn-ver-foto"' +
              ' data-id="' + reg.Id + '"' +
              ' data-operador="' + escapeHtml(reg.NombreOperador) + '"' +
              ' data-fecha="'    + escapeHtml(formatFecha(reg.Fecha)) + '"' +
              ' data-asamblea="' + escapeHtml(reg.NombreBD) + '"' +
              ' data-novedad="'  + escapeHtml(reg.Novedad || '') + '">' +
              '📷 Ver foto' +
            '</button>' +
          '</td>' +
        '</tr>';
      }).join('');

      contenido.innerHTML =
        '<table>' +
          '<thead><tr>' +
            '<th>#</th>' +
            '<th>Operador</th>' +
            '<th>Código</th>' +
            '<th>Asamblea</th>' +
            '<th>Compañía</th>' +
            '<th>Fecha y hora</th>' +
            '<th>Evidencia</th>' +
          '</tr></thead>' +
          '<tbody>' + filas + '</tbody>' +
        '</table>';

      // Asignar eventos a los botones "Ver foto"
      contenido.querySelectorAll('.btn-ver-foto').forEach(function (btn) {
        btn.addEventListener('click', function () {
          verFoto(btn.dataset.id, btn.dataset.operador, btn.dataset.fecha, btn.dataset.asamblea, btn.dataset.novedad);
        });
      });

      renderizarPaginacion(data.pagina, data.total, data.tamanoPagina);

    } catch (err) {
      ocultarPaginacion();
      contenido.innerHTML =
        '<div class="empty-state">' +
          '<p style="color:var(--danger);">Error al cargar los registros. Intente nuevamente.</p>' +
        '</div>';
    }
  }

  async function verFoto(id, operador, fecha, asamblea, novedad) {
    var modal      = document.getElementById('modalFoto');
    var imgEl      = document.getElementById('modalImagen');
    var cargandoEl = document.getElementById('modalCargando');
    var infoEl     = document.getElementById('modalInfo');

    // Resetear modal
    imgEl.style.display    = 'none';
    imgEl.src              = '';
    infoEl.style.display   = 'none';
    cargandoEl.style.display = 'block';
    modal.classList.add('show');

    // Llenar datos de texto
    document.getElementById('modalOperador').textContent = operador;
    document.getElementById('modalFecha').textContent    = 'Fecha: ' + fecha;
    document.getElementById('modalAsamblea').textContent = 'Asamblea: ' + asamblea;

    var novedadEl = document.getElementById('modalNovedad');
    if (novedad) {
      novedadEl.textContent = 'Novedad: ' + novedad;
      novedadEl.style.display = 'block';
    } else {
      novedadEl.style.display = 'none';
    }

    cargandoEl.textContent = 'Cargando imagen...';

    // El servidor responde la imagen directamente, así que basta con el src
    imgEl.onload = function () {
      cargandoEl.style.display = 'none';
      imgEl.style.display      = 'block';
      infoEl.style.display     = 'grid';
    };
    imgEl.onerror = function () {
      if (!imgEl.getAttribute('src')) return;
      cargandoEl.textContent = 'Foto no disponible.';
      infoEl.style.display   = 'grid';
    };
    imgEl.src = '/api/asistencias/' + encodeURIComponent(id) + '/foto';
  }

  function limpiarFiltros() {
    document.getElementById('filtroOperador').value = '';
    document.getElementById('filtroBase').value     = '';
    establecerFechasPorDefecto();
    buscarAsistencias();
  }

  async function init() {
    var ok = await verificarSesion();
    if (!ok) return;

    // Verificar que el usuario tiene permisos de administrador
    if (!verificarPermisoAdmin()) return;

    establecerFechasPorDefecto();
    document.getElementById('tamanoPagina').value = leerTamanoGuardado();
    await cargarFiltros();
    await buscarAsistencias();

    document.getElementById('btnBuscar').addEventListener('click', function () { buscarAsistencias(1); });

    document.getElementById('tamanoPagina').addEventListener('change', function () {
      guardarTamano(this.value);
      buscarAsistencias(1);
    });

    // Un solo listener para todos los botones de la barra (se regeneran en cada búsqueda)
    document.getElementById('paginacionBotones').addEventListener('click', function (e) {
      var btn = e.target.closest('.pag-btn');
      if (!btn || btn.disabled) return;
      buscarAsistencias(parseInt(btn.dataset.pagina, 10));
    });
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFiltros);
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);

    document.getElementById('cerrarModal').addEventListener('click', function () {
      document.getElementById('modalFoto').classList.remove('show');
    });

    document.getElementById('modalFoto').addEventListener('click', function (e) {
      if (e.target === this) this.classList.remove('show');
    });
  }

  init();
})();
