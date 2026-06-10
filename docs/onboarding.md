# VibeBrace Studio — Guía de incorporación

> Objetivo: clonar el repo, flashear el firmware, levantar el servidor y enviar tu primer patrón desde el browser en menos de 30 minutos.

---

## Lo que vas a tener funcionando al final de esta guía

```
Browser  ←──fetch/WebSocket──►  server.js  ──USB──►  Arduino Nano  ──►  motores
```

El browser no habla directamente con el Arduino. El servidor es el puente.

---

## Requisitos previos

| Herramienta | Versión mínima | Dónde conseguirla |
|-------------|---------------|-------------------|
| Git | cualquiera reciente | https://git-scm.com |
| Node.js | 18 LTS o superior | https://nodejs.org |
| Arduino IDE | 2.x | https://www.arduino.cc/en/software |

Hardware necesario:
- Arduino Nano (ATmega328P)
- Pulsera VibeBrace con los dos motores conectados a D5 y D6
- Cable USB-A a Mini-USB (asegurate de que transmita datos, no solo carga)

---

## Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/[org]/vibesuite.git
cd vibesuite
```

Estructura que vas a ver:

```
vibesuite/
├── firmware/          ← código del Arduino (.ino)
├── server/            ← servidor Node.js (dado por la cátedra)
│   ├── server.js
│   └── package.json
├── public/            ← interfaz web (acá vas a trabajar vos)
│   ├── index.html
│   ├── style.css
│   ├── pattern.js
│   └── editor.js
└── docs/              ← esta documentación
```

---

## Paso 2 — Flashear el firmware

1. Abrí Arduino IDE 2.x.
2. Abrí el archivo `firmware/VibeBrace_Serial_simple.ino`.
3. Conectá el Arduino Nano por USB.
4. En **Tools → Board** seleccioná `Arduino Nano`.
5. En **Tools → Processor** seleccioná `ATmega328P (Old Bootloader)` — la mayoría de los Nano clónicos lo necesitan.
6. En **Tools → Port** seleccioná el puerto del Nano:
   - Windows: algo como `COM3` o `COM4`
   - macOS: algo como `/dev/cu.usbserial-1420`
   - Linux: algo como `/dev/ttyUSB0`
7. Hacé click en **Upload** (la flecha →) y esperá `Done uploading.`

Si falla con error `avrdude`, probá cambiar entre `ATmega328P` y `ATmega328P (Old Bootloader)`.

---

## Paso 3 — Verificar el firmware con la consola serial

Antes de levantar la app, verificar que el Arduino responde correctamente.

1. En Arduino IDE: **Tools → Serial Monitor**.
2. Velocidad: `115200 baud`. Terminador: `Newline`.
3. Deberías ver:
   ```
   VibeBrace Serial READY
   ```
4. Escribí `S,200,200,500` y presioná Enter. Luego escribí `RUN` y presioná Enter.
5. Los motores deben vibrar 500 ms.

Si ves `ERR S`, el terminador está mal configurado — debe ser `Newline`, no `No line ending`.

**Cerrá el Serial Monitor antes de continuar.** Dos programas no pueden usar el mismo puerto al mismo tiempo.

---

## Paso 4 — Instalar las dependencias del servidor

```bash
cd server
npm install
```

La primera vez puede tardar unos minutos mientras descarga los paquetes. Al terminar vas a ver algo como:

```
added 42 packages in 8s
```

Si aparece un error de `node-gyp`, consultá la sección **Problemas frecuentes** al final de este documento.

---

## Paso 5 — Levantar el servidor

```bash
node server.js
```

Deberías ver:

```
  VibeBrace Studio
  Corriendo en http://localhost:3000

  Abrí esa URL en Chrome o Firefox para usar la app.
  Para detener el servidor: Ctrl+C
```

El servidor queda corriendo en esa terminal. **No la cierres** mientras usás la app.

---

## Paso 6 — Abrir la interfaz en el browser

Abrí Chrome o Firefox y entrá a:

```
http://localhost:3000
```

Vas a ver la interfaz de VibeBrace Studio.

---

## Paso 7 — Conectar al Arduino desde la app

1. Hacé click en **Listar puertos**. Aparecerán los puertos disponibles en el selector.
2. Seleccioná el puerto del Nano (el mismo que usaste en el paso 2).
3. Hacé click en **Conectar**. El indicador ● debe ponerse en verde.

Si el puerto no aparece, verificá que el cable esté conectado y que el Serial Monitor de Arduino IDE esté cerrado.

---

## Paso 8 — Enviar tu primer patrón

1. En el formulario, tipo `S`, configurá Motor 1 = 200, Motor 2 = 200, Duración = 500 ms.
2. Hacé click en **+ Agregar paso**.
3. El paso debe aparecer en la lista y en el canvas.
4. Hacé click en **▶ Enviar y ejecutar**.
5. Los motores deben vibrar 500 ms. En la consola de la app vas a ver `← DONE`.

Si llegaste hasta acá, el entorno está funcionando.

---

## Flujo de trabajo diario

```bash
# 1. Actualizar antes de empezar
git pull origin main

