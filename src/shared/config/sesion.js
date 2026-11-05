// Minutos sin actividad tras los cuales se cierra la sesión.
// Es el único lugar donde se define: el frontend lo recibe desde /api/sesion.
const INACTIVIDAD_MS = 15 * 60 * 1000;

module.exports = { INACTIVIDAD_MS };
