/**
 * VibeBrace Studio — Servidor
 * 
 * Corre en Node.js. Expone una API HTTP + WebSocket para que
 * el browser pueda comunicarse con el Arduino por USB.
 * 
 * Endpoints HTTP:
 *   GET  /ports          → lista de puertos disponibles
 *   POST /connect        → conectar al Arduino
 *   POST /disconnect     → desconectar
 *   POST /send           → enviar líneas de comandos
 * 
 * WebSocket (ws://localhost:3000):
 *   El servidor empuja mensajes cuando el Arduino responde:
 *   DONE, ACK RUN, ACK CLR, ACK STOP, ERR <token>
 */

const express    = require('express');
const http       = require('http');
const path       = require('path');
const { WebSocketServer } = require('ws');
const { SerialPort }      = require('serialport');
const { ReadlineParser }  = require('@serialport/parser-readline');

// ─── Configuración ────────────────────────────────────────────────────────────

const PORT      = 3000;
const BAUD_RATE = 115200;

// Delay entre líneas enviadas al Arduino (ms).
// El buffer serial del Nano es de 64 bytes; sin delay, líneas largas
// enviadas en ráfaga pueden colisionar.
const LINE_DELAY_MS = 8;

// ─── Estado del servidor ──────────────────────────────────────────────────────

let serialPort = null;   // instancia activa de SerialPort, o null si no hay conexión
let wsClients  = new Set(); // browsers conectados por WebSocket

// ─── Express ──────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Servir los archivos estáticos de la interfaz web (carpeta ../public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── WebSocket ────────────────────────────────────────────────────────────────

const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log(`[WS] Cliente conectado (total: ${wsClients.size})`);

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[WS] Cliente desconectado (total: ${wsClients.size})`);
  });
});

// Enviar un mensaje de texto a todos los browsers conectados
function broadcast(message) {
  for (const ws of wsClients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

// ─── Endpoints HTTP ───────────────────────────────────────────────────────────

/**
 * GET /ports
 * Lista los puertos serie disponibles en el sistema.
 * Responde: { ports: ["/dev/ttyUSB0", "COM3", ...] }
 */
app.get('/ports', async (req, res) => {
  try {
    const all   = await SerialPort.list();
    const ports = all.map(p => p.path);
    res.json({ ports });
  } catch (err) {
    console.error('[/ports]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /connect
 * Body: { "port": "/dev/ttyUSB0" }
 * Abre la conexión al Arduino en ese puerto.
 * Responde: { ok: true } o { error: "..." }
 */
app.post('/connect', (req, res) => {
  const portPath = req.body.port;

  if (!portPath) {
    return res.status(400).json({ error: 'Falta el campo "port"' });
  }

  if (serialPort && serialPort.isOpen) {
    return res.status(400).json({ error: 'Ya hay una conexión activa. Desconectá primero.' });
  }

  try {
    serialPort = new SerialPort({ path: portPath, baudRate: BAUD_RATE });

    // Parser que emite un evento por cada línea terminada en \n
    const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', (line) => {
      const msg = line.trim();
      console.log(`[Arduino →] ${msg}`);
      broadcast(msg); // reenviar al browser por WebSocket
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
 * Cierra la conexión serial activa.
 * Responde: { ok: true } o { error: "..." }
 */
app.post('/disconnect', (req, res) => {
  if (!serialPort || !serialPort.isOpen) {
    return res.status(400).json({ error: 'No hay conexión activa' });
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
 * Body: { "lines": ["CLR", "S,200,200,500", "RUN"] }
 * Envía cada línea al Arduino con un pequeño delay entre ellas.
 * Responde inmediatamente con { ok: true }; el resultado llega
 * por WebSocket cuando el Arduino responde DONE.
 */
app.post('/send', (req, res) => {
  const lines = req.body.lines;

  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Falta el campo "lines" (array de strings)' });
  }

  if (!serialPort || !serialPort.isOpen) {
    return res.status(400).json({ error: 'No hay conexión activa. Conectá el Arduino primero.' });
  }

  // Validación básica: cada elemento debe ser un string no vacío
  for (const line of lines) {
    if (typeof line !== 'string' || line.trim() === '') {
      return res.status(400).json({ error: `Línea inválida: ${JSON.stringify(line)}` });
    }
  }

  // Responder al browser de inmediato (el resultado llega por WebSocket)
  res.json({ ok: true, count: lines.length });

  // Enviar las líneas con delay para no saturar el buffer del Nano
  sendLinesWithDelay(lines, 0);
});

// Función auxiliar: enviar líneas de forma recursiva con delay
function sendLinesWithDelay(lines, index) {
  if (index >= lines.length) return;

  const line = lines[index].trim();
  console.log(`[→ Arduino] ${line}`);
  serialPort.write(line + '\n');

  setTimeout(() => {
    sendLinesWithDelay(lines, index + 1);
  }, LINE_DELAY_MS);
}

// ─── Iniciar servidor ─────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log('');
  console.log('  VibeBrace Studio');
  console.log(`  Corriendo en http://localhost:${PORT}`);
  console.log('');
  console.log('  Abrí esa URL en Chrome o Firefox para usar la app.');
  console.log('  Para detener el servidor: Ctrl+C');
  console.log('');
});
