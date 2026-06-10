/**
 * editor.js — Lógica de la interfaz de VibeBrace Studio
 * 
 * Responsabilidades:
 *   - Estado del patrón (array de pasos)
 *   - Comunicación con el servidor (fetch + WebSocket)
 *   - Renderizado de la lista de pasos
 *   - Dibujo del timeline en el canvas
 *   - Respuesta a eventos del usuario
 * 
 * Depende de pattern.js (debe cargarse antes en index.html).
 */

'use strict';

// ─── Estado ───────────────────────────────────────────────────────────────────

let steps     = [];      // array de pasos del patrón actual
let connected = false;   // true si hay conexión activa con el Arduino

// ─── Referencias al DOM ───────────────────────────────────────────────────────

const portSelect      = document.getElementById('portSelect');
const btnListPorts    = document.getElementById('btnListPorts');
const btnConnect      = document.getElementById('btnConnect');
const statusIndicator = document.getElementById('statusIndicator');
const btnSend         = document.getElementById('btnSend');
const btnStop         = document.getElementById('btnStop');
const btnSave         = document.getElementById('btnSave');
const btnLoad         = document.getElementById('btnLoad');
const fileInput       = document.getElementById('fileInput');
const btnAddStep      = document.getElementById('btnAddStep');
const btnClearSteps   = document.getElementById('btnClearSteps');
const btnClearLog     = document.getElementById('btnClearLog');
const stepList        = document.getElementById('stepList');
const stepCount       = document.getElementById('stepCount');
const logEl           = document.getElementById('log');
const canvas          = document.getElementById('timelineCanvas');
const ctx             = canvas.getContext('2d');
const stepKindSelect  = document.getElementById('stepKind');

// ─── Log ──────────────────────────────────────────────────────────────────────

function log(message, type = 'info') {
  const line = document.createElement('span');
  line.className = `log--${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}\n`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

btnClearLog.addEventListener('click', () => { logEl.innerHTML = ''; });

// ─── WebSocket ────────────────────────────────────────────────────────────────

const ws = new WebSocket(`ws://${location.host}`);

ws.addEventListener('open', () => {
  log('WebSocket conectado al servidor', 'info');
});

ws.addEventListener('message', (event) => {
  const msg = event.data.trim();
  log(`← ${msg}`, 'received');

  if (msg === 'DONE') {
    setPlaying(false);
    log('Secuencia completada', 'info');
  }

  if (msg.startsWith('ERR')) {
    log(`Error del firmware: ${msg}`, 'error');
    setPlaying(false);
  }

  if (msg === 'DISCONNECTED') {
    setConnected(false);
    log('Arduino desconectado', 'error');
  }
});

ws.addEventListener('close', () => {
  log('WebSocket cerrado — recargá la página si el servidor fue reiniciado', 'error');
});

// ─── Conexión ─────────────────────────────────────────────────────────────────

btnListPorts.addEventListener('click', async () => {
  try {
    const res  = await fetch('/ports');
    const data = await res.json();

    portSelect.innerHTML = '<option value="">— puerto —</option>';
    for (const p of data.ports) {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      portSelect.appendChild(opt);
    }

    log(`Puertos encontrados: ${data.ports.join(', ') || 'ninguno'}`, 'info');
  } catch (err) {
    log(`Error listando puertos: ${err.message}`, 'error');
  }
});

btnConnect.addEventListener('click', async () => {
  if (connected) {
    // Desconectar
    try {
      await fetch('/disconnect', { method: 'POST' });
      setConnected(false);
      log('Desconectado', 'info');
    } catch (err) {
      log(`Error al desconectar: ${err.message}`, 'error');
    }
    return;
  }

  const port = portSelect.value;
  if (!port) {
    log('Seleccioná un puerto antes de conectar', 'error');
    return;
  }

  try {
    const res  = await fetch('/connect', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ port })
    });
    const data = await res.json();

    if (data.error) {
      log(`Error al conectar: ${data.error}`, 'error');
    } else {
      setConnected(true);
      log(`Conectado a ${port}`, 'info');
    }
  } catch (err) {
    log(`Error al conectar: ${err.message}`, 'error');
  }
});

