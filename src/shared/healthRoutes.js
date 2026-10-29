const express = require('express');
const { getPool } = require('./config/db');

const router = express.Router();

router.get('/health/db', async (_req, res) => {
  try {
    const db = await getPool();
    await db.request().query('SELECT 1 AS ok');
    res.json({ ok: true, message: 'Conexion a BD exitosa' });
  } catch (err) {
    const code = err && err.code ? err.code : 'UNKNOWN';
    res.status(503).json({
      ok: false,
      message: 'Sin conexion a BD',
      code: code
    });
  }
});

module.exports = router;
