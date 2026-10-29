const test = require('node:test');
const assert = require('node:assert/strict');
const { formatFechaBogota } = require('../shared/formatFecha');

test('devuelve un guion largo cuando no hay fecha', () => {
  assert.equal(formatFechaBogota(null), '—');
  assert.equal(formatFechaBogota(''), '—');
});

test('convierte un instante UTC a la hora de pared de Bogota (UTC-5), sin importar la zona horaria de la maquina que ejecuta el codigo', () => {
  const instanteUtc = '2024-06-15T13:30:00.000Z';

  const esperadoBogota = new Date(instanteUtc).toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Bogota'
  });
  const otraZonaDistinta = new Date(instanteUtc).toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Los_Angeles'
  });

  const resultado = formatFechaBogota(instanteUtc);

  assert.equal(resultado, esperadoBogota);
  assert.notEqual(resultado, otraZonaDistinta);
});
