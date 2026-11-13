
/**
 * editor.js — Lógica de la interfaz de VibeBrace Studio
 */

'use strict';

// ─── Estado ───────────────────────────────────────────────────────────────────

let steps = [];
let connected = false;

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

// Elementos de la biblioteca de presets
const presetNameInput = document.getElementById('presetName');
const btnSavePreset   = document.getElementById('btnSavePreset');
const presetList      = document.getElementById('presetList');

const PRESETS_KEY = 'vibebrace-presets';

let presets = [];

// ─── Log ──────────────────────────────────────────────────────────────────────

function log(message, type = 'info') {
  const line = document.createElement('span');
  line.className = `log--${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}\n`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

btnClearLog.addEventListener('click', () => {
  logEl.innerHTML = '';
});

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
    const res = await fetch('/ports');
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
    const res = await fetch('/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port })
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
  btnConnect.textContent = value ? 'Desconectar' : 'Conectar';
  statusIndicator.className = value ? 'status status--on' : 'status status--off';
  btnSend.disabled = !value || steps.length === 0;
  btnStop.disabled = !value;
}

function setPlaying(value) {
  statusIndicator.className = value
    ? 'status status--busy'
    : (connected ? 'status status--on' : 'status status--off');

  btnSend.disabled = value || !connected || steps.length === 0;
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
    const res = await fetch('/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines })
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: ['STOP'] })
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
  btnSend.disabled = !connected || steps.length === 0;

  if (steps.length === 0) {
    stepList.innerHTML = '<li class="step-list__empty">No hay pasos. Agregá uno con el formulario.</li>';
    return;
  }

  stepList.innerHTML = '';

  steps.forEach((step) => {
    const li = document.createElement('li');
    li.className = 'step-item';

    const kind = document.createElement('span');
    kind.className = 'step-item__kind';
    kind.textContent = step.kind;

    const params = document.createElement('span');
    params.className = 'step-item__params';
    params.textContent = stepToSerial(step);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'step-item__delete';
    deleteButton.title = 'Eliminar';
    deleteButton.textContent = '×';
    deleteButton.addEventListener('click', () => deleteStep(step.id));

    li.append(kind, params, deleteButton);
    stepList.appendChild(li);
  });
}

// ─── Biblioteca de presets ────────────────────────────────────────────────────

function cloneSteps(source) {
  return JSON.parse(JSON.stringify(source));
}

function persistPresets() {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    return true;
  } catch (err) {
    log(`No se pudieron guardar los presets: ${err.message}`, 'error');
    return false;
  }
}

function restorePresets() {
  try {
    const saved = localStorage.getItem(PRESETS_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);
      presets = Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    presets = [];
    log('No se pudieron recuperar los presets guardados.', 'error');
  }

  renderPresetList();
}

function renderPresetList() {
  presetList.innerHTML = '';

  if (presets.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'step-list__empty';
    empty.textContent = 'Todavía no hay presets guardados.';
    presetList.appendChild(empty);
    return;
  }

  presets.forEach((preset) => {
    const li = document.createElement('li');
    li.className = 'step-item';

    const name = document.createElement('span');
    name.className = 'step-item__kind';
    name.textContent = preset.name;

    const loadButton = document.createElement('button');
    loadButton.textContent = 'Cargar';
    loadButton.addEventListener('click', () => loadPreset(preset.id));

    const deleteButton = document.createElement('button');
    deleteButton.className = 'step-item__delete';
    deleteButton.title = 'Eliminar preset';
    deleteButton.textContent = '×';
    deleteButton.addEventListener('click', () => deletePreset(preset.id));

    li.append(name, loadButton, deleteButton);
    presetList.appendChild(li);
  });
}

function savePreset() {
  const name = presetNameInput.value.trim();

  if (!name) {
    log('Escribí un nombre para el preset.', 'error');
    presetNameInput.focus();
    return;
  }

  if (steps.length === 0) {
    log('Agregá al menos un paso antes de guardar un preset.', 'error');
    return;
  }

  const preset = {
    id: generateId(),
    name,
    steps: cloneSteps(steps),
    savedAt: new Date().toISOString()
  };

  presets.push(preset);

  if (persistPresets()) {
    renderPresetList();
    presetNameInput.value = '';
    log(`Preset "${name}" guardado correctamente.`, 'info');
  } else {
    presets.pop();
  }
}