# 2. Crear una rama para tu tarea
git checkout -b feature/nombre-de-lo-que-vas-a-hacer

# 3. Levantar el servidor (en una terminal aparte)
cd server && node server.js

# 4. Abrir http://localhost:3000 en el browser

# 5. Editar archivos en public/ y refrescar el browser (F5) para ver los cambios
#    No hace falta reiniciar el servidor cuando editás public/
#    Sí hace falta reiniciarlo (Ctrl+C y node server.js) si editás server.js

# 6. Commitear frecuentemente
git add .
git commit -m "Agrega visualización del RAMP en el timeline"

# 7. Subir la rama cuando esté lista
git push origin feature/nombre-de-lo-que-vas-a-hacer
```

Abrir un Pull Request en GitHub cuando la tarea esté lista para revisión.

---

## Convenciones del proyecto

**Commits:** `verbo + qué`. Ejemplos: `Agrega validación de rango en stepToSerial`, `Corrige ancho de bloque en drawTimeline`, `Actualiza endpoint /send en architecture.md`.

**Ramas:** `feature/` para cosas nuevas, `fix/` para correcciones, `docs/` para documentación.

**Tests:** toda función pura en `pattern.js` debe tener al menos un test en `pattern.test.js`. Correr los tests antes de cada PR abriendo `pattern.test.js` en el browser y revisando la consola.

**No commitear:** `node_modules/`, archivos `.env`. Ya están en el `.gitignore`.

**No modificar** `server/server.js` sin consultar — es la base compartida de todos.

---

## Problemas frecuentes

**`npm install` falla con error de `node-gyp` o `serialport`**

`serialport` necesita herramientas de compilación nativas:
- Windows: instalar [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), workload "Desktop development with C++".
- macOS: correr `xcode-select --install` en la terminal.
- Linux: correr `sudo apt install build-essential`.

Después volver a correr `npm install`.

**El puerto no aparece en la lista al hacer click en "Listar puertos"**

- Verificar que el cable transmita datos (no solo carga). Probar con otro cable.
- Windows: Administrador de dispositivos → Puertos (COM y LPT). Si hay signo de advertencia, instalar el driver CH340 desde https://www.wch-ic.com/downloads/CH341SER_EXE.html
- Linux: correr `sudo usermod -aG dialout $USER` y reiniciar sesión.

**Error "Port is already open" o "Access denied"**

El Serial Monitor de Arduino IDE está abierto. Cerrarlo y volver a intentar.

**El servidor arranca pero el browser muestra "No se puede conectar"**

Verificar que la URL sea exactamente `http://localhost:3000` (no `https://`).

**Los motores no vibran pero la consola muestra `← DONE`**

El firmware ejecutó los pasos. Revisar:
1. Que los motores estén en D5 y D6.
2. Que la intensidad sea mayor a ~80 (valores bajos no alcanzan el umbral de arranque).
3. Que la alimentación sea suficiente — el Nano entrega máximo ~40 mA por pin.

**El browser muestra un error 404 al abrir localhost:3000**

Verificar que el archivo `public/index.html` existe. El servidor busca los archivos estáticos en la carpeta `public/` relativa a donde está `server.js`.

**Cambié un archivo en `public/` pero no veo los cambios**

Refrescar el browser con Ctrl+Shift+R (hard refresh, ignora el caché). No hace falta reiniciar el servidor.

---

## Lecturas recomendadas antes de empezar a codear

- `docs/protocol.md` — spec del protocolo serial. Leer antes de tocar código.
- `docs/architecture.md` — mapa del sistema y responsabilidades de cada archivo.
- [Fetch API — MDN](https://developer.mozilla.org/es/docs/Web/API/Fetch_API/Using_Fetch) — cómo el browser llama al servidor.
- [WebSocket API — MDN](https://developer.mozilla.org/es/docs/Web/API/WebSocket) — cómo el servidor avisa al browser.
- [Canvas API — MDN](https://developer.mozilla.org/es/docs/Web/API/Canvas_API/Tutorial) — para cuando llegues al timeline.

---

*¿Algo de esta guía no funcionó? Abrí un issue en GitHub con el mensaje de error exacto y el sistema operativo. No asumas que el problema es tuyo — puede ser la guía.*
