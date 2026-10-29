const express = require('express');
const ExcelJS = require('exceljs');
const { sql, getPool } = require('../shared/config/db');
const { requireAuth, requireAdmin, auditarAccion } = require('../shared/middlewares/auth');
const { obtenerBasesPermitidas } = require('../bases/basesService');
const { construirFiltroAsistencias, aplicarFiltroAsistencias } = require('./filtrosAsistencias');
const { parsearPaginacion } = require('../shared/utils/paginacion');
const { validarFotoNueva, obtenerImagenRegistro } = require('./fotos');
const { formatFechaBogota } = require('../../shared/formatFecha');

const router = express.Router();

const CONSULTA_ASISTENCIAS = `
  SELECT
    a.Id,
    u.Nombre AS NombreOperador,
    u.Codigo AS CodigoOperador,
    b.NombreBD,
    b.TituloCompania,
    a.Fecha,
    a.Novedad
  FROM dbo.GENAsistenciaOperador a
  INNER JOIN dbo.GENUsuario u ON a.IdUsuario = u.Id
  INNER JOIN dbo.GENBasesDeDatos b ON a.IdBaseDatos = b.Id
`;

router.post('/registro', requireAuth, async (req, res) => {
  const { idBaseDatos, fotoBase64, novedad } = req.body;
  const idUsuario = req.session.usuario.Id;

  if (!idBaseDatos || !fotoBase64) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  const idBD = parseInt(idBaseDatos, 10);
  if (isNaN(idBD) || idBD <= 0) {
    return res.status(400).json({ error: 'ID de base de datos inválido' });
  }

  const { foto, error } = validarFotoNueva(fotoBase64);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const db = await getPool();
    const basesActivas = await obtenerBasesPermitidas(db, sql, req.session.usuario);
    const permitido = basesActivas.some((b) => b.Id === idBD);

    if (!permitido) {
      return res.status(403).json({
        error: 'La base de datos seleccionada no está activa o no está asociada al operador.'
      });
    }

    await db.request()
      .input('idUsuario', sql.Int, idUsuario)
      .input('idBaseDatos', sql.Int, idBD)
      .input('fotoBinaria', sql.VarBinary(sql.MAX), foto.buffer)
      .input('novedad', sql.NVarChar(sql.MAX), novedad || null)
      .query(`
        INSERT INTO dbo.GENAsistenciaOperador (IdUsuario, IdBaseDatos, Fecha, FotoBinaria, Novedad)
        VALUES (@idUsuario, @idBaseDatos, SYSUTCDATETIME(), @fotoBinaria, @novedad)
      `);

    res.json({ mensaje: 'Asistencia registrada correctamente' });
  } catch (err) {
    console.error('Error al registrar asistencia:', err);
    res.status(500).json({ error: 'Error al guardar el registro' });
  }
});

router.get('/asistencias', auditarAccion, requireAdmin, async (req, res) => {
  try {
    const db = await getPool();
    const { where, inputs } = construirFiltroAsistencias(req.query, sql);
    const { pagina, tamano, desde, hasta } = parsearPaginacion(req.query);

    const conteo = await aplicarFiltroAsistencias(db.request(), inputs).query(`
      SELECT COUNT(*) AS Total
      FROM dbo.GENAsistenciaOperador a
      INNER JOIN dbo.GENUsuario u ON a.IdUsuario = u.Id
      INNER JOIN dbo.GENBasesDeDatos b ON a.IdBaseDatos = b.Id
      ${where}
    `);

    // ROW_NUMBER() en lugar de OFFSET/FETCH por compatibilidad con SQL Server antiguo
    const result = await aplicarFiltroAsistencias(db.request(), inputs)
      .input('desde', sql.Int, desde)
      .input('hasta', sql.Int, hasta)
      .query(`
        SELECT Id, NombreOperador, CodigoOperador, NombreBD, TituloCompania, Fecha, Novedad
        FROM (
          SELECT
            a.Id,
            u.Nombre AS NombreOperador,
            u.Codigo AS CodigoOperador,
            b.NombreBD,
            b.TituloCompania,
            a.Fecha,
            a.Novedad,
            ROW_NUMBER() OVER (ORDER BY a.Fecha DESC, a.Id DESC) AS Fila
          FROM dbo.GENAsistenciaOperador a
          INNER JOIN dbo.GENUsuario u ON a.IdUsuario = u.Id
          INNER JOIN dbo.GENBasesDeDatos b ON a.IdBaseDatos = b.Id
          ${where}
        ) t
        WHERE t.Fila BETWEEN @desde AND @hasta
        ORDER BY t.Fila
      `);

    res.json({
      registros: result.recordset,
      total: conteo.recordset[0].Total,
      pagina,
      tamanoPagina: tamano
    });
  } catch (err) {
    console.error('Error al consultar asistencias:', err);
    res.status(500).json({ error: 'Error al consultar registros' });
  }
});

router.get('/asistencias/exportar', auditarAccion, requireAdmin, async (req, res) => {
  try {
    const db = await getPool();
    const request = db.request();
    const { where, inputs } = construirFiltroAsistencias(req.query, sql);
    aplicarFiltroAsistencias(request, inputs);

    const result = await request.query(`
      ${CONSULTA_ASISTENCIAS}
      ${where}
      ORDER BY a.Fecha DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const hoja = workbook.addWorksheet('Asistencias');

    hoja.columns = [
      { header: 'Operador', key: 'operador', width: 30 },
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Asamblea', key: 'asamblea', width: 25 },
      { header: 'Compañía', key: 'compania', width: 25 },
      { header: 'Fecha y hora', key: 'fecha', width: 20 },
      { header: 'Novedad', key: 'novedad', width: 40 }
    ];
    hoja.getRow(1).font = { bold: true };

    result.recordset.forEach((reg) => {
      hoja.addRow({
        operador: reg.NombreOperador,
        codigo: reg.CodigoOperador,
        asamblea: reg.NombreBD,
        compania: reg.TituloCompania || '',
        fecha: formatFechaBogota(reg.Fecha),
        novedad: reg.Novedad || ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="asistencias.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error al exportar asistencias:', err);
    res.status(500).json({ error: 'Error al exportar registros' });
  }
});

// Devuelve la imagen directamente (no JSON), para usarla como src de un <img>.
router.get('/asistencias/:id/foto', auditarAccion, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const db = await getPool();
    const result = await db.request()
      .input('id', sql.Int, id)
      .query('SELECT FotoBinaria, FotoRegistro FROM dbo.GENAsistenciaOperador WHERE Id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    const imagen = obtenerImagenRegistro(result.recordset[0]);
    if (!imagen) {
      return res.status(404).json({ error: 'Foto no disponible' });
    }

    res.setHeader('Content-Type', imagen.tipo);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(imagen.buffer);
  } catch (err) {
    console.error('Error al obtener foto:', err);
    res.status(500).json({ error: 'Error al obtener la foto' });
  }
});

module.exports = router;
