const { registrarAuditoria } = require('../services/auditoriaService');

/**
 * Verifica si el estado del usuario se considera activo.
 * Acepta múltiples representaciones de valores verdaderos.
 */
function esUsuarioActivo(estado) {
  if (estado === null || estado === undefined) {
    return true;
  }

  const valor = String(estado).trim().toUpperCase();
  if (!valor) {
    return true;
  }

  return ['1', 'ACTIVO', 'A', 'TRUE', 'SI', 'S'].includes(valor);
}

/**
 * Determina si un usuario tiene permisos de administrador.
 */
function esAdmin(usuario) {
  if (!usuario) return false;

  const actor = String(usuario.Actor || usuario.actor || '').trim().toUpperCase();
  if (actor === 'A5') {
    return true;
  }

  const rol = String(usuario.rol || usuario.CodigoGrupo || '').trim().toUpperCase();
  return rol === 'ADMIN' || rol === 'ADM' || rol.startsWith('ADMIN');
}

/**
 * Middleware que protege rutas que requieren autenticación.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  next();
}

/**
 * Middleware que protege rutas exclusivas para administradores.
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (!esAdmin(req.session.usuario)) {
    console.warn(`Acceso denegado a ruta administrativa: ${req.method} ${req.path} por usuario ${req.session.usuario.Codigo}`);
    return res.status(403).json({ error: 'Acceso denegado. No tiene permisos de administrador.' });
  }

  next();
}

/**
 * Middleware que registra auditoría de las acciones de usuario, en consola
 * y en la tabla dbo.GENAuditoriaAsistencia (incluye el código de respuesta,
 * para distinguir accesos permitidos de denegados).
 */
function auditarAccion(req, res, next) {
  if (req.session && req.session.usuario) {
    const usuario = req.session.usuario;
    const timestamp = new Date().toISOString();
    const query = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : '';
    const ruta = req.originalUrl.split('?')[0];
    console.log(`[AUDIT] ${timestamp} | Usuario: ${usuario.Codigo} (${usuario.Nombre}) | ${req.method} ${ruta} | Query: ${query}`);

    res.on('finish', () => {
      registrarAuditoria({
        idUsuario: usuario.Id,
        codigoUsuario: usuario.Codigo,
        metodo: req.method,
        ruta,
        parametros: query,
        codigoRespuesta: res.statusCode
      });
    });
  }
  next();
}

module.exports = {
  esUsuarioActivo,
  esAdmin,
  requireAuth,
  requireAdmin,
  auditarAccion
};
