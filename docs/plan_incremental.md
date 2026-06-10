# VibeBrace Studio — Plan incremental de desarrollo

> Para estudiantes de último año de secundario técnico o primer año de facultad.  
> Cada etapa produce algo que funciona y puede probarse con el hardware real.  
> Lo que entrega la cátedra al inicio: `server.js`, `index.html`, `style.css`, `pattern.js` y `editor.js` — una app mínima funcional.

---

## Lo que tienen al arrancar

Antes de escribir una sola línea, los estudiantes ya pueden:

1. Conectarse al Arduino desde el browser
2. Agregar pasos tipo S, RAMP, TREMOLO, XFADE desde el formulario
3. Ver la lista de pasos y eliminarlos
4. Enviar la secuencia y escuchar DONE por WebSocket
5. Ver una representación básica en el canvas (bloques de color)
6. Guardar y cargar patrones como archivos JSON

Todo lo que sigue **mejora** eso. En ninguna etapa se rompe lo que ya funciona.

---

## Etapa 0 — Entender lo que existe (Semana 1)

**Objetivo:** leer el código dado y poder explicar qué hace cada parte.

**Tareas:**
1. Seguir `onboarding.md` hasta tener los motores vibrando desde el browser.
2. Leer `pattern.js` completo. Para cada función: escribir en comentarios qué recibe, qué devuelve, y un ejemplo de input/output.
3. Leer `editor.js` completo. Identificar: ¿dónde se hace el fetch? ¿dónde se recibe el WebSocket? ¿dónde se dibuja el canvas?
4. Abrir el Inspector del browser (F12) mientras se envía un patrón. Observar:
   - La request POST a `/send` en la pestaña Network
   - El JSON que se envía en el body
   - El mensaje `DONE` que llega por WebSocket en la pestaña Network → WS
5. Modificar `style.css` y cambiar los colores de M1 y M2 a gusto. Verificar que el cambio se ve en el canvas.

**Entregable:** un archivo `notas.md` por estudiante con el diagrama del flujo de datos en sus propias palabras.

**Habilidades que aparecen:** lectura de código ajeno, Inspector del browser, HTTP básico, WebSocket básico.

---

## Etapa 1 — Tests del modelo de datos (Semana 2)

**Objetivo:** escribir tests para `pattern.js` antes de modificarlo.

**Contexto pedagógico:** esta etapa introduce el concepto de "función pura" y la práctica de testear antes de agregar features. Si los tests pasan hoy y siguen pasando después de los cambios de la Etapa 2, el modelo de datos es correcto.

**Tareas:**
1. Crear `public/pattern.test.js` — un archivo HTML que carga `pattern.js` y ejecuta assertions simples.

Estructura sugerida (sin framework, con `console.assert`):

```javascript
// pattern.test.js

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
  } catch (e) {
    console.error(`✗ ${description}: ${e.message}`);
  }
}

// Tests de stepToSerial

test('S: genera la línea correcta', () => {
  const result = stepToSerial({ kind: 'S', params: { d1: 200, d2: 150, ms: 500 } });
  console.assert(result === 'S,200,150,500', `Esperado "S,200,150,500", recibido "${result}"`);
});

test('RAMP: genera la línea correcta', () => {
  const result = stepToSerial({ kind: 'RAMP', params: { m: 3, d0: 0, d1: 200, ms: 1000, steps: 16 } });
  console.assert(result === 'RAMP,3,0,200,1000,16', `Recibido "${result}"`);
});

// ... agregar tests para TREMOLO, XFADE, patternToLines, validateStep
```

2. Agregar un enlace a `pattern.test.js` en `index.html` (solo en modo dev, comentarlo en producción) y verificar que todos los tests pasan en la consola.

3. Agregar al menos 2 tests de `validateStep` que prueben casos inválidos (intensidad > 255, duración negativa, tipo desconocido).

**Entregable:** `pattern.test.js` con al menos 12 tests pasando.

**Habilidades que aparecen:** testing manual, funciones puras, `console.assert`, casos borde.

---

## Etapa 2 — Mejorar el formulario (Semana 3)

