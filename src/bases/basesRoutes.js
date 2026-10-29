const express = require('express');
const { sql, getPool } = require('../shared/config/db');
const { requireAuth, requireAdmin, auditarAccion } = require('../shared/middlewares/auth');
const { obtenerBasesPermitidas } = require('./basesService');

const router = express.Router();

router.get('/bases-datos', requireAuth, async (req, res) => {
  try {
    const db = await getPool();
    const basesActivas = await obtenerBasesPermitidas(db, sql, req.session.usuario);
    res.json(basesActivas);
  } catch (err) {
    console.error('Error al obtener bases de datos:', err);
    res.status(500).json({ error: 'Error al obtener bases de datos' });
  }
});

router.get('/todas-bases', auditarAccion, requireAdmin, async (_req, res) => {
  try {
    const db = await getPool();
    const result = await db.request().query(`
      SELECT Id, NombreBD, TituloCompania
      FROM dbo.GENBasesDeDatos
      WHERE Estado = 1
      ORDER BY NombreBD
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener bases de datos:', err);
    res.status(500).json({ error: 'Error al obtener bases de datos' });
  }
});

module.exports = router;
