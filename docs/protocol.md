# VibeBrace Serial Protocol — Especificación v1.0

> Derivada del firmware `VibeBrace_Serial_simple.ino`.  
> Última revisión: junio 2025.  
> Esta es la fuente de verdad para la app de escritorio y para cualquier modificación futura del firmware.

---

## 1. Configuración de la conexión

| Parámetro     | Valor         |
|---------------|---------------|
| Velocidad     | 115200 baud   |
| Bits de datos | 8             |
| Paridad       | Ninguna       |
| Bits de parada| 1 (8N1)       |
| Terminador    | `\n` (LF)     |

La conexión física es USB-Serial sobre el chip CH340 o similar del Arduino Nano.  
Al conectar, el Arduino envía la línea de bienvenida:

```
VibeBrace Serial READY
```

Si la app no recibe esa línea en los primeros 2 segundos, asumir que el firmware no está cargado o que el puerto es incorrecto.

---

## 2. Modelo de ejecución

El firmware opera con una **cola circular de pasos** (`QUEUE_MAX = 96 pasos`).

El flujo normal de uso es:

```
1. CLR          → vaciar la cola y detener cualquier reproducción
2. <comandos>   → cargar pasos en la cola (S, RAMP, TREMOLO, XFADE)
3. RUN          → iniciar reproducción secuencial
```

Durante la reproducción, el firmware ejecuta cada paso en orden, aplica los valores PWM a los motores durante la duración indicada, y avanza al siguiente. Al terminar el último paso envía `DONE` y se detiene.

**Limitaciones importantes:**
- La cola acepta un máximo de 96 pasos. Los comandos generadores como RAMP y TREMOLO pueden expandirse en múltiples pasos internos — ver cada sección.
- Si la cola está llena, los pasos adicionales se descartan silenciosamente (sin error).
- Hay un **silencio breve entre pasos**: el firmware apaga ambos motores al finalizar cada paso antes de activar el siguiente. Esto puede percibirse como una discontinuidad en ramps muy rápidas.

---

## 3. Comandos de control

Estos comandos no agregan pasos a la cola; modifican el estado del dispositivo de forma inmediata.

---

### `RUN`

Inicia la reproducción de la cola desde el paso actual.

**Sintaxis:**
```
RUN\n
```

**Respuesta:**
```
ACK RUN
```

**Notas:**
- Si la cola está vacía, el firmware responde `ACK RUN` pero inmediatamente envía `DONE` y se detiene.
- El LED integrado del Nano se enciende durante la reproducción.

---

### `STOP`

Detiene la reproducción inmediatamente y apaga los motores. La cola **no se borra**.

**Sintaxis:**
```
STOP\n
```

**Respuesta:**
```
ACK STOP
```

---

### `CLR`

Vacía la cola y apaga los motores. No detiene una reproducción en curso de forma explícita, pero al quedar la cola vacía el firmware se detiene solo al finalizar el paso actual.

**Sintaxis:**
```
CLR\n
```

**Respuesta:**
```
ACK CLR
```

**Uso recomendado:** enviar siempre `CLR` antes de cargar una nueva secuencia.

---

## 4. Comandos de patrón

Estos comandos agregan uno o más pasos a la cola.  
No hay respuesta de ACK por comando de patrón individual — la confirmación llega al ejecutar `RUN` y terminar con `DONE`.

---

### `S` — Step (paso simple)

Activa ambos motores a intensidades fijas durante un tiempo determinado.

**Sintaxis:**
```
S,d1,d2,ms\n
```

| Parámetro | Tipo    | Rango     | Descripción                          |
|-----------|---------|-----------|--------------------------------------|
| `d1`      | entero  | 0 – 255   | Intensidad PWM del Motor 1 (D5)      |
| `d2`      | entero  | 0 – 255   | Intensidad PWM del Motor 2 (D6)      |
| `ms`      | entero  | 5 – 20000 | Duración en milisegundos             |

**Pasos generados:** 1

**Ejemplos:**

```
S,200,200,500       → ambos motores al ~78% durante 500 ms
S,255,0,300         → solo Motor 1 al máximo durante 300 ms
S,0,180,1000        → solo Motor 2 al ~71% durante 1 segundo
S,0,0,200           → silencio de 200 ms (pausa explícita)
```

---

### `RAMP` — Rampa de intensidad

