
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const patternPath = path.join(__dirname, 'pattern.js');
const source = fs.readFileSync(patternPath, 'utf8');

const context = {};
vm.createContext(context);
vm.runInContext(source, context);

test('Genera la estructura básica de Arduino', () => {
  const code = context.patternToArduinoCode('Prueba', [
    { kind: 'S', params: { d1: 200, d2: 200, ms: 500 } }
  ]);

  assert.match(code, /void setup\(\)/);
  assert.match(code, /void loop\(\)/);
  assert.match(code, /Serial\.begin\(115200\)/);
});

test('Incluye los comandos de la secuencia', () => {
  const code = context.patternToArduinoCode('Prueba', [
    { kind: 'S', params: { d1: 200, d2: 200, ms: 500 } }
  ]);

  assert.match(code, /Serial\.println\("CLR"\)/);
  assert.match(code, /Serial\.println\("S,200,200,500"\)/);
  assert.match(code, /Serial\.println\("RUN"\)/);
});

test('Calcula correctamente el tiempo de espera', () => {
  const code = context.patternToArduinoCode('Prueba', [
    { kind: 'S', params: { d1: 200, d2: 200, ms: 500 } }
  ]);

  assert.match(code, /delay\(700\)/);
});

test('Incluye el nombre del patrón', () => {
  const code = context.patternToArduinoCode('Mi prueba', []);

  assert.match(code, /Mi prueba/);
});

test('Escapa las comillas del nombre', () => {
  const code = context.patternToArduinoCode('Mi "prueba"', []);

  assert.match(code, /Mi \\"prueba\\"/);
});

test('Rechaza pasos que no sean un array', () => {
  assert.throws(
    () => context.patternToArduinoCode('Prueba', null),
    /array/
  );
});
