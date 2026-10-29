const test = require('node:test');
const assert = require('node:assert/strict');
const { parsearPaginacion, TAMANO_POR_DEFECTO, TAMANO_MAXIMO } = require('../src/shared/utils/paginacion');

test('sin parámetros usa página 1 y tamaño por defecto', () => {
  assert.deepEqual(parsearPaginacion({}), {
    pagina: 1, tamano: TAMANO_POR_DEFECTO, desde: 1, hasta: TAMANO_POR_DEFECTO
  });
});

test('calcula el rango de filas de la página pedida', () => {
  assert.deepEqual(parsearPaginacion({ pagina: '3', tamano: '20' }), {
    pagina: 3, tamano: 20, desde: 41, hasta: 60
  });
});

test('corrige valores inválidos o negativos', () => {
  const r = parsearPaginacion({ pagina: '-2', tamano: 'abc' });

  assert.equal(r.pagina, 1);
  assert.equal(r.tamano, TAMANO_POR_DEFECTO);
});

test('limita el tamaño de página al máximo permitido', () => {
  assert.equal(parsearPaginacion({ tamano: '100000' }).tamano, TAMANO_MAXIMO);
});
