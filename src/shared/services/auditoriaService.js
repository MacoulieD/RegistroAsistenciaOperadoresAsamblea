const { sql, getPool } = require('../config/db');

/**
 * Guarda una acción de auditoría en dbo.GENAuditoriaAsistencia.
 * Nunca lanza error: si la BD falla, solo lo deja en consola para no
 * interrumpir la petición del usuario.
 */
async function registrarAuditoria({ idUsuario, codigoUsuario, metodo, ruta, parametros, codigoRespuesta }) {
  try {
    const db = await getPool();
    await db.request()
      .input('idUsuario', sql.Int, idUsuario || null)
      .input('codigoUsuario', sql.NVarChar(50), codigoUsuario || null)
      .input('metodo', sql.NVarChar(10), metodo)
      .input('ruta', sql.NVarChar(400), ruta)
      .input('parametros', sql.NVarChar(sql.MAX), parametros || null)
      .input('codigoRespuesta', sql.Int, codigoRespuesta)
      .query(`
        INSERT INTO dbo.GENAuditoriaAsistencia
          (Fecha, IdUsuario, CodigoUsuario, Metodo, Ruta, Parametros, CodigoRespuesta)
        VALUES
          (SYSUTCDATETIME(), @idUsuario, @codigoUsuario, @metodo, @ruta, @parametros, @codigoRespuesta)
      `);
  } catch (err) {
    console.error('Error al guardar auditoría en BD:', err.message);
  }
}

module.exports = { registrarAuditoria };
