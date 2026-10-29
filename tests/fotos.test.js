const test = require('node:test');
const assert = require('node:assert/strict');
const {
  decodificarDataUrl,
  detectarTipoImagen,
  obtenerImagenRegistro,
  validarFotoNueva,
  TAMANO_MAXIMO_FOTO
} = require('../src/asistencias/fotos');

// Cabecera JPEG mínima (FF D8 FF E0 ...) suficiente para detectar el tipo.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 2, 3]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const dataUrlJpeg = 'data:image/jpeg;base64,' + JPEG.toString('base64');

test('decodifica un data URL JPEG a buffer', () => {
  const r = decodificarDataUrl(dataUrlJpeg);

  assert.equal(r.tipo, 'image/jpeg');
  assert.deepEqual(r.buffer, JPEG);
});

test('rechaza valores que no son data URL de imagen permitida', () => {
  assert.equal(decodificarDataUrl(null), null);
  assert.equal(decodificarDataUrl(''), null);
  assert.equal(decodificarDataUrl('hola'), null);
  assert.equal(decodificarDataUrl('data:text/html;base64,PGgxPg=='), null);
  assert.equal(decodificarDataUrl('data:image/jpeg;base64,'), null);
});

test('detecta el tipo de imagen por sus primeros bytes', () => {
  assert.equal(detectarTipoImagen(JPEG), 'image/jpeg');
  assert.equal(detectarTipoImagen(PNG), 'image/png');
  assert.equal(detectarTipoImagen(Buffer.from('no es imagen')), 'application/octet-stream');
  assert.equal(detectarTipoImagen(null), 'application/octet-stream');
});

test('prioriza FotoBinaria sobre FotoRegistro', () => {
  const r = obtenerImagenRegistro({ FotoBinaria: PNG, FotoRegistro: dataUrlJpeg });

  assert.equal(r.tipo, 'image/png');
  assert.deepEqual(r.buffer, PNG);
});

test('usa FotoRegistro (base64) en registros antiguos', () => {
  const r = obtenerImagenRegistro({ FotoBinaria: null, FotoRegistro: dataUrlJpeg });

  assert.equal(r.tipo, 'image/jpeg');
  assert.deepEqual(r.buffer, JPEG);
});

test('devuelve null cuando el registro no tiene foto', () => {
  assert.equal(obtenerImagenRegistro({ FotoBinaria: null, FotoRegistro: null }), null);
  assert.equal(obtenerImagenRegistro(null), null);
});

test('rechaza un data URL cuyo contenido no coincide con el tipo declarado', () => {
  const pngDisfrazadoDeJpeg = 'data:image/jpeg;base64,' + PNG.toString('base64');
  const textoDisfrazado = 'data:image/jpeg;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64');

  assert.equal(decodificarDataUrl(pngDisfrazadoDeJpeg), null);
  assert.equal(decodificarDataUrl(textoDisfrazado), null);
});

test('validarFotoNueva acepta una imagen válida dentro del límite', () => {
  const r = validarFotoNueva(dataUrlJpeg);

  assert.equal(r.error, undefined);
  assert.equal(r.foto.tipo, 'image/jpeg');
  assert.deepEqual(r.foto.buffer, JPEG);
});

test('validarFotoNueva rechaza contenido que no es imagen', () => {
  const r = validarFotoNueva('data:image/jpeg;base64,' + Buffer.from('no es una imagen').toString('base64'));

  assert.equal(r.foto, undefined);
  assert.match(r.error, /formato de imagen válido/);
});

test('validarFotoNueva rechaza fotos que superan el tamaño máximo', () => {
  const grande = Buffer.alloc(TAMANO_MAXIMO_FOTO + 1);
  JPEG.copy(grande);
  const r = validarFotoNueva('data:image/jpeg;base64,' + grande.toString('base64'));

  assert.equal(r.foto, undefined);
  assert.match(r.error, /tamaño máximo/);
});

test('validarFotoNueva acepta una foto justo en el tamaño máximo', () => {
  const limite = Buffer.alloc(TAMANO_MAXIMO_FOTO);
  JPEG.copy(limite);

  assert.equal(validarFotoNueva('data:image/jpeg;base64,' + limite.toString('base64')).error, undefined);
});