function setConnected(value) {
  connected = value;
  btnConnect.textContent   = value ? 'Desconectar' : 'Conectar';
  statusIndicator.className = value ? 'status status--on' : 'status status--off';
  btnSend.disabled          = !value || steps.length === 0;
  btnStop.disabled          = !value;
}

function setPlaying(value) {
  statusIndicator.className = value ? 'status status--busy' : (connected ? 'status status--on' : 'status status--off');
  btnSend.disabled          = value || !connected || steps.length === 0;
}

// ─── Enviar patrón ────────────────────────────────────────────────────────────

btnSend.addEventListener('click', async () => {
  if (steps.length === 0) {
    log('No hay pasos en la secuencia', 'error');
    return;
  }

  const lines = patternToLines(steps);
  log(`Enviando ${lines.length} líneas: ${lines.join(' | ')}`, 'sent');

  setPlaying(true);

  try {
    const res  = await fetch('/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ lines })
    });
    const data = await res.json();

    if (data.error) {
      log(`Error al enviar: ${data.error}`, 'error');
      setPlaying(false);
    }
  } catch (err) {
    log(`Error al enviar: ${err.message}`, 'error');
    setPlaying(false);
  }
});

btnStop.addEventListener('click', async () => {
  try {
    await fetch('/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ lines: ['STOP'] })
    });
    log('→ STOP', 'sent');
    setPlaying(false);
  } catch (err) {
    log(`Error al enviar STOP: ${err.message}`, 'error');
  }
});

// ─── Gestión de pasos ─────────────────────────────────────────────────────────

btnAddStep.addEventListener('click', () => {
  const { kind, params } = readFormParams();
  const step = { id: generateId(), kind, params };

  const error = validateStep(step);
  if (error) {
    log(`Parámetro inválido: ${error}`, 'error');
    return;
  }

  steps.push(step);
  renderStepList();
  drawTimeline();
  log(`Paso agregado: ${stepToSerial(step)}`, 'info');
});

btnClearSteps.addEventListener('click', () => {
  steps = [];
  renderStepList();
  drawTimeline();
  log('Lista de pasos limpiada', 'info');
});

function deleteStep(id) {
  steps = steps.filter(s => s.id !== id);
  renderStepList();
  drawTimeline();
}

function renderStepList() {
  stepCount.textContent = `(${steps.length})`;
  btnSend.disabled      = !connected || steps.length === 0;

  if (steps.length === 0) {
    stepList.innerHTML = '<li class="step-list__empty">No hay pasos. Agregá uno con el formulario.</li>';
    return;
  }

  stepList.innerHTML = '';
  steps.forEach((step) => {
    const li = document.createElement('li');
    li.className = 'step-item';
    li.innerHTML = `
      <span class="step-item__kind">${step.kind}</span>
      <span class="step-item__params">${stepToSerial(step)}</span>
      <button class="step-item__delete" title="Eliminar">×</button>
    `;
    li.querySelector('.step-item__delete').addEventListener('click', () => deleteStep(step.id));
    stepList.appendChild(li);
  });
}

// ─── Formulario: mostrar/ocultar parámetros según tipo ───────────────────────

stepKindSelect.addEventListener('change', () => {
  const kind = stepKindSelect.value;
  document.getElementById('paramsS').style.display       = kind === 'S'       ? '' : 'none';
  document.getElementById('paramsRAMP').style.display    = kind === 'RAMP'    ? '' : 'none';
  document.getElementById('paramsTREMOLO').style.display = kind === 'TREMOLO' ? '' : 'none';
  document.getElementById('paramsXFADE').style.display   = kind === 'XFADE'   ? '' : 'none';
});

// ─── Guardar / cargar ─────────────────────────────────────────────────────────

