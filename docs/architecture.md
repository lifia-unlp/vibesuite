# VibeBrace Studio — Arquitectura

> Describe la estructura del sistema: el servidor Node.js que habla con el Arduino y la interfaz web que corre en el browser.

---

## Vista general

VibeBrace Studio tiene dos partes que corren en la misma computadora:

- **Servidor (`server/server.js`):** un programa Node.js con acceso al puerto USB. Expone una API HTTP + WebSocket para que el browser pueda comunicarse con el Arduino.
- **Interfaz (`public/`):** archivos HTML, CSS y JavaScript que el browser carga desde el servidor. No tienen acceso al hardware — todo pasa por el servidor.

```text
┌─────────────────────────────────────────────────────────────┐
│  PC                                                         │
│                                                             │
│  Browser (Chrome/Firefox)       Servidor Node.js           │
│  ┌──────────────────────────┐   ┌─────────────────────┐    │
│  │  public/                 │   │  server/server.js   │    │
│  │                          │   │                     │    │
│  │  index.html              │   │  express            │    │
│  │  style.css               │   │  serialport         │    │
│  │  pattern.js ◄────────────┼───┼─► ws                │    │
│  │  pattern.test.js         │   │                     │    │
│  │  editor.js               │   │                     │    │
│  └──────────────────────────┘   └──────────┬──────────┘    │
│                                            │ USB            │
│  Browser → POST /send ──────────────────►  │                │
│  Browser ← WebSocket DONE ◄────────────────┤                │
│                                    ┌───────▼────────┐       │
│                                    │  Arduino Nano  │       │
│                                    │  VibeBrace fw  │       │
│                                    └────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura de archivos

```text
vibesuite/
├── firmware/
│   └── VibeBrace_Serial_simple.ino     ← no modificar
│
├── server/
│   ├── server.js                       ← servidor Node.js
│   ├── package.json
│   └── node_modules/                   ← generado por npm install, no commitear
│
├── public/                             ← todo lo que corre en el browser
│   ├── index.html                      ← estructura de la página (HTML)
│   ├── style.css                       ← estilos y diseño adaptable
│   ├── pattern.js                      ← modelo de datos (funciones puras)
│   ├── pattern.test.js                 ← pruebas automatizadas
│   └── editor.js                       ← lógica de UI y comunicación
│
├── examples/                           ← patrones de demostración en JSON
│   ├── pulso-suave.json
│   ├── rampa-progresiva.json
│   └── tremolo-alternado.json
│
└── docs/
    ├── protocol.md
    ├── architecture.md                 ← este archivo
    ├── onboarding.md
    └── demo.md                         ← guía de demostración
```

---

## El servidor (`server/server.js`)

El servidor utiliza Node.js, Express, SerialPort y WebSocket para comunicarse con el Arduino.

### Endpoints HTTP

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| `GET` | `/ports` | — | `{ ports: ["COM3", "/dev/ttyUSB0", ...] }` |
| `POST` | `/connect` | `{ "port": "/dev/ttyUSB0" }` | `{ ok: true }` |
| `POST` | `/disconnect` | — | `{ ok: true }` |
| `POST` | `/send` | `{ "lines": ["CLR", "S,200,200,500", "RUN"] }` | `{ ok: true, count: 3 }` |

En caso de error, las rutas responden con un objeto `{ error: "mensaje descriptivo" }` y un código de estado HTTP 4xx o 5xx.

### Manejo de errores

El servidor contempla diferentes situaciones de error:

- Intentos de envío sin una conexión serial activa.
- Datos recibidos con formato inválido.
- Cuerpos JSON mal formados.
- Desconexión del Arduino durante el envío.
- Errores al escribir comandos en el puerto serial.

Los errores se registran en la consola del servidor y se comunican al navegador cuando corresponde.

### WebSocket

El browser se conecta a `ws://localhost:3000`. El servidor empuja mensajes cuando el Arduino responde:

