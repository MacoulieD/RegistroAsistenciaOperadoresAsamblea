# Registro de Asistencia Operadores Asamblea

Aplicación web para el registro fotográfico de asistencia de operadores de asambleas. Construida con Node.js, Express, SQL Server y frontend estático.

## Características

- Login con validación de credenciales en SQL Server y reCAPTCHA v2
- Sesiones HTTP con expiración de 8 horas
- Selección de asamblea asignada al operador
- Captura y compresión de foto en el cliente (Canvas API, máx. 1280px, JPEG 82%)
- Campo de **novedad** opcional al momento de registrar la asistencia
- Almacenamiento de evidencia fotográfica como binario (`VARBINARY`) en SQL Server
- Panel de administración con filtros por fecha, operador y asamblea, paginado y con exportación a Excel
- Visualización de foto y novedad en modal desde el panel de administración
- Auditoría de acciones administrativas en consola y en la tabla `dbo.GENAuditoriaAsistencia`

## Requisitos

- Node.js 16+
- NPM
- SQL Server accesible desde el servidor

## Instalación

1. Clona el repositorio:
   ```bash
   git clone <repo-url>
   cd RegistroAsistenciaOperadoresAsamblea
   ```

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Crea el archivo `.env` en la raíz (ver sección Configuración).

## Configuración

```env
DB_SERVER=<ip-del-servidor>
DB_PORT=<puerto>
DB_NAME=ASAMBLEA
DB_USER=<usuario>
DB_PASSWORD=<contraseña>
SESSION_SECRET=<clave-secreta-segura>
RECAPTCHA_SECRET=<tu-recaptcha-secret-key>
PORT=3000
```

### reCAPTCHA

- El `sitekey` está en `public/index.html` dentro del `div.g-recaptcha`.
- El `secret` va en `.env` como `RECAPTCHA_SECRET`.
- En producción, registra el dominio del servidor en la consola de Google reCAPTCHA.
- En pruebas locales con móvil, registra la IP local o usa claves de prueba de Google.

## Ejecutar

```bash
# Producción
npm start

# Desarrollo (recarga automática)
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Estructura del proyecto

```
├── server.js                   # Punto de entrada
├── src/
│   ├── app.js                  # Configuración de Express
│   ├── server.js               # Arranque del servidor
│   ├── routes.js               # Enrutador principal: une las rutas de cada módulo
│   ├── auth/
│   │   ├── authRoutes.js       # Login, logout, verificación de sesión
│   │   └── recaptcha.js        # Verificación del token reCAPTCHA
│   ├── asistencias/
│   │   ├── asistenciasRoutes.js# Registro, consulta, exportación y foto
│   │   ├── filtrosAsistencias.js# Filtros del panel admin
│   │   └── fotos.js            # Conversión de fotos base64 ↔ binario
│   ├── bases/
│   │   ├── basesRoutes.js      # Bases del operador y todas las bases (admin)
│   │   └── basesService.js     # Lógica de bases activas
│   ├── usuarios/
│   │   └── usuariosRoutes.js   # Lista de usuarios (admin)
│   └── shared/                 # Transversal a todos los módulos
│       ├── config/
│       │   ├── db.js           # Pool de conexiones SQL Server
│       │   └── envFile.js      # Resolución del archivo .env a cargar
│       ├── middlewares/
│       │   └── auth.js         # Autenticación, autorización y auditoría
│       ├── services/
│       │   └── auditoriaService.js # Registro de auditoría en BD
│       ├── utils/
│       │   └── paginacion.js   # Parámetros de paginación
│       └── healthRoutes.js     # Health check de BD
├── shared/                     # Código de backend y frontend, servido en /shared
│   ├── formatFecha.js          # Formato de fechas
│   └── paginasVisibles.js      # Números de la barra de paginación
├── db/migraciones/             # Scripts SQL a ejecutar en cada despliegue
├── tests/                      # Pruebas unitarias (node --test)
└── public/
    ├── index.html              # Login
    ├── seleccionar-bd.html     # Selector de asamblea
    ├── registro.html           # Captura fotográfica y novedad
    ├── admin.html              # Panel de administración
    ├── css/styles.css
    └── js/
        ├── login.js
        ├── seleccionar-bd.js
        ├── registro.js
        └── admin.js
