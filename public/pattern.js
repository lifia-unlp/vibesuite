
/**
 * pattern.js - Modelo de datos de VibeBrace Studio
 *
 * Funciones puras: no tocan el DOM, no llaman al servidor.
 */

'use strict';

// ─── stepToSerial ─────────────────────────────────────────────

function stepToSerial(step) {
  const p = step.params;

  switch (step.kind) {
    case 'S':
      return `S,${p.d1},${p.d2},${p.ms}`;

    case 'RAMP':
      return `RAMP,${p.m},${p.d0},${p.d1},${p.ms},${p.steps}`;

    case 'TREMOLO':
      return `TREMOLO,${p.m},${p.base},${p.depth},${p.rate},${p.ms}`;

    case 'XFADE':
      return `XFADE,${p.duty},${p.ms},${p.steps}`;

    default:
      throw new Error(`Tipo de paso desconocido: "${step.kind}"`);
  }
}

// ─── patternToLines ───────────────────────────────────────────

function patternToLines(steps) {
  const lines = ['CLR'];

  for (const step of steps) {
    lines.push(stepToSerial(step));
  }

  lines.push('RUN');
  return lines;
}

// ─── validateStep ─────────────────────────────────────────────

function validateStep(step) {
  if (!step || typeof step !== 'object' || Array.isArray(step)) {
    return 'El paso debe ser un objeto válido';
  }

  if (!step.params || typeof step.params !== 'object' || Array.isArray(step.params)) {
    return 'Faltan los parámetros del paso';
  }

  const p = step.params;

  function inRange(val, min, max, name) {
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      return `${name} debe ser un número`;
    }

    if (val < min || val > max) {
      return `${name} debe estar entre ${min} y ${max} (recibido: ${val})`;
    }

    return null;
  }

  switch (step.kind) {
    case 'S':
      return inRange(p.d1, 0, 255, 'Motor 1')
          || inRange(p.d2, 0, 255, 'Motor 2')
          || inRange(p.ms, 5, 20000, 'Duración');

    case 'RAMP':
      return inRange(p.m, 1, 3, 'Motor')
          || inRange(p.d0, 0, 255, 'Intensidad inicial')
          || inRange(p.d1, 0, 255, 'Intensidad final')
          || inRange(p.ms, 5, 20000, 'Duración')
          || inRange(p.steps, 2, 48, 'Pasos');

    case 'TREMOLO':
      return inRange(p.m, 1, 3, 'Motor')
          || inRange(p.base, 0, 255, 'Base')
          || inRange(p.depth, 0, 255, 'Depth')
          || inRange(p.rate, 1, 50, 'Rate')
          || inRange(p.ms, 50, 5000, 'Duración');

    case 'XFADE':
      return inRange(p.duty, 0, 255, 'Intensidad')
          || inRange(p.ms, 5, 20000, 'Duración')
          || inRange(p.steps, 2, 48, 'Pasos');

    default:
      return `Tipo desconocido: "${step.kind}"`;
  }
}

// ─── estimateDurationMs ───────────────────────────────────────

function estimateDurationMs(steps) {
  return steps.reduce(
    (total, step) => total + Number(step.params.ms || 0),
    0
  );
}

// ─── Guardar y cargar ─────────────────────────────────────────

function savePattern(name, steps) {
  const data = {
    version: 1,
    name: name || 'sin nombre',
    savedAt: new Date().toISOString(),
    steps: steps
  };

  return JSON.stringify(data, null, 2);
}

function loadPattern(json) {
  let data;

  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error('El archivo no es JSON válido');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('El contenido del archivo no es válido');
  }

  if (!Array.isArray(data.steps)) {
    throw new Error('El archivo no tiene un campo "steps" válido');
  }

  const requiredParams = {
    S: ['d1', 'd2', 'ms'],
    RAMP: ['m', 'd0', 'd1', 'ms', 'steps'],
    TREMOLO: ['m', 'base', 'depth', 'rate', 'ms'],
    XFADE: ['duty', 'ms', 'steps']
  };

  data.steps.forEach((step, index) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      throw new Error(`Paso ${index + 1}: formato inválido`);
    }

    if (!requiredParams[step.kind]) {
      throw new Error(`Paso ${index + 1}: tipo desconocido`);
    }

    if (!step.params || typeof step.params !== 'object' || Array.isArray(step.params)) {
      throw new Error(`Paso ${index + 1}: faltan los parámetros`);
    }

    for (const param of requiredParams[step.kind]) {
      if (!Number.isFinite(step.params[param])) {
        throw new Error(`Paso ${index + 1}: parámetro "${param}" inválido`);
      }
    }

    const error = validateStep(step);

    if (error) {
      throw new Error(`Paso ${index + 1}: ${error}`);
    }
  });

  return {
    name: data.name || 'importado',
    steps: data.steps
  };
}

// ─── Helpers internos ─────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function readFormParams() {
  const kind = document.getElementById('stepKind').value;
  const num = (id) => Number(document.getElementById(id).value);

  switch (kind) {
    case 'S':
      return { kind, params: { d1: num('s_d1'), d2: num('s_d2'), ms: num('s_ms') } };

    case 'RAMP':
      return { kind, params: { m: num('ramp_m'), d0: num('ramp_d0'), d1: num('ramp_d1'), ms: num('ramp_ms'), steps: num('ramp_steps') } };

    case 'TREMOLO':
      return { kind, params: { m: num('tr_m'), base: num('tr_base'), depth: num('tr_depth'), rate: num('tr_rate'), ms: num('tr_ms') } };

    case 'XFADE':
      return { kind, params: { duty: num('xf_duty'), ms: num('xf_ms'), steps: num('xf_steps') } };

    default:
      throw new Error(`Tipo desconocido: "${kind}"`);
  }
}

// ─── Exportación Arduino ───────────────────────────────────────

function patternToArduinoCode(name, steps) {
  if (!Array.isArray(steps)) {
    throw new Error('Los pasos deben ser un array');
  }

  const safeName = String(name || 'Sin nombre')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]/g, ' ');

  const commands = patternToLines(steps);
  const duration = estimateDurationMs(steps);
  const lines = [];

  lines.push(`// Patrón: "${safeName}"`);
  lines.push('// Generado por VibeBrace Studio');
  lines.push('');
  lines.push('void setup() {');
  lines.push('  Serial.begin(115200);');
  lines.push('}');
  lines.push('');
  lines.push('void loop() {');
  lines.push('  // Enviar secuencia');

  for (const command of commands) {
    lines.push(`  Serial.println("${command}");`);
    lines.push('  delay(20);');
  }

  lines.push('');
  lines.push(`  // Esperar a que termine (estimado: ${duration} ms)`);
  lines.push(`  delay(${duration + 200});`);
  lines.push('}');

  return lines.join('\n') + '\n';
}
