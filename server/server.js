
/**
 * VibeBrace Studio — Servidor
 *
 * API HTTP + WebSocket para comunicarse con Arduino por USB.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// ─── Configuración ────────────────────────────────────────────

const PORT = 3000;
const BAUD_RATE = 115200;
const LINE_DELAY_MS = 8;

// ─── Estado del servidor ───────────────────────────────────────

let serialPort = null;
let wsClients = new Set();

// ─── Express ──────────────────────────────────────────────────

const app = express();

app.use(express.json());

// Servir los archivos de la interfaz web.
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── WebSocket ────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log(`[WS] Cliente conectado (total: ${wsClients.size})`);

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[WS] Cliente desconectado (total: ${wsClients.size})`);
  });
});

function broadcast(message) {
  for (const ws of wsClients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

// ─── Endpoints HTTP ───────────────────────────────────────────

/**
 * GET /ports
 * Lista los puertos serie disponibles.
 */
app.get('/ports', async (req, res) => {
  try {
    const all = await SerialPort.list();
    const ports = all.map(p => p.path);

    res.json({ ports });
  } catch (err) {
    console.error('[/ports]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /connect
 * Conecta con Arduino.
 */
app.post('/connect', (req, res) => {
  const portPath = req.body.port;

  if (!portPath) {
    return res.status(400).json({
      error: 'Falta el campo "port"'
    });
  }

  if (serialPort && serialPort.isOpen) {
    return res.status(400).json({
      error: 'Ya hay una conexión activa. Desconectá primero.'
    });
  }

  try {
    serialPort = new SerialPort({
      path: portPath,
      baudRate: BAUD_RATE
    });

    const parser = serialPort.pipe(
      new ReadlineParser({ delimiter: '\n' })
    );

    parser.on('data', (line) => {
      const msg = line.trim();

      console.log(`[Arduino →] ${msg}`);
      broadcast(msg);
    });

    serialPort.on('error', (err) => {
      console.error('[Serial error]', err.message);
      broadcast(`ERR ${err.message}`);
    });

    serialPort.on('close', () => {
      console.log('[Serial] Puerto cerrado');
      broadcast('DISCONNECTED');
      serialPort = null;
    });

    console.log(`[Serial] Conectado a ${portPath} @ ${BAUD_RATE} baud`);

    res.json({ ok: true });

  } catch (err) {
    console.error('[/connect]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /disconnect
 * Desconecta Arduino.
 */
app.post('/disconnect', (req, res) => {
  if (!serialPort || !serialPort.isOpen) {
    return res.status(400).json({
      error: 'No hay conexión activa'
    });
  }

  serialPort.close((err) => {
    if (err) {
      console.error('[/disconnect]', err.message);
      return res.status(500).json({ error: err.message });
    }

    res.json({ ok: true });
  });
});

/**
 * POST /send
 * Envía líneas de comandos al Arduino.
 */
app.post('/send', (req, res) => {
  const lines = req.body.lines;

  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({
      error: 'Falta el campo "lines" (array de strings)'
    });
  }

  if (!serialPort || !serialPort.isOpen) {
    return res.status(400).json({
      error: 'No hay conexión activa. Conectá el Arduino primero.'
    });
  }

  for (const line of lines) {
    if (typeof line !== 'string' || line.trim() === '') {
      return res.status(400).json({
        error: `Línea inválida: ${JSON.stringify(line)}`
      });
    }
  }

  res.json({
    ok: true,
    count: lines.length
  });

  sendLinesWithDelay(lines, 0);
});

// ─── Manejador de errores ─────────────────────────────────────

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[JSON inválido]', err.message);

    return res.status(400).json({
      error: 'El cuerpo JSON enviado no es válido'
    });
  }

  console.error('[Error del servidor]', err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Error interno del servidor'
  });
});

// ─── Envío serial ──────────────────────────────────────────────

function sendLinesWithDelay(lines, index) {
  if (index >= lines.length) return;

  if (!serialPort || !serialPort.isOpen) {
    console.error('[Serial] Conexión perdida durante el envío');
    broadcast('DISCONNECTED');
    return;
  }

  const line = lines[index].trim();

  console.log(`[→ Arduino] ${line}`);

  serialPort.write(line + '\n', (err) => {
    if (err) {
      console.error('[Serial write error]', err.message);
      broadcast(`ERR ${err.message}`);
      return;
    }

    setTimeout(() => {
      sendLinesWithDelay(lines, index + 1);
    }, LINE_DELAY_MS);
  });
}

// ─── Iniciar servidor ─────────────────────────────────────────

server.listen(PORT, () => {
  console.log('');
  console.log('  VibeBrace Studio');
  console.log(`  Corriendo en http://localhost:${PORT}`);
  console.log('');
  console.log('  Abrí esa URL en Chrome o Firefox para usar la app.');
  console.log('  Para detener el servidor: Ctrl+C');
  console.log('');
});