| Mensaje | Cuándo llega |
|---------|-------------|
| `DONE` | La secuencia terminó |
| `ACK RUN` | Arduino confirmó el inicio |
| `ACK CLR` | Arduino confirmó borrado de cola |
| `ACK STOP` | Arduino confirmó el stop |
| `ERR <token>` | Comando no reconocido |
| `DISCONNECTED` | El puerto serial se cerró inesperadamente |

### Archivos estáticos

El servidor también sirve los archivos de `public/` como archivos estáticos.

Cuando el browser pide `http://localhost:3000`, recibe `public/index.html`.

---

## La interfaz (`public/`)

Los estudiantes trabajan principalmente aquí.

### `pattern.js` — Modelo de datos

Funciones puras: no tocan el DOM, no llaman al servidor. Convierten pasos (objetos JS) a líneas de texto que entiende el firmware. Son las funciones más críticas del proyecto.

```text
stepToSerial(step)          → string          "S,200,200,500"
patternToLines(steps)       → string[]        ["CLR", "S,...", "RUN"]
validateStep(step)          → string | null   null si está bien
estimateDurationMs(steps)   → number          duración en ms
savePattern(name, steps)    → string          JSON para descargar
loadPattern(json)           → { name, steps } parsear desde archivo
generateId()                → string          ID único para un paso
readFormParams()            → { kind, params} leer el formulario HTML
patternToArduinoCode()      → string          generar código Arduino (.ino)
```

Responsabilidades adicionales:

- Validar que los pasos tengan una estructura correcta.
- Comprobar que los parámetros sean numéricos y estén dentro de los rangos permitidos.
- Rechazar archivos JSON mal formados o con datos inválidos.
- Generar el código Arduino correspondiente al patrón diseñado.

### `pattern.test.js` — Pruebas automatizadas

Contiene pruebas automatizadas para verificar el comportamiento de las funciones de `pattern.js`.

Se comprueban, entre otros casos:

- Generación de código Arduino.
- Inclusión de los comandos de la secuencia.
- Cálculo de tiempos.
- Escapado de nombres.
- Carga correcta de patrones JSON.
- Rechazo de archivos JSON mal formados.
- Rechazo de pasos y parámetros inválidos.
- Rechazo de valores fuera de rango.

Para ejecutar las pruebas:

```cmd
node --test public\pattern.test.js
```

### `editor.js` — Lógica de UI

Maneja el DOM, el canvas y la comunicación con el servidor.

Responsabilidades:

- Mantener el array `steps` (estado del patrón).
- Dibujar el timeline en el `<canvas>`.
- Responder a clicks y eventos del formulario.
- Llamar a `pattern.js` para validar y serializar.
- Hacer `fetch()` a los endpoints del servidor.
- Actualizar la UI cuando llega `DONE` por WebSocket.
- Mostrar errores y resultados en el registro de actividad.
- Guardar y cargar patrones.
- Permitir exportar el código Arduino generado.

### `index.html` — Estructura

Define la disposición de la página: toolbar, canvas, lista de pasos, formulario y consola. Sin lógica de aplicación.

### `style.css` — Estilos

Contiene variables CSS en `:root` para colores, tipografía y espaciado.

También define la distribución de las secciones y reglas de diseño adaptable para que la interfaz pueda utilizarse en ventanas más angostas.

---

## Flujo de datos: el usuario hace click en Enviar

```text
1. Click en "▶ Enviar y ejecutar"
        │
2. editor.js llama patternToLines(steps)
        │   → ["CLR", "S,200,200,500", "RAMP,3,0,200,1000,16", "RUN"]
        │
3. fetch('POST /send', { lines: [...] })
        │
4. server.js escribe cada línea al puerto serial con delay de 8ms
        │   CLR\n  → Arduino
        │   S,200,200,500\n  → Arduino
        │   RAMP,3,0,200,1000,16\n  → Arduino
        │   RUN\n  → Arduino
        │
5. Arduino ejecuta la secuencia
        │
6. Arduino envía "DONE\n" al terminar
        │
7. server.js recibe "DONE" y lo empuja a los browsers por WebSocket
        │
8. editor.js recibe el evento WebSocket
        │
9. UI actualiza el estado y el registro de actividad
```