**Objetivo:** hacer el formulario más amigable y robusto.

**Tareas (elegir 2 de las 4):**

**A. Feedback de validación en tiempo real**  
Agregar un `<span class="error-msg">` debajo de cada campo numérico. Al cambiar el valor, llamar a `validateStep` y mostrar el error en rojo si lo hay. Deshabilitar el botón "Agregar paso" mientras haya errores.

**B. Vista previa de la línea serial**  
Agregar un `<pre id="preview">` debajo del formulario que muestra en tiempo real cómo quedaría el comando. Al cambiar cualquier campo, actualizar el preview con `stepToSerial(readFormParams())`.

**C. Editar un paso existente**  
Al hacer click en un paso de la lista (no en la ×), abrir sus parámetros en el formulario y cambiar el botón a "Actualizar paso". Al confirmar, reemplazar el paso en el array `steps`.

**D. Duplicar un paso**  
Agregar un botón "↕ Duplicar" en cada paso de la lista. Clonar el paso (con nuevo id) e insertarlo debajo del original.

**Entregable:** PR con la feature elegida, tests actualizados si se tocó `pattern.js`.

**Habilidades que aparecen:** manejo del DOM, eventos de input, UX de formularios, edición de arrays.

---

## Etapa 3 — Mejorar el timeline (Semana 4)

**Objetivo:** hacer el timeline más informativo y preciso.

**Contexto:** la función `drawTimeline()` en `editor.js` es intencionalmente simple — muestra bloques sólidos con intensidad promedio. Esta etapa la mejora.

**Tareas (elegir 2 de las 3):**

**A. Escala de tiempo con marcas**  
Dibujar marcas en el eje X cada 200ms (o cada 500ms para patrones largos), con el valor en ms como etiqueta. El intervalo de marcas debe ajustarse automáticamente según la duración total.

**B. Visualización correcta de RAMP**  
En lugar de un bloque sólido, dibujar un trapezoide o un degradado horizontal que muestre la transición de `d0` a `d1`. Usar `createLinearGradient` del Canvas API.

**C. Hover sobre bloque**  
Detectar el movimiento del mouse sobre el canvas (`mousemove`). Calcular sobre qué paso está el cursor y mostrar un tooltip con la línea serial del paso (usar `ctx.fillText` o un `<div>` flotante posicionado con CSS).

**Entregable:** PR con la mejora elegida. El canvas debe seguir funcionando correctamente con secuencias vacías y con todos los tipos de paso.

**Habilidades que aparecen:** Canvas 2D (gradientes, texto, coordenadas), eventos de mouse, cálculo de escalas.

---

## Etapa 4 — Reordenar pasos (Semana 5)

**Objetivo:** poder cambiar el orden de los pasos arrastrando.

**Contexto:** esta es la tarea más difícil del plan. Hay dos caminos:

**Camino A (más simple): botones arriba/abajo**  
Agregar botones ↑ y ↓ en cada paso de la lista. Al hacer click, intercambiar el paso con su vecino en el array y re-renderizar. Sin drag, sin CSS complejo.

