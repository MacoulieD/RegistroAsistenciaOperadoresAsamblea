/**
 * Utilidades para guardar la evidencia fotográfica como binario
 * (VARBINARY) en lugar de texto base64.
 */

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

// El cliente comprime a máx. 1280px (normalmente 100-300 KB); 2 MB deja margen
// sin permitir que una llamada directa al API llene la BD.
const TAMANO_MAXIMO_FOTO = 2 * 1024 * 1024;

/**
 * Convierte un data URL ("data:image/jpeg;base64,...") en un Buffer.
 * Devuelve null si el formato no es válido, el tipo no está permitido o
 * los bytes no corresponden realmente al tipo de imagen declarado.
 */
function decodificarDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;

  const coincidencia = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!coincidencia) return null;

  const tipo = coincidencia[1].toLowerCase();
  if (!TIPOS_PERMITIDOS.includes(tipo)) return null;

  const buffer = Buffer.from(coincidencia[2], 'base64');
  if (buffer.length === 0) return null;
  if (detectarTipoImagen(buffer) !== tipo) return null;

  return { buffer, tipo };
}

/**
 * Valida la foto que envía el operador al registrar asistencia.
 * Devuelve { foto } si es válida, o { error } con el mensaje para el usuario.
 */
function validarFotoNueva(dataUrl) {
  const foto = decodificarDataUrl(dataUrl);
  if (!foto) {
    return { error: 'La foto no tiene un formato de imagen válido' };
  }

  if (foto.buffer.length > TAMANO_MAXIMO_FOTO) {
    return { error: 'La foto supera el tamaño máximo permitido (2 MB)' };
  }

  return { foto };
}

/**
 * Detecta el tipo de imagen a partir de sus primeros bytes.
 */
function detectarTipoImagen(buffer) {
  if (!buffer || buffer.length < 12) return 'application/octet-stream';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return 'application/octet-stream';
}

/**
 * Obtiene la imagen de un registro, sea nuevo (FotoBinaria) o
 * antiguo (FotoRegistro en base64). Devuelve null si no hay foto.
 */
function obtenerImagenRegistro(registro) {
  if (!registro) return null;

  if (registro.FotoBinaria && registro.FotoBinaria.length > 0) {
    return { buffer: registro.FotoBinaria, tipo: detectarTipoImagen(registro.FotoBinaria) };
  }

  if (registro.FotoRegistro) {
    return decodificarDataUrl(registro.FotoRegistro);
  }

  return null;
}

module.exports = {
  decodificarDataUrl,
  detectarTipoImagen,
  obtenerImagenRegistro,
  validarFotoNueva,
  TAMANO_MAXIMO_FOTO
};