```

## Base de datos

### Tablas principales

| Tabla | Descripción |
|---|---|
| `dbo.GENUsuario` | Usuarios y credenciales |
| `dbo.GENBasesDeDatos` | Asambleas / compañías |
| `dbo.GENAsistenciaOperador` | Registros de asistencia fotográfica |
| `dbo.GENAuditoriaAsistencia` | Auditoría de acciones administrativas |

### Estructura de `dbo.GENAsistenciaOperador`

| Columna | Tipo | Descripción |
|---|---|---|
| `Id` | int, PK | Identificador único |
| `IdUsuario` | int, FK | Referencia a `GENUsuario` |
| `IdBaseDatos` | int, FK | Referencia a `GENBasesDeDatos` |
| `Fecha` | datetime | Fecha y hora del registro |
| `FotoBinaria` | varbinary(max), null | Imagen (registros nuevos) |
| `FotoRegistro` | nvarchar(max), null | Imagen en base64 (solo registros antiguos, ver migración 02) |
| `Novedad` | nvarchar(max), null | Comentario u observación opcional |

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/login` | Autentica usuario y valida reCAPTCHA |
| POST | `/api/logout` | Cierra sesión |
| GET | `/api/sesion` | Verifica sesión activa |
| GET | `/api/bases-datos` | Bases asignadas al operador |
| POST | `/api/registro` | Inserta registro de asistencia (foto + novedad) |
| GET | `/api/asistencias` | Consulta paginada con filtros (admin). Parámetros `pagina` y `tamano` (máx. 200); responde `{ registros, total, pagina, tamanoPagina }` |
| GET | `/api/asistencias/exportar` | Exporta a Excel todos los registros filtrados (admin) |
| GET | `/api/asistencias/:id/foto` | Devuelve la imagen del registro directamente (admin) |
| GET | `/api/usuarios` | Lista de usuarios (admin) |
| GET | `/api/todas-bases` | Todas las bases de datos (admin) |
| GET | `/api/health/db` | Verifica conectividad a la BD |

## Flujo de uso

**Operador:**
1. Inicia sesión con código y clave (+ reCAPTCHA)
2. Selecciona la asamblea asignada
3. Captura o selecciona una foto
4. Agrega una novedad (opcional)
5. Envía el registro

**Administrador:**
1. Inicia sesión (rol `ADMIN` o `A5`)
2. Accede al panel de administración
3. Filtra por fecha, operador y/o asamblea
4. Visualiza la evidencia fotográfica y la novedad desde el modal

## Despliegue

1. Ejecuta en la BD, **antes de subir el código**, los scripts pendientes de `db/migraciones/` en orden:
   - `01_fotos_binarias_y_auditoria.sql` (obligatorio).
   - `02_convertir_fotos_antiguas.sql` (opcional, con backup previo): pasa las fotos antiguas a binario.
2. Sube el proyecto al servidor y ejecuta `npm install`.
3. Configura `src/.env` con los datos de producción (ver `.env.example`).
4. Registra el dominio en la consola de Google reCAPTCHA.
5. Usa un gestor de procesos como `pm2` para mantener la app activa.
6. Habilita HTTPS en el dominio.

## Seguridad

- No expongas `RECAPTCHA_SECRET` ni credenciales de BD en el frontend.
- Cambia `SESSION_SECRET` por un valor aleatorio y seguro en producción.
- Usa HTTPS en ambientes públicos.
- Considera habilitar `encrypt: true` en la configuración de SQL Server si el servidor lo soporta.

## Licencia

Este proyecto no incluye licencia explícita.