Genera una transición gradual de intensidad en uno o ambos motores, de un valor inicial a uno final.

**Sintaxis:**
```
RAMP,m,d0,d1,totalMs,steps\n
```

| Parámetro  | Tipo   | Rango     | Descripción                                         |
|------------|--------|-----------|-----------------------------------------------------|
| `m`        | entero | 1, 2, 3   | Motor objetivo: 1=Motor1, 2=Motor2, 3=ambos         |
| `d0`       | entero | 0 – 255   | Intensidad inicial                                  |
| `d1`       | entero | 0 – 255   | Intensidad final                                    |
| `totalMs`  | entero | 5 – 20000 | Duración total de la rampa en ms                    |
| `steps`    | entero | 2 – 200   | Número de pasos de interpolación                    |

**Pasos generados:** igual a `steps` (cada uno con duración `totalMs / steps`, mínimo 5 ms).

**Comportamiento del motor no objetivo:** queda en 0 durante toda la rampa.

**Ejemplos:**

```
RAMP,1,0,255,1000,20    → Motor 1 sube de 0 a 255 en 1 segundo, 20 pasos
RAMP,2,255,0,500,10     → Motor 2 baja de 255 a 0 en 500 ms, 10 pasos
RAMP,3,100,200,800,16   → ambos motores suben de 100 a 200 en 800 ms
```

**Nota sobre la cola:** 200 pasos es el máximo por llamada. Con una cola de 96 pasos total, usar `steps` > 96 garantiza pérdida de datos. Recomendado: ≤ 48 pasos por RAMP si hay otros comandos en la secuencia.

---

### `TREMOLO` — Vibración modulada (LFO)

Genera una oscilación sinusoidal de intensidad sobre una línea base, simulando un efecto de trémolo.

**Sintaxis:**
```
TREMOLO,m,base,depth,rateHz,totalMs\n
```

| Parámetro  | Tipo   | Rango     | Descripción                                              |
|------------|--------|-----------|----------------------------------------------------------|
| `m`        | entero | 1, 2, 3   | Motor objetivo: 1=Motor1, 2=Motor2, 3=ambos              |
| `base`     | entero | 0 – 255   | Intensidad central de la oscilación                      |
| `depth`    | entero | 0 – 255   | Amplitud pico de la oscilación (⚠️ ver nota)             |
| `rateHz`   | entero | 1 – 50    | Frecuencia de oscilación en Hz                           |
| `totalMs`  | entero | 50 – 5000 | Duración total en ms                                     |

**Pasos generados:** aproximadamente `totalMs / stepMs`, donde `stepMs = max(30, 1000 / (rateHz × 4))`. Para rateHz=10, stepMs=25 → ~25ms → se clampa a 30ms → ~167 pasos para totalMs=5000. **Cuidado con la cola.**

**Fórmula interna:**
```
dv = base + depth × 0.5 × (1 + sin(2π × t × rateHz))
```
El valor oscila entre `base` y `base + depth`, con el seno centrado. La intensidad mínima es `base`, la máxima es `base + depth` (clampado a 255).

**Ejemplos:**

```
TREMOLO,1,100,100,5,1000    → Motor 1 oscila entre 100 y 200, 5 Hz, 1 segundo
TREMOLO,3,80,60,2,2000      → ambos motores, oscilación lenta (2 Hz), 2 segundos
TREMOLO,2,200,50,20,500     → Motor 2, oscilación rápida (20 Hz), 500 ms
```

**Nota:** `depth` no es amplitud simétrica — la oscilación siempre va hacia arriba desde `base`. Para una oscilación centrada en `v` con amplitud `a`, usar `base = v - a/2` y `depth = a`.

---

### `XFADE` — Crossfade entre motores

Transfiere gradualmente la intensidad del Motor 1 al Motor 2. Útil para crear sensación de movimiento espacial a lo largo de la pulsera.

**Sintaxis:**
```
XFADE,duty,totalMs,steps\n
```

| Parámetro  | Tipo   | Rango     | Descripción                                          |
|------------|--------|-----------|------------------------------------------------------|
| `duty`     | entero | 0 – 255   | Intensidad total que se redistribuye entre motores   |
| `totalMs`  | entero | 5 – 20000 | Duración total del crossfade en ms                   |
| `steps`    | entero | 2 – 200   | Número de pasos de interpolación                     |

**Pasos generados:** igual a `steps`.

