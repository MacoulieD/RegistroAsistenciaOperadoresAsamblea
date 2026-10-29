const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { resolveEnvFile } = require('../src/shared/config/envFile');

function crearDirTemporal() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envfile-test-'));
}

test('usa .env.<NODE_ENV> cuando existe', () => {
  const dir = crearDirTemporal();
  fs.writeFileSync(path.join(dir, '.env'), 'A=1');
  fs.writeFileSync(path.join(dir, '.env.test'), 'A=2');

  const resultado = resolveEnvFile(dir, 'test');

  assert.equal(resultado, path.join(dir, '.env.test'));
});

test('cae de nuevo a .env cuando .env.<NODE_ENV> no existe', () => {
  const dir = crearDirTemporal();
  fs.writeFileSync(path.join(dir, '.env'), 'A=1');

  const resultado = resolveEnvFile(dir, 'test');

  assert.equal(resultado, path.join(dir, '.env'));
});

test('usa .env cuando NODE_ENV no esta definido', () => {
  const dir = crearDirTemporal();
  fs.writeFileSync(path.join(dir, '.env'), 'A=1');

  const resultado = resolveEnvFile(dir, undefined);

  assert.equal(resultado, path.join(dir, '.env'));
});
