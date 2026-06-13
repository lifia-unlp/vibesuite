# VibeBrace Hardware — Plan incremental de construcción

> Para estudiantes orientados al hardware.  
> Alternativo (y complementario) al plan del editor visual.  
> Entregable final: dispositivo VibeBrace completamente funcional soldado sobre placa perforada, montado en la caja 3D original, documentado y reproducible.

---

## Lo que tienen al arrancar

- Protoboard con el circuito funcionando (referencia visual)
- Firmware flasheado y probado
- Caja impresa en 3D con dimensiones conocidas
- Documentación del circuito en `docs/hardware/`

Lo que sigue construye sobre eso de forma incremental. **En ninguna etapa se destruye el prototipo en protoboard** — es la referencia de funcionamiento hasta que la placa soldada esté verificada.

---

## Etapa 0 — Entender el circuito (Semana 1)

**Objetivo:** poder explicar qué hace cada componente antes de documentarlo.

**Tareas:**

1. Leer `docs/hardware/circuit.md` completo. Para cada componente de la lista de materiales, responder por escrito: ¿qué función cumple en el circuito? ¿qué pasaría si no estuviera?

2. Con el dispositivo funcionando en protoboard, medir con multímetro:
   - Voltaje entre 5V y GND en la protoboard (debe ser ~5V)
   - Voltaje en la base del transistor cuando el motor está al máximo (debe ser ~0.7V sobre GND)
   - Voltaje colector-emisor con motor apagado vs. encendido
   - Registrar los valores en un archivo `docs/hardware/mediciones.md`

3. Enviar desde VibeBrace Studio el patrón `S,255,0,2000` (solo Motor 1 al máximo, 2 segundos). Con el multímetro en modo DC, medir el voltaje promedio en el motor con distintas intensidades: 255, 200, 150, 100, 50. Registrar los valores — esto va a ser la referencia de calibración del dispositivo soldado.

**Entregable:** `mediciones.md` con tabla de valores y respuestas escritas sobre los componentes.

**Habilidades que aparecen:** uso de multímetro, lectura de circuitos, relación PWM-voltaje.

---

## Etapa 1 — Documentar el esquemático (Semana 2)

**Objetivo:** producir un esquemático vectorial del circuito en KiCad o Fritzing, y una lista de materiales completa.

