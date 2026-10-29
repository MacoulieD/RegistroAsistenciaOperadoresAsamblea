const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularPaginasVisibles } = require('../shared/paginasVisibles');

test('con pocas páginas las muestra todas', () => {
  assert.deepEqual(calcularPaginasVisibles(1, 1), [1]);
  assert.deepEqual(calcularPaginasVisibles(3, 7), [1, 2, 3, 4, 5, 6, 7]);
});

test('en medio de muchas páginas muestra primera, vecinas y última', () => {
  assert.deepEqual(calcularPaginasVisibles(7, 20), [1, '…', 6, 7, 8, '…', 20]);
});

test('cerca del inicio no pone "…" a la izquierda', () => {
  assert.deepEqual(calcularPaginasVisibles(1, 20), [1, 2, '…', 20]);
  assert.deepEqual(calcularPaginasVisibles(2, 20), [1, 2, 3, '…', 20]);
});

test('cerca del final no pone "…" a la derecha', () => {
  assert.deepEqual(calcularPaginasVisibles(20, 20), [1, '…', 19, 20]);
  assert.deepEqual(calcularPaginasVisibles(19, 20), [1, '…', 18, 19, 20]);
});

test('si el hueco es de una sola página, muestra el número en vez de "…"', () => {
  assert.deepEqual(calcularPaginasVisibles(4, 20), [1, 2, 3, 4, 5, '…', 20]);
  assert.deepEqual(calcularPaginasVisibles(17, 20), [1, '…', 16, 17, 18, 19, 20]);
});

test('sin páginas devuelve solo la 1', () => {
  assert.deepEqual(calcularPaginasVisibles(1, 0), [1]);
});
