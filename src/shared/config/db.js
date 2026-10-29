const sql = require('mssql');

// Configuración de conexión a SQL Server y pool de conexiones.
const dbConfig = {
  server: process.env.DB_SERVER || '98.142.103.250',
  port: parseInt(process.env.DB_PORT || '3102', 10),
  database: process.env.DB_NAME || 'ASAMBLEA',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    // Explícito para no depender del default del driver: los DATETIME se
    // leen/escriben como UTC, sin importar la zona horaria del servidor.
    useUTC: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

/**
 * Devuelve un pool de conexión reutilizable. Crea uno nuevo si no existe.
 */
async function getPool() {
  if (!pool) {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    pool.on('error', (err) => {
      console.error('Error en pool de conexión:', err);
      pool = null;
    });
  }
  return pool;
}

module.exports = {
  sql,
  getPool
};