**Herramienta recomendada:** [KiCad](https://www.kicad.org/) para el esquemático (libre, multiplataforma, estándar de la industria). [Fritzing](https://fritzing.org/) para el diagrama de protoboard (más visual, mejor para documentar el prototipo).

**Tareas:**

1. Instalar KiCad 7 o superior. Seguir `docs/hardware/kicad_setup.md` para la configuración inicial.

2. Crear el esquemático en KiCad con todos los componentes y sus valores:
   - Arduino Nano (símbolo genérico o el de la librería community)
   - 2× transistor NPN (S8050 o equivalente)
   - 2× resistencia de base (valor según `circuit.md`)
   - 2× motor vibratorio (representado como carga M)
   - 2× diodo flyback en paralelo con cada motor
   - Conector USB (representado como fuente de alimentación)
   - Etiquetas de red: VCC (5V), GND, PWM_M1, PWM_M2

3. Exportar el esquemático como PDF y como imagen PNG.

4. En Fritzing, crear el diagrama de protoboard que muestre cómo está montado el prototipo actual. Exportar como PNG.

5. Guardar todos los archivos en `docs/hardware/`:
   - `schematic.kicad_sch`
   - `schematic.pdf`
   - `schematic.png`
   - `protoboard_fritzing.fzz`
   - `protoboard_fritzing.png`

**Entregable:** PR con los archivos del esquemático. Otro estudiante debe poder reconstruir el circuito solo con ese esquemático.

**Habilidades que aparecen:** KiCad básico, lectura de datasheets, convenciones de esquemáticos, diodo flyback (protección).

> **Nota sobre el diodo flyback:** los motores son cargas inductivas — al apagarse generan un pico de voltaje inverso que puede dañar el transistor. Un diodo 1N4148 en paralelo con el motor (cátodo al 5V, ánodo al colector) absorbe ese pico. Si el prototipo actual no lo tiene y funciona, es porque los motores de pager son de baja inductancia y se ha tenido suerte. La versión soldada **debe incluirlo**.

---

## Etapa 2 — Planificar el layout de la placa (Semana 3)

**Objetivo:** decidir dónde va cada componente en la placa perforada antes de soldar nada.

**Contexto:** una placa perforada no tiene ruteo automático — el layout es una decisión de diseño que afecta la facilidad de soldadura, la legibilidad y la robustez. Planificarlo en papel antes de soldar ahorra rehacerlo.

**Tareas:**

1. Medir la caja 3D:
   - Dimensiones internas de la cavidad donde va la placa
   - Posición de los agujeros de montaje si los hay
   - Posición y tamaño del conector USB (el del Nano debe quedar accesible)
   - Posición de salida de los cables de los motores
   Registrar las medidas en `docs/hardware/caja_medidas.md` con un croquis a mano fotografiado.

2. Elegir la placa perforada. Recomendación: placa de 5×7 cm con patrón de islas (cada agujero aislado) o con tiras (más fácil para rutear). Verificar que entra en la caja.

3. Dibujar el layout en papel cuadriculado (1 cuadrado = 1 agujero = 2.54 mm):
   - El Nano con su zócalo ocupa 18×30 agujeros aproximadamente
   - Dejar el pin USB del Nano en el borde de la placa
   - Agrupar los dos canales (transistor + resistencia + diodo) simétricamente
   - Marcar dónde entran los cables de los motores (idealmente con un conector JST o similar, no soldados directo)
   - Marcar dónde están GND y 5V accesibles para medir con multímetro

4. Fotografiar el layout dibujado y subirlo como `docs/hardware/layout_v1.jpg`.

5. Hacer una segunda versión del layout incorporando feedback del docente antes de avanzar. Guardar como `layout_v2.jpg`.

**Entregable:** PR con las medidas de la caja, el layout v2 fotografiado, y una justificación escrita de las decisiones de posicionamiento.

**Habilidades que aparecen:** medición mecánica, pensamiento espacial, planificación antes de ejecutar, convenciones de layout.

---

## Etapa 3 — Lista de materiales y adquisición (Semana 3, paralelo)

**Objetivo:** tener todos los componentes listos antes de empezar a soldar.

**Tareas:**

1. A partir del esquemático, completar la BOM (Bill of Materials) en `docs/hardware/bom.md`:

| Ref | Componente | Valor/Modelo | Cantidad | Package | Dónde conseguir |
|-----|-----------|-------------|----------|---------|----------------|
| U1 | Arduino Nano | ATmega328P | 1 | — | MercadoLibre |
| S1 | Zócalo DIP | 30 pines (2×15) | 1 | 2.54mm | El Polo / MercadoLibre |
| Q1,Q2 | Transistor NPN | S8050 | 2 | TO-92 | El Polo |
| R1,R2 | Resistencia | 1kΩ | 2 | 1/4W | El Polo |
| D1,D2 | Diodo flyback | 1N4148 | 2 | DO-35 | El Polo |
| M1,M2 | Motor vibratorio | pager coin 10mm | 2 | — | (del prototipo) |
| — | Placa perforada | 5×7 cm | 1 | — | El Polo |
| — | Cable rígido | 22 AWG varios colores | — | — | El Polo |
| — | Conector JST | 2 pines (opcional) | 2 | 2.54mm | MercadoLibre |

2. Verificar que todos los componentes están disponibles antes de la Etapa 4.

3. Agregar en la BOM el precio unitario y total — ejercicio de costeo del dispositivo.

**Entregable:** `bom.md` completo con precios y fuentes de adquisición en Argentina.

---

## Etapa 4 — Montaje y soldadura (Semanas 4 y 5)

**Objetivo:** poblar la placa perforada siguiendo el layout aprobado.

**Esta etapa no se hace sin el visto bueno del layout de la Etapa 2.**

### Sesión 4A — Preparación y soldadura de componentes pasivos

**Orden de soldadura recomendado** (siempre de componentes más bajos a más altos):

1. **Puentes de cable** (jumpers de ruteo de GND y 5V) — el "ruteo" de la placa perforada
2. **Resistencias R1 y R2** (1kΩ de base)
3. **Diodos D1 y D2** (1N4148, verificar polaridad: banda = cátodo)
4. **Transistores Q1 y Q2** (S8050, verificar orientación: flat side según datasheet)
5. **Zócalo del Nano** — soldar el zócalo, NO el Nano todavía

**Verificar antes de insertar el Nano:**
- Con multímetro en modo continuidad, verificar que no hay cortocircuito entre VCC y GND en el zócalo
- Verificar que cada pin de base (B de Q1 y Q2) está conectado a la resistencia correcta
- Verificar que el colector de cada transistor está conectado al motor correcto

Registrar el proceso con fotos en `docs/hardware/build_log.md`.

### Sesión 4B — Conexión de motores y primera prueba

1. Conectar los cables de los motores (o los conectores JST si se usaron)
2. **Insertar el Nano en el zócalo**
3. Conectar por USB
4. Abrir VibeBrace Studio, conectar al puerto, enviar `S,255,0,500` + RUN
5. Solo debe vibrar Motor 1
6. Enviar `S,0,255,500` + RUN — solo debe vibrar Motor 2
7. Repetir las mediciones de la Etapa 0 y comparar con los valores de referencia

**Si los valores difieren significativamente:** revisar la soldadura con el esquemático antes de avanzar.

**Entregable:** `build_log.md` con fotos del proceso y tabla comparativa de mediciones protoboard vs. placa soldada.

**Habilidades que aparecen:** técnica de soldadura, orden de operaciones, verificación incremental, documentación de proceso.

---

## Etapa 5 — Montaje en la caja y prueba de regresión (Semana 6)

**Objetivo:** instalar la placa soldada en la caja 3D y verificar que el dispositivo completo funciona igual que el prototipo.

**Tareas:**

1. Verificar que la placa entra en la caja con las medidas del layout. Si no entra, identificar qué componente sobresale y resolver (doblar pines, reposicionar).

2. Verificar que el puerto USB del Nano queda accesible por la abertura de la caja.

3. Fijar la placa en la caja (con tornillos M2 si la caja tiene agujeros, o con un poco de adhesivo termofusible en las esquinas si no los tiene).

4. Colocar los motores en su posición dentro de la pulsera.

5. **Prueba de regresión completa:** ejecutar todos los patrones de la carpeta `examples/` del repo y verificar que el comportamiento es idéntico al prototipo en protoboard. Documentar cualquier diferencia.

6. Prueba de uso continuo: ejecutar el patrón más largo disponible en loop durante 5 minutos. Verificar que no hay calentamiento excesivo en los transistores (deben estar tibios a lo sumo, no calientes).

**Entregable:** PR con `build_log.md` actualizado, fotos del dispositivo terminado dentro de la caja, y checklist de prueba de regresión firmado.

---

## Etapa 6 — Documentación de reproducción (Semana 7)

**Objetivo:** que otra persona pueda construir un VibeBrace idéntico partiendo solo de los archivos del repo, sin haber visto el original.

**Tareas:**

1. Escribir `docs/hardware/assembly_guide.md` — guía de armado paso a paso con:
   - Lista de herramientas necesarias (soldador, estaño, multímetro, pinzas, flux)
   - Fotos de cada paso de la Etapa 4
   - Puntos de verificación con multímetro
   - Errores comunes y cómo detectarlos

2. Revisar que el esquemático en KiCad coincide exactamente con lo que quedó soldado. Si durante la construcción hubo cambios (un componente distinto, una conexión diferente), actualizar el esquemático.

3. Hacer una **peer review cruzada**: otro estudiante (del track de software o del mismo track) intenta seguir la guía de armado con la documentación sin ayuda verbal. Registrar dónde tuvo dudas o dificultades y corregir la guía.

4. Crear `docs/hardware/troubleshooting.md` con los problemas encontrados durante la construcción y sus soluciones.

**Entregable:** PR con `assembly_guide.md` revisado por peer review, esquemático actualizado, `troubleshooting.md`.

**Habilidades que aparecen:** documentación técnica, perspectiva del lector, iteración sobre documentación.

---

## Etapa 7 — Demo y entrega (Semana 8)

**Objetivo:** presentar el dispositivo terminado y dejar el repo en estado que permita reproducirlo.

**Tareas:**

1. Preparar una demo de 5 minutos:
   - Mostrar el esquemático y explicar el circuito
   - Mostrar la placa soldada y señalar cada componente
   - Conectar, enviar un patrón desde VibeBrace Studio, que se sienta la vibración
   - Mostrar el repo: dónde está cada archivo, cómo se reproduce

2. Verificar que el repo tiene:
   - `docs/hardware/circuit.md` — descripción del circuito
   - `docs/hardware/bom.md` — lista de materiales con precios
   - `docs/hardware/schematic.pdf` — esquemático exportado
   - `docs/hardware/schematic.png` — para visualizar en GitHub
   - `docs/hardware/layout_v2.jpg` — layout aprobado
   - `docs/hardware/assembly_guide.md` — guía de armado
   - `docs/hardware/build_log.md` — registro fotográfico del proceso
   - `docs/hardware/mediciones.md` — tabla de calibración
   - `docs/hardware/troubleshooting.md` — problemas y soluciones

3. PR final con todo cerrado.

---

## Tabla resumen

| Etapa | Semana | Qué hacen | Habilidades | Dificultad |
|-------|--------|-----------|-------------|------------|
| 0 — Entender el circuito | 1 | Medir, analizar, registrar | Multímetro, PWM, BJT | ★☆☆ |
| 1 — Esquemático | 2 | KiCad, Fritzing, diodo flyback | Herramientas EDA, datasheets | ★★☆ |
| 2 — Layout | 3 | Planificación mecánica y eléctrica | Espacial, convenciones | ★★☆ |
| 3 — BOM | 3 | Costeo, adquisición | Gestión de materiales | ★☆☆ |
| 4 — Soldadura | 4–5 | Soldar, verificar, medir | Técnica de soldadura | ★★★ |
| 5 — Montaje en caja | 6 | Integración mecánica, regresión | Integración sistema | ★★☆ |
| 6 — Documentación | 7 | Guía reproducible, peer review | Escritura técnica | ★★☆ |
| 7 — Demo | 8 | Presentación, entrega | Comunicación técnica | ★☆☆ |

---

## Criterio de avance

El criterio es simple y físico: **el dispositivo tiene que vibrar**.

Cada etapa termina con una prueba con el hardware. Un circuito que mide bien en el multímetro pero no vibra no cierra la etapa. Un dispositivo que vibra pero cuya documentación no permite reproducirlo tampoco cierra la Etapa 6.

La placa en protoboard es la referencia en todo momento. Si hay duda sobre si algo funciona mal, comparar con la protoboard antes de sospechar del circuito soldado.

---

## Relación con el track de software

Ambos tracks comparten el mismo repo y el mismo firmware. Los estudiantes de hardware validan su dispositivo usando VibeBrace Studio (track software). Los estudiantes de software necesitan hardware funcionando para probar sus patrones.

Un entregable conjunto posible para la demo final: el track de software diseña un patrón, el track de hardware lo ejecuta en el dispositivo soldado.