**Camino B (más desafiante): drag & drop nativo**  
Usar la [Drag and Drop API](https://developer.mozilla.org/es/docs/Web/API/HTML_Drag_and_Drop_API) del browser. Marcar cada `<li>` con `draggable="true"` y manejar los eventos `dragstart`, `dragover`, `drop` para reordenar el array.

**Recomendación:** Camino A para grupos con menos experiencia. Camino B como extensión opcional.

**Entregable:** PR. El reordenamiento debe actualizar el timeline automáticamente.

**Habilidades que aparecen:** manipulación de arrays (splice, swap), drag & drop API o eventos de click simples.

---

## Etapa 5 — Biblioteca de presets (Semana 6)

**Objetivo:** guardar y reutilizar patrones dentro de la sesión.

**Tareas:**
1. Agregar un `<section>` de "Presets" en la UI con una lista de patrones guardados.
2. Botón "Guardar como preset" que pide un nombre y agrega el patrón actual a la lista (en memoria, no en archivo).
3. Al hacer click en un preset, cargar esa secuencia en el editor.
4. Botón "×" para eliminar un preset de la lista.
5. (Extensión) Persistir los presets en `localStorage` para que sobrevivan a recargar la página.

**Entregable:** PR con la UI de presets funcionando.

**Habilidades que aparecen:** estado más complejo (array de arrays), manipulación del DOM, `localStorage` (opcional).

---

## Etapa 6 — Exportar a código Arduino (Semana 7)

**Objetivo:** generar automáticamente el código `.ino` que reproduce el patrón sin necesitar la app.

**Contexto pedagógico:** esta etapa cierra el círculo — los estudiantes ven que el patrón que diseñaron visualmente puede traducirse a código que corre directamente en el hardware.

**Tareas:**
1. Agregar en `pattern.js` una función `patternToArduinoCode(name, steps)` que devuelve un string con código C++ válido para el Arduino IDE.

Ejemplo de output esperado:

```cpp
// Patrón: "pulso suave"
// Generado por VibeBrace Studio

void setup() {
  Serial.begin(115200);
}

void loop() {
  // Enviar secuencia
  Serial.println("CLR");
  delay(20);
  Serial.println("S,200,200,500");
  delay(20);
  Serial.println("RAMP,3,0,200,1000,16");
  delay(20);
  Serial.println("RUN");

  // Esperar a que termine (estimado: 1500 ms)
  delay(1700);
}
```

2. Agregar un botón "Exportar .ino" en la toolbar que genera el archivo y lo descarga.
3. Agregar tests en `pattern.test.js` para `patternToArduinoCode`.

**Entregable:** PR con la función y el botón. El `.ino` generado debe poder abrirse en Arduino IDE sin errores de sintaxis.

**Habilidades que aparecen:** template strings, generación de código, reflexión sobre la relación app↔hardware.

---

## Etapa 7 — Pulido y demo (Semana 8)

**Objetivo:** dejar el proyecto en estado presentable.

**Tareas:**
1. Revisar todos los casos de error: ¿qué pasa si se envía con el Arduino desconectado? ¿si el archivo JSON está mal formado? ¿si el canvas es muy angosto? Todos los errores deben aparecer en la consola de la app, no solo en la consola del browser.
2. Actualizar `docs/architecture.md` con cualquier archivo nuevo que se haya agregado.
3. Agregar al menos 3 patrones de ejemplo como archivos `.json` en una carpeta `examples/`.
4. Preparar una demo de 5 minutos: mostrar el flujo completo (diseñar patrón → enviar → sentirlo → guardar → cargar → exportar).

**Entregable:** PR final con todo cerrado + demo en clase.

---

## Tabla resumen

| Etapa | Semana | Qué aprenden | Dificultad |
|-------|--------|-------------|------------|
| 0 — Leer y entender | 1 | Lectura de código, HTTP, WebSocket, Inspector | ★☆☆ |
| 1 — Tests | 2 | Funciones puras, testing manual, casos borde | ★☆☆ |
| 2 — Formulario | 3 | DOM, eventos, UX de formularios | ★★☆ |
| 3 — Timeline | 4 | Canvas 2D, gradientes, coordenadas | ★★☆ |
| 4 — Reordenar | 5 | Arrays, drag & drop o botones | ★★★ |
| 5 — Presets | 6 | Estado complejo, localStorage | ★★☆ |
| 6 — Exportar .ino | 7 | Generación de código, template strings | ★★☆ |
| 7 — Demo | 8 | Integración, comunicación | ★☆☆ |

---

## Criterio de avance

Cada etapa requiere que la anterior funcione. El criterio para "funciona" es simple: conectar el Arduino, enviar una secuencia, y que los motores vibren como se espera. No hay tests de UI automatizados — la evidencia es el hardware.

Un PR que rompe eso no puede hacer merge.

---

*Este plan es una guía, no un contrato. Si un grupo avanza más rápido, las etapas 5–6 pueden hacerse en paralelo. Si el hardware da problemas en la Etapa 0, dedicar más tiempo ahí antes de seguir.*
