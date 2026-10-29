const test = require('node:test');
const assert = require('node:assert/strict');
const { construirFiltroAsistencias, aplicarFiltroAsistencias } = require('../src/asistencias/filtrosAsistencias');

// Stub de tipos mssql: solo necesitamos que sean valores distinguibles,
// no la implementación real del driver.
const sql = { DateTime: 'DateTime', Int: 'Int' };

test('sin filtros, produce WHERE 1=1 sin inputs', () => {
  const { where, inputs } = construirFiltroAsistencias({}, sql);

  assert.equal(where, 'WHERE 1=1');
  assert.deepEqual(inputs, []);
});

test('aplica fechaInicio y fechaFin con horas de inicio/fin de día', () => {
  const { where, inputs } = construirFiltroAsistencias(
    { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' },
    sql
  );

  assert.match(where, /a\.Fecha >= @fechaInicio/);
  assert.match(where, /a\.Fecha <= @fechaFin/);

  // new Date('YYYY-MM-DDTHH:mm:ss') se interpreta en hora local de la
  // máquina (igual que hacía el código original antes de extraerlo), así
  // que comparamos por componentes locales en vez de toISOString().
  const fechaInicio = inputs.find((i) => i.nombre === 'fechaInicio').valor;
  const fechaFin = inputs.find((i) => i.nombre === 'fechaFin').valor;

  assert.deepEqual(
    [fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate(), fechaInicio.getHours(), fechaInicio.getMinutes(), fechaInicio.getSeconds()],
    [2026, 0, 1, 0, 0, 0]
  );
  assert.deepEqual(
    [fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate(), fechaFin.getHours(), fechaFin.getMinutes(), fechaFin.getSeconds()],
    [2026, 0, 31, 23, 59, 59]
  );
});

test('ignora idUsuario e idBaseDatos no numéricos', () => {
  const { where, inputs } = construirFiltroAsistencias(
    { idUsuario: 'abc', idBaseDatos: 'xyz' },
    sql
  );

  assert.equal(where, 'WHERE 1=1');
  assert.deepEqual(inputs, []);
});

test('aplica idUsuario e idBaseDatos numéricos', () => {
  const { where, inputs } = construirFiltroAsistencias(
    { idUsuario: '7', idBaseDatos: '3' },
    sql
  );

  assert.match(where, /a\.IdUsuario = @idUsuario/);
  assert.match(where, /a\.IdBaseDatos = @idBaseDatos/);
  assert.deepEqual(inputs.map((i) => [i.nombre, i.valor]), [
    ['idUsuario', 7],
    ['idBaseDatos', 3]
  ]);
});

test('aplicarFiltroAsistencias invoca .input() por cada filtro construido', () => {
  const { inputs } = construirFiltroAsistencias({ idUsuario: '7' }, sql);

  const llamadas = [];
  const requestFalso = { input: (...args) => llamadas.push(args) };

  aplicarFiltroAsistencias(requestFalso, inputs);

  assert.deepEqual(llamadas, [['idUsuario', sql.Int, 7]]);
});
