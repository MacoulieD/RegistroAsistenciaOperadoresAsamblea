const express = require('express');
const { getPool } = require('../shared/config/db');
const { requireAdmin, auditarAccion } = require('../shared/middlewares/auth');

const router = express.Router();

router.get('/usuarios', auditarAccion, requireAdmin, async (_req, res) => {
  try {
    const db = await getPool();
    const result = await db.request().query(`
      SELECT Id, Codigo, Nombre
      FROM dbo.GENUsuario
      ORDER BY Nombre
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

module.exports = router;
