const { esAdmin } = require('../shared/middlewares/auth');

/**
 * Devuelve las bases de datos activas asociadas a un conjunto de IDs.
 * @param {object} db Pool de conexión a SQL Server.
 * @param {object} sql Objeto mssql para tipos y parámetros.
 * @param {string|number} idsBaseDatos Cadena de IDs separadas por comas.
 * @returns {Promise<Array>} Base de datos activas.
 */
async function obtenerBasesActivasPorIds(db, sql, idsBaseDatos) {
  const idsRaw = String(idsBaseDatos || '').trim();
  if (!idsRaw) {
    return [];
  }

  // Compatibilidad con SQL Server antiguo (sin STRING_SPLIT)
  const ids = idsRaw.split(',')
    .map((v) => parseInt(v.trim(), 10))
    .filter((v) => !isNaN(v));

  if (ids.length === 0) {
    return [];
  }

  const req = db.request();
  const params = ids.map((id, i) => {
    req.input(`id${i}`, sql.Int, id);
    return `@id${i}`;
  }).join(',');

  const result = await req.query(`
    SELECT b.Id, b.NombreBD, b.TituloCompania, b.NitEmpresa, b.CodigoAplicacion
    FROM dbo.GENBasesDeDatos b
    WHERE b.Id IN (${params})
      AND b.Estado = 1
    ORDER BY b.NombreBD
  `);

  return result.recordset;
}

/**
 * Devuelve todas las bases de datos activas.
 */
async function obtenerTodasBasesActivas(db) {
  const result = await db.request().query(`
    SELECT b.Id, b.NombreBD, b.TituloCompania, b.NitEmpresa, b.CodigoAplicacion
    FROM dbo.GENBasesDeDatos b
    WHERE b.Estado = 1
    ORDER BY b.NombreBD
  `);

  return result.recordset;
}

/**
 * Bases en las que el usuario puede registrar asistencia: un administrador
 * puede hacerlo en cualquier base activa (en el sistema institucional no se
 * le asignan bases); un operador, solo en las activas que tenga asignadas.
 */
async function obtenerBasesPermitidas(db, sql, usuario) {
  if (esAdmin(usuario)) {
    return obtenerTodasBasesActivas(db);
  }
  return obtenerBasesActivasPorIds(db, sql, usuario && usuario.IdsBaseDatos);
}

module.exports = {
  obtenerBasesActivasPorIds,
  obtenerTodasBasesActivas,
  obtenerBasesPermitidas
};