btnSave.addEventListener('click', () => {
  const name = prompt('Nombre del patrón:', 'mi-patron') || 'mi-patron';
  const json = savePattern(name, steps);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
  log(`Patrón guardado como "${name}.json"`, 'info');
});

btnLoad.addEventListener('click', () => { fileInput.click(); });

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const { name, steps: loaded } = loadPattern(ev.target.result);
      steps = loaded;
      renderStepList();
      drawTimeline();
      log(`Patrón "${name}" cargado (${steps.length} pasos)`, 'info');
    } catch (err) {
      log(`Error al cargar el archivo: ${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
  fileInput.value = ''; // permitir recargar el mismo archivo
});

// ─── Timeline (canvas) ────────────────────────────────────────────────────────

/**
 * Dibuja el patrón como bloques de intensidad en el canvas.
 * 
 * Eje X: tiempo (ms), proporcional al ancho del canvas.
 * Eje Y: intensidad del motor (0–255), proporcional a la mitad del alto.
 * 
 * Carril superior: Motor 1 (azul)
 * Carril inferior: Motor 2 (rosa)
 * 
 * Esta es la versión mínima — solo muestra pasos tipo S.
 * Los pasos RAMP, TREMOLO y XFADE se muestran como bloques sólidos
 * con su intensidad promedio hasta que se implemente la visualización detallada.
 */
function drawTimeline() {
  const W = canvas.width;
  const H = canvas.height;

  // Limpiar
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, W, H);

  if (steps.length === 0) {
    ctx.fillStyle = '#444466';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Agregá pasos para ver la secuencia', W / 2, H / 2);
    return;
  }

  const totalMs   = estimateDurationMs(steps);
  const laneH     = H / 2 - 4;  // alto de cada carril
  const msToX     = (ms) => (ms / totalMs) * W;

  let currentMs = 0;

  for (const step of steps) {
    const blockW = msToX(step.params.ms);

    // Calcular intensidades para representar en el canvas
    let d1 = 0, d2 = 0;

    switch (step.kind) {
      case 'S':
        d1 = step.params.d1;
        d2 = step.params.d2;
        break;
      case 'RAMP':
        // Mostrar rampa como gradiente horizontal
        d1 = step.params.m !== 2 ? (step.params.d0 + step.params.d1) / 2 : 0;
        d2 = step.params.m !== 1 ? (step.params.d0 + step.params.d1) / 2 : 0;
        break;
      case 'TREMOLO':
        d1 = step.params.m !== 2 ? step.params.base + step.params.depth / 2 : 0;
        d2 = step.params.m !== 1 ? step.params.base + step.params.depth / 2 : 0;
        break;
      case 'XFADE':
        d1 = step.params.duty / 2;
        d2 = step.params.duty / 2;
        break;
    }

    const x  = msToX(currentMs);
    const h1 = (d1 / 255) * laneH;
    const h2 = (d2 / 255) * laneH;

    // Motor 1 (carril superior, crece hacia arriba desde el centro)
    if (h1 > 0) {
      ctx.fillStyle = '#00b4d8cc';
      ctx.fillRect(x + 1, H / 2 - h1 - 2, blockW - 2, h1);
    }

    // Motor 2 (carril inferior, crece hacia abajo desde el centro)
    if (h2 > 0) {
      ctx.fillStyle = '#f72585cc';
      ctx.fillRect(x + 1, H / 2 + 2, blockW - 2, h2);
    }

    // Borde del bloque (separación visual)
    ctx.strokeStyle = '#ffffff22';
    ctx.strokeRect(x, 0, blockW, H);

    currentMs += step.params.ms;
  }

  // Línea central
  ctx.strokeStyle = '#ffffff33';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();

  // Etiqueta M1 / M2
  ctx.fillStyle = '#00b4d8';
  ctx.font      = '11px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('M1', 4, 14);

  ctx.fillStyle = '#f72585';
  ctx.fillText('M2', 4, H - 4);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

renderStepList();
drawTimeline();
log('VibeBrace Studio listo. Listá los puertos y conectá el Arduino.', 'info');