function loadPreset(id) {
  const preset = presets.find(item => item.id === id);

  if (!preset) {
    log('No se encontró ese preset.', 'error');
    return;
  }

  steps = cloneSteps(preset.steps);
  renderStepList();
  drawTimeline();

  log(`Preset "${preset.name}" cargado (${steps.length} pasos).`, 'info');
}

function deletePreset(id) {
  const preset = presets.find(item => item.id === id);

  if (!preset) return;

  presets = presets.filter(item => item.id !== id);

  if (persistPresets()) {
    renderPresetList();
    log(`Preset "${preset.name}" eliminado.`, 'info');
  }
}

btnSavePreset.addEventListener('click', savePreset);

presetNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    savePreset();
  }
});

// ─── Formulario: mostrar/ocultar parámetros según tipo ───────────────────────

stepKindSelect.addEventListener('change', () => {
  const kind = stepKindSelect.value;

  document.getElementById('paramsS').style.display =
    kind === 'S' ? '' : 'none';

  document.getElementById('paramsRAMP').style.display =
    kind === 'RAMP' ? '' : 'none';

  document.getElementById('paramsTREMOLO').style.display =
    kind === 'TREMOLO' ? '' : 'none';

  document.getElementById('paramsXFADE').style.display =
    kind === 'XFADE' ? '' : 'none';
});

// ─── Guardar / cargar archivos JSON ──────────────────────────────────────────

btnSave.addEventListener('click', () => {
  const name = prompt('Nombre del patrón:', 'mi-patron') || 'mi-patron';
  const json = savePattern(name, steps);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `${name}.json`;
  a.click();

  URL.revokeObjectURL(url);
  log(`Patrón guardado como "${name}.json"`, 'info');
});

btnLoad.addEventListener('click', () => {
  fileInput.click();
});

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
  fileInput.value = '';
});

// ─── Timeline (canvas) ────────────────────────────────────────────────────────

function drawTimeline() {
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, W, H);

  if (steps.length === 0) {
    ctx.fillStyle = '#444466';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Agregá pasos para ver la secuencia', W / 2, H / 2);
    return;
  }

  const totalMs = estimateDurationMs(steps);
  const laneH = H / 2 - 4;
  const msToX = (ms) => (ms / totalMs) * W;

  let currentMs = 0;

  for (const step of steps) {
    const blockW = msToX(step.params.ms);

    let d1 = 0;
    let d2 = 0;

    switch (step.kind) {
      case 'S':
        d1 = step.params.d1;
        d2 = step.params.d2;
        break;

      case 'RAMP':
        d1 = step.params.m !== 2
          ? (step.params.d0 + step.params.d1) / 2 : 0;
        d2 = step.params.m !== 1
          ? (step.params.d0 + step.params.d1) / 2 : 0;
        break;

      case 'TREMOLO':
        d1 = step.params.m !== 2
          ? step.params.base + step.params.depth / 2 : 0;
        d2 = step.params.m !== 1
          ? step.params.base + step.params.depth / 2 : 0;
        break;

      case 'XFADE':
        d1 = step.params.duty / 2;
        d2 = step.params.duty / 2;
        break;
    }

    const x = msToX(currentMs);
    const h1 = (d1 / 255) * laneH;
    const h2 = (d2 / 255) * laneH;

    if (h1 > 0) {
      ctx.fillStyle = '#00b4d8cc';
      ctx.fillRect(x + 1, H / 2 - h1 - 2, blockW - 2, h1);
    }

    if (h2 > 0) {
      ctx.fillStyle = '#f72585cc';
      ctx.fillRect(x + 1, H / 2 + 2, blockW - 2, h2);
    }

    ctx.strokeStyle = '#ffffff22';
    ctx.strokeRect(x, 0, blockW, H);

    currentMs += step.params.ms;
  }

  ctx.strokeStyle = '#ffffff33';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();

  ctx.fillStyle = '#00b4d8';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('M1', 4, 14);

  ctx.fillStyle = '#f72585';
  ctx.fillText('M2', 4, H - 4);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

restorePresets();
renderStepList();
drawTimeline();

log('VibeBrace Studio listo. Listá los puertos y conectá el Arduino.', 'info');