---

## Flujo de datos: guardar y cargar

```text
Guardar:
  Click "Guardar"
  → prompt() para el nombre
  → pattern.savePattern(name, steps) → JSON string
  → new Blob([json]) → <a download> → descarga en el browser
  (no pasa por el servidor)

Cargar:
  Click "Cargar" → <input type="file"> → FileReader.readAsText()
  → pattern.loadPattern(json) → { name, steps }
  → editor.js actualiza steps → renderStepList() + drawTimeline()
  (no pasa por el servidor)
```

Los patrones guardados pueden utilizarse nuevamente y compartirse como archivos JSON.

---

## Flujo de datos: exportar código Arduino

```text
1. El usuario diseña una secuencia.
        │
2. editor.js obtiene los pasos del patrón.
        │
3. pattern.js ejecuta patternToArduinoCode().
        │
4. Se genera el código fuente Arduino.
        │
5. El navegador permite descargar el archivo .ino.
```

La exportación se realiza localmente en el navegador y no requiere una conexión activa con Arduino.

---

## Dependencias

### Servidor (`server/package.json`)

| Paquete | Para qué |
|---------|----------|
| `express` | servidor HTTP y archivos estáticos |
| `serialport` | comunicación con el puerto USB-serial |
| `@serialport/parser-readline` | parsear respuestas del Arduino línea a línea |
| `ws` | WebSocket server |

### Interfaz (`public/`)

Sin dependencias externas. HTML, CSS y JavaScript estándar del browser.

No hay bundler, no hay framework, no hay `npm install` para la interfaz.

---

## Decisiones de diseño

**¿Por qué un servidor local y no una app de escritorio?**

Una app de escritorio (Electron) requiere aprender IPC, procesos separados y configuración de build antes de poder hacer algo visible. Con el servidor local, los estudiantes trabajan con `fetch()` y WebSockets — tecnologías estándar que van a usar en cualquier otro contexto web.

**¿Por qué sin framework (React, Vue)?**

Agregar un framework introduce componentes, estado reactivo, JSX y bundler — conceptos que ocultan lo que está pasando realmente. Con JavaScript vanilla cada línea hace algo concreto y visible.

**¿Por qué separar `pattern.js` de `editor.js`?**

Para poder testear la lógica de serialización sin tocar el DOM. Si `stepToSerial` produce una línea mal formada, el Arduino no responde y es difícil de diagnosticar. Tener las funciones puras separadas y testeadas da una base confiable antes de agregar UI.

**¿Por qué Canvas 2D y no una tabla HTML?**

Una tabla podría mostrar la lista de pasos, pero no puede representar la dimensión temporal ni la intensidad continua de forma intuitiva. El canvas permite codificar duración como ancho e intensidad como altura — que es exactamente lo que se necesita ver.

**¿Por qué agregar pruebas automatizadas?**

Permiten detectar errores en las funciones principales sin tener que conectar el Arduino ni probar manualmente cada operación. Esto ayuda a mantener confiable el modelo de datos.

---

## Trabajo futuro (fuera del alcance del MVP)

- **Progreso en tiempo real:** el firmware solo avisa al terminar (`DONE`). Una barra de progreso requeriría un comando `STATUS` nuevo en el firmware.
- **Loop continuo:** la app puede re-enviar al recibir `DONE`, pero hay latencia USB. Una solución limpia requiere lógica en el firmware.
- **Múltiples dispositivos:** el servidor asume una sola conexión activa a la vez.
- **Timeline editable con drag:** arrastrar los bloques del canvas para cambiar duración e intensidad directamente.

---

*Antes de agregar un archivo nuevo a `public/`, actualizar este documento con su nombre y responsabilidad.*