const fs = require('fs');
const path = require('path');

/**
 * Resuelve qué archivo .env cargar: prioriza .env.<nodeEnv> si existe,
 * y cae de nuevo a .env (el de siempre) en cualquier otro caso.
 */
function resolveEnvFile(dir, nodeEnv) {
  if (nodeEnv) {
    const especifico = path.join(dir, `.env.${nodeEnv}`);
    if (fs.existsSync(especifico)) {
      return especifico;
    }
  }
  return path.join(dir, '.env');
}

module.exports = { resolveEnvFile };
