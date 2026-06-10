/**
 * pattern.js — Modelo de datos de VibeBrace Studio
 * 
 * Funciones puras: no tocan el DOM, no llaman al servidor.
 * Convierten pasos (objetos JS) a líneas de texto que entiende el firmware.
 * 
 * Este archivo es el más importante del proyecto.
 * Cada función debe tener tests en pattern.test.js.
 */

'use strict';

// ─── Tipos ────────────────────────────────────────────────────────────────────
//
// Un paso tiene la forma:
// {
//   id:     string,         // identificador único (Date.now() + random)
//   kind:   'S'|'RAMP'|'TREMOLO'|'XFADE',
//   params: { [key]: number }
// }
//
// Los nombres de los parámetros coinciden con los del formulario HTML.

// ─── stepToSerial ─────────────────────────────────────────────────────────────

/**
 * Convierte un paso a la línea de texto que espera el firmware.
 * 
 * Ejemplos:
 *   stepToSerial({ kind: 'S',      params: { d1:200, d2:200, ms:500 } })
 *     → "S,200,200,500"
 * 
 *   stepToSerial({ kind: 'RAMP',   params: { m:3, d0:0, d1:200, ms:1000, steps:16 } })
 *     → "RAMP,3,0,200,1000,16"
 * 
 *   stepToSerial({ kind: 'TREMOLO', params: { m:1, base:120, depth:80, rate:5, ms:1000 } })
 *     → "TREMOLO,1,120,80,5,1000"
 * 
 *   stepToSerial({ kind: 'XFADE', params: { duty:200, ms:1000, steps:12 } })
 *     → "XFADE,200,1000,12"
 * 
 * @param {object} step
 * @returns {string}
 */
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

// ─── patternToLines ───────────────────────────────────────────────────────────

/**
 * Convierte un array de pasos a un array de líneas listas para enviar.
 * Incluye CLR al inicio y RUN al final.
 * 
 * Ejemplo:
 *   patternToLines([
 *     { kind: 'S', params: { d1:200, d2:200, ms:500 } },
 *     { kind: 'S', params: { d1:0,   d2:0,   ms:200 } }
 *   ])
 *   → ["CLR", "S,200,200,500", "S,0,0,200", "RUN"]
 * 
 * @param {object[]} steps
 * @returns {string[]}
 */
function patternToLines(steps) {
  const lines = ['CLR'];
  for (const step of steps) {
    lines.push(stepToSerial(step));
  }
  lines.push('RUN');
  return lines;
}

// ─── validateStep ─────────────────────────────────────────────────────────────

/**
 * Valida los parámetros de un paso.
 * Devuelve null si está bien, o un string con el mensaje de error.
 * 
 * @param {object} step
 * @returns {string|null}
 */
function validateStep(step) {
  const p = step.params;

  // Helper: verificar que un valor está en rango [min, max]
  function inRange(val, min, max, name) {
    const n = Number(val);
    if (isNaN(n))           return `${name} debe ser un número`;
    if (n < min || n > max) return `${name} debe estar entre ${min} y ${max} (recibido: ${n})`;
    return null;
  }

  switch (step.kind) {
    case 'S': {
      return inRange(p.d1, 0, 255, 'Motor 1')
          || inRange(p.d2, 0, 255, 'Motor 2')
          || inRange(p.ms, 5, 20000, 'Duración');
    }

    case 'RAMP': {
      return inRange(p.m, 1, 3, 'Motor')
          || inRange(p.d0, 0, 255, 'Intensidad inicial')
          || inRange(p.d1, 0, 255, 'Intensidad final')
          || inRange(p.ms, 5, 20000, 'Duración')
          || inRange(p.steps, 2, 48, 'Pasos');
    }

    case 'TREMOLO': {
      return inRange(p.m, 1, 3, 'Motor')
          || inRange(p.base, 0, 255, 'Base')
          || inRange(p.depth, 0, 255, 'Depth')
          || inRange(p.rate, 1, 50, 'Rate')
          || inRange(p.ms, 50, 5000, 'Duración');
    }

    case 'XFADE': {
      return inRange(p.duty, 0, 255, 'Intensidad')
          || inRange(p.ms, 5, 20000, 'Duración')
          || inRange(p.steps, 2, 48, 'Pasos');
    }

    default:
      return `Tipo desconocido: "${step.kind}"`;
  }
}

// ─── estimateDurationMs ───────────────────────────────────────────────────────

/**
 * Estima la duración total de un array de pasos en milisegundos.
 * Para RAMP y XFADE usa el parámetro ms directamente.
 * Para TREMOLO también.
 * 
 * @param {object[]} steps
 * @returns {number}
 */
function estimateDurationMs(steps) {
  return steps.reduce((total, step) => total + Number(step.params.ms || 0), 0);
}

// ─── Guardar y cargar ─────────────────────────────────────────────────────────

/**
 * Serializa un patrón a JSON string para guardar en archivo.
 * 
 * @param {string}   name
 * @param {object[]} steps
 * @returns {string}
 */
function savePattern(name, steps) {
  const data = {
    version: 1,
    name:    name || 'sin nombre',
    savedAt: new Date().toISOString(),
    steps:   steps
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Parsea un JSON string y devuelve { name, steps }.
 * Lanza un Error si el formato es inválido.
 * 
 * @param {string} json
 * @returns {{ name: string, steps: object[] }}
 */
function loadPattern(json) {
  let data;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error('El archivo no es JSON válido');
  }

  if (!Array.isArray(data.steps)) {
    throw new Error('El archivo no tiene un campo "steps" válido');
  }

  return { name: data.name || 'importado', steps: data.steps };
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Genera un ID único para un paso.
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Lee los parámetros del formulario HTML para el tipo de paso seleccionado.
 * Devuelve un objeto { kind, params } listo para usar.
 * 
 * Esta función es el puente entre el formulario y el modelo de datos.
 * Depende del DOM — solo llamar desde editor.js, no testear directamente.
 * 
 * @returns {{ kind: string, params: object }}
 */
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
