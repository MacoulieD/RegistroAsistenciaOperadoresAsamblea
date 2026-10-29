const express = require('express');
const { sql, getPool } = require('../shared/config/db');
const { esUsuarioActivo, esAdmin } = require('../shared/middlewares/auth');
const { obtenerBasesPermitidas } = require('../bases/basesService');
const { verifyRecaptcha } = require('./recaptcha');

const router = express.Router();

/**
 * Ruta de login: valida reCAPTCHA, verifica credenciales contra SQL Server y crea sesión.
 */
router.post('/login', async (req, res) => {
  const { codigo, clave, captchaToken } = req.body;

  if (!codigo || !clave) {
    return res.status(400).json({ error: 'Código y clave son requeridos' });
  }

  if (!captchaToken) {
    return res.status(400).json({ error: 'Por favor complete el reCAPTCHA.' });
  }

  try {
    const captchaResult = await verifyRecaptcha(captchaToken);
    if (!captchaResult.success) {
      return res.status(401).json({ error: 'Verificación de reCAPTCHA fallida. Intente nuevamente.' });
    }

    const db = await getPool();
    const result = await db.request()
      .input('codigo', sql.NVarChar(50), codigo.trim())
      .input('clave', sql.NVarChar(100), clave.trim())
      .query(`
        SELECT Id, Codigo, Nombre, CodigoGrupo, Actor, IdsBaseDatos, Estado
        FROM dbo.GENUsuario
        WHERE LTRIM(RTRIM(Codigo)) = LTRIM(RTRIM(@codigo))
          AND LTRIM(RTRIM(Clave)) = LTRIM(RTRIM(@clave))
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Código o clave incorrectos' });
    }

    const usuario = result.recordset[0];
    if (!esUsuarioActivo(usuario.Estado)) {
      return res.status(403).json({ error: 'El usuario está inactivo' });
    }

    const usuarioSesion = {
      Id: usuario.Id,
      Codigo: usuario.Codigo,
      Nombre: usuario.Nombre,
      CodigoGrupo: usuario.CodigoGrupo,
      Actor: usuario.Actor,
      IdsBaseDatos: usuario.IdsBaseDatos || '',
      rol: usuario.CodigoGrupo
    };

    const basesActivas = await obtenerBasesPermitidas(db, sql, usuarioSesion);
    const esAdministrador = esAdmin(usuarioSesion);

    // Se valida antes de crear la sesión, para no dejar autenticado a quien se rechaza
    if (!esAdministrador && basesActivas.length === 0) {
      return res.status(403).json({ error: 'No tiene bases de datos activas asignadas' });
    }

    // Guardar usuario autenticado en sesión
    req.session.usuario = usuarioSesion;

    // Retornar datos básicos necesarios para el frontend
    res.json({
      nombre: usuario.Nombre,
      codigo: usuario.Codigo,
      codigoGrupo: usuario.CodigoGrupo,
      actor: usuario.Actor,
      basesActivas: basesActivas.length,
      esAdmin: esAdministrador
    });
  } catch (err) {
    console.error('Error en login:', err);
    if (err && err.code === 'ELOGIN') {
      return res.status(503).json({
        error: 'No se pudo conectar con la base de datos (credenciales o permisos SQL inválidos).'
      });
    }
    if (err && err.code === 'ETIMEOUT') {
      return res.status(503).json({
        error: 'Tiempo de espera agotado al conectar con la base de datos.'
      });
    }
    res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
});

/**
 * Cierra la sesión del usuario.
 */
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ mensaje: 'Sesión cerrada' });
  });
});

/**
 * Consulta si hay sesión activa y devuelve datos básicos del usuario.
 */
router.get('/sesion', (req, res) => {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ autenticado: false });
  }

  const u = req.session.usuario;
  const esAdministrador = esAdmin(u);

  res.json({
    autenticado: true,
    nombre: u.Nombre,
    codigo: u.Codigo,
    codigoGrupo: u.CodigoGrupo,
    esAdmin: esAdministrador
  });
});

module.exports = router;
