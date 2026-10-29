const express = require('express');
const path = require('path');
const session = require('express-session');
const apiRoutes = require('./routes');

const app = express();

// Permite recibir JSON en el body de las peticiones.
// 4 MB alcanza para una foto de 2 MB (máximo permitido) codificada en base64.
app.use(express.json({ limit: '4mb' }));

// Sirve archivos estáticos desde la carpeta public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// Código compartido entre backend y frontend (ej. formato de fechas)
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

// Configuración de sesión para mantener login del usuario
app.use(session({
  secret: process.env.SESSION_SECRET || 'asamblea-key-default',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 8 * 60 * 60 * 1000 // 8 horas
  }
}));

// Monta las rutas del API bajo /api
app.use('/api', apiRoutes);

// Responde en JSON los errores de lectura del body, para que el frontend
// muestre un mensaje claro en lugar de "Error de conexión".
app.use((err, _req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La foto supera el tamaño máximo permitido (2 MB)' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Datos enviados con formato inválido' });
  }
  next(err);
});

module.exports = app;
