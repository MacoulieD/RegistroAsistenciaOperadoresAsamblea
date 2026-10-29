// Carga variables de entorno: usa .env.<NODE_ENV> si existe (ej. .env.test),
// y si no cae de nuevo a .env (el de siempre en producción).
const { resolveEnvFile } = require('./shared/config/envFile');
require('dotenv').config({
    path: resolveEnvFile(__dirname, process.env.NODE_ENV)
});

const app = require('./app');

// Puerto en el que escuchará el servidor
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Servidor en ejecución: http://localhost:${PORT}`);
});
