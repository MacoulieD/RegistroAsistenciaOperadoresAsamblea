const express = require('express');
const healthRoutes = require('./shared/healthRoutes');
const authRoutes = require('./auth/authRoutes');
const basesRoutes = require('./bases/basesRoutes');
const asistenciasRoutes = require('./asistencias/asistenciasRoutes');
const usuariosRoutes = require('./usuarios/usuariosRoutes');

const router = express.Router();

// Enrutador principal que agrupa las rutas de todos los módulos
router.use(healthRoutes);
router.use(authRoutes);
router.use(basesRoutes);
router.use(asistenciasRoutes);
router.use(usuariosRoutes);

module.exports = router;