**Fórmula interna:** en el paso `i` de `steps` totales:
```
t  = i / (steps - 1)       ∈ [0.0, 1.0]
M1 = duty × (1 - t)
M2 = duty × t
```

En el primer paso: M1=duty, M2=0. En el último: M1=0, M2=duty.

**Ejemplos:**

```
XFADE,200,1000,20    → crossfade de M1→M2 con intensidad 200, en 1 segundo, 20 pasos
XFADE,255,500,10     → crossfade rápido a máxima intensidad
XFADE,150,2000,40    → crossfade lento y suave
```

---

## 5. Respuestas del firmware

El firmware solo envía respuestas en tres situaciones:

| Respuesta      | Cuándo se emite                                                  |
|----------------|------------------------------------------------------------------|
| `ACK RUN`      | Al recibir el comando `RUN`                                      |
| `ACK STOP`     | Al recibir el comando `STOP`                                     |
| `ACK CLR`      | Al recibir el comando `CLR`                                      |
| `DONE`         | Al finalizar la reproducción de la cola (cola vacía durante RUN) |
| `ERR <token>`  | Al recibir un comando no reconocido                              |

**Los comandos de patrón (S, RAMP, TREMOLO, XFADE) no generan respuesta.**

La app debe usar `DONE` como señal de fin de reproducción para actualizar su estado de UI.

---

## 6. Secuencia de operación recomendada

```
→ [app]    CLR
← [fw]     ACK CLR

→ [app]    S,0,0,100
→ [app]    RAMP,3,0,200,800,16
→ [app]    TREMOLO,1,150,80,8,1000
→ [app]    XFADE,200,600,12
→ [app]    S,0,0,100

→ [app]    RUN
← [fw]     ACK RUN

  ... (reproducción en curso) ...

← [fw]     DONE
```

**Timing recomendado entre comandos:** no hay handshake por paso de patrón, pero enviar los comandos con un pequeño delay (5–10 ms) entre líneas reduce el riesgo de overflow del buffer serial del Arduino (64 bytes por defecto).

---

## 7. Valores PWM y comportamiento físico

Los valores de intensidad son PWM de 8 bits (0–255), correspondientes a 0–100% del ciclo de trabajo sobre los pines D5 y D6 del Nano.

Referencia orientativa (varía según el motor y la alimentación):

| Valor PWM | Comportamiento típico                        |
|-----------|----------------------------------------------|
| 0         | Motor apagado                                |
| 1 – 50    | Por debajo del umbral de arranque — sin movimiento |
| 50 – 80   | Zona de arranque (depende del motor)         |
| 80 – 180  | Rango principal de operación                 |
| 180 – 255 | Alta intensidad                              |
| 255       | Máxima intensidad                            |

**El umbral de arranque depende del motor específico.** Calibrar experimentalmente con el hardware disponible antes de diseñar patrones.

---

## 8. Comportamiento conocido y limitaciones

| Comportamiento | Descripción |
|----------------|-------------|
| Silencio entre pasos | El firmware apaga los motores brevemente al finalizar cada paso antes de activar el siguiente. En ramps con pasos cortos (<20 ms) esto puede percibirse como un artefacto de textura. |
| Cola silenciosa | Si la cola se llena, los pasos adicionales se descartan sin notificación. La app debe calcular la cantidad de pasos antes de enviar. |
| Sin estado consultable | No existe un comando para preguntar el estado actual de la cola o de la reproducción. El único feedback es `DONE`. |
| Buffer serial del Nano | 64 bytes. Líneas largas enviadas muy rápido pueden colisionar. Respetar el delay entre comandos recomendado en §6. |

---

## 9. Glosario

| Término | Definición |
|---------|------------|
| **Paso** | Unidad mínima de la cola: intensidades d1, d2 y duración ms |
| **Cola** | Buffer circular de 96 pasos en el firmware |
| **PWM** | Pulse Width Modulation — técnica para controlar la intensidad del motor |
| **Motor 1** | Motor conector al pin D5 del Nano |
| **Motor 2** | Motor conector al pin D6 del Nano |
| **duty** | En XFADE, la intensidad total que se redistribuye entre ambos motores |
| **depth** | En TREMOLO, amplitud de la oscilación (unilateral, hacia arriba desde base) |

---

*Para modificaciones al firmware que extiendan este protocolo, actualizar este documento antes de implementar.*
