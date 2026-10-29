const test = require('node:test');
const assert = require('node:assert/strict');
const { obtenerBasesPermitidas } = require('../src/bases/basesService');

const sql = { Int: 'Int' };

// Stub mínimo de un pool mssql: guarda la consulta e inputs recibidos
// y devuelve las filas indicadas.
function crearDbFalsa(filas) {
  const llamadas = [];
  return {
    llamadas,
    request() {
      const llamada = { inputs: {}, consulta: null };
      llamadas.push(llamada);
      const req = {
        input(nombre, _tipo, valor) { llamada.inputs[nombre] = valor; return req; },
        async query(consulta) { llamada.consulta = consulta; return { recordset: filas }; }
      };
      return req;
    }
  };
}

const BASES = [{ Id: 1, NombreBD: 'A' }, { Id: 2, NombreBD: 'B' }];

test('un administrador recibe todas las bases activas, sin importar IdsBaseDatos', async () => {
  const db = crearDbFalsa(BASES);
  const r = await obtenerBasesPermitidas(db, sql, { Actor: 'A5', IdsBaseDatos: '' });

  assert.deepEqual(r, BASES);
  assert.equal(db.llamadas.length, 1);
  assert.match(db.llamadas[0].consulta, /Estado = 1/);
  assert.doesNotMatch(db.llamadas[0].consulta, /IN \(/);
});

test('un operador recibe solo sus bases asignadas', async () => {
  const db = crearDbFalsa([BASES[1]]);
  const r = await obtenerBasesPermitidas(db, sql, { Actor: 'A2', IdsBaseDatos: '2, 7' });

  assert.deepEqual(r, [BASES[1]]);
  assert.match(db.llamadas[0].consulta, /IN \(@id0,@id1\)/);
  assert.deepEqual(db.llamadas[0].inputs, { id0: 2, id1: 7 });
});

test('un operador sin bases asignadas no consulta la BD y recibe lista vacía', async () => {
  const db = crearDbFalsa(BASES);
  const r = await obtenerBasesPermitidas(db, sql, { Actor: 'A2', IdsBaseDatos: null });

  assert.deepEqual(r, []);
  assert.equal(db.llamadas.length, 0);
});
