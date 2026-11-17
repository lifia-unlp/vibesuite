
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

// ─── Pruebas de exportación Arduino ───────────────────────────

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

// ─── Pruebas de carga de patrones JSON ────────────────────────

test('Carga correctamente un patrón válido', () => {
  const json = JSON.stringify({
    version: 1,
    name: 'Mi patrón',
    steps: [
      { kind: 'S', params: { d1: 120, d2: 80, ms: 500 } }
    ]
  });

  const result = context.loadPattern(json);

  assert.equal(result.name, 'Mi patrón');
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].kind, 'S');
});

test('Rechaza un archivo JSON mal formado', () => {
  assert.throws(
    () => context.loadPattern('{ esto no es JSON }'),
    /JSON válido/
  );
});

test('Rechaza contenido JSON nulo', () => {
  assert.throws(
    () => context.loadPattern('null'),
    /contenido del archivo/
  );
});

test('Rechaza archivos sin un array de pasos', () => {
  assert.throws(
    () => context.loadPattern('{"name":"Prueba"}'),
    /steps/
  );
});

test('Rechaza pasos con formato inválido', () => {
  const json = JSON.stringify({
    name: 'Prueba',
    steps: [null]
  });

  assert.throws(
    () => context.loadPattern(json),
    /Paso 1/
  );
});

test('Rechaza tipos de paso desconocidos', () => {
  const json = JSON.stringify({
    name: 'Prueba',
    steps: [
      { kind: 'DESCONOCIDO', params: {} }
    ]
  });

  assert.throws(
    () => context.loadPattern(json),
    /tipo desconocido/
  );
});

test('Rechaza parámetros faltantes', () => {
  const json = JSON.stringify({
    name: 'Prueba',
    steps: [
      { kind: 'S', params: { d1: 100 } }
    ]
  });

  assert.throws(
    () => context.loadPattern(json),
    /parámetro/
  );
});

test('Rechaza valores fuera de rango', () => {
  const json = JSON.stringify({
    name: 'Prueba',
    steps: [
      { kind: 'S', params: { d1: 300, d2: 100, ms: 500 } }
    ]
  });

  assert.throws(
    () => context.loadPattern(json),
    /entre 0 y 255/
  );
});
