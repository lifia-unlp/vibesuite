# VibeBrace Hardware — Arquitectura del sistema

> Describe cómo se relacionan el firmware, el protocolo serial, y el circuito físico.  
> Leer junto con `docs/protocol.md` (protocolo serial) y `docs/hardware/circuit.md` (descripción del circuito).

---

## Vista general

VibeBrace es un sistema de tres capas que trabajan juntas:

```
┌─────────────────────────────────────────────────────────────────┐
│  PC                                                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  VibeBrace Studio (browser + servidor Node.js)            │  │
│  │  Genera líneas de texto: "S,200,200,500", "RUN", etc.     │  │
│  └────────────────────────────┬──────────────────────────────┘  │
│                               │ USB-Serial 115200 baud          │
└───────────────────────────────┼─────────────────────────────────┘
                                │
┌───────────────────────────────┼─────────────────────────────────┐
│  Arduino Nano                 │                                  │
│  ┌────────────────────────────▼──────────────────────────────┐  │
│  │  Firmware (VibeBrace_Serial_simple.ino)                   │  │
│  │  Parsea comandos → gestiona cola → genera señal PWM       │  │
│  └──────────────────┬──────────────────┬──────────────────── ┘  │
│                     │ D5 (PWM)          │ D6 (PWM)              │
└─────────────────────┼──────────────────┼────────────────────────┘
                      │                  │
┌─────────────────────┼──────────────────┼────────────────────────┐
│  Circuito de potencia                                            │
│                     │                  │                         │
│              R1 1kΩ │           R2 1kΩ │                         │
│                  ───┤               ───┤                         │
│                 Q1  │              Q2  │                         │
│               (NPN) │            (NPN) │                         │
│                     │                  │                         │
│              Motor 1│          Motor 2 │                         │
│              (D5)   │          (D6)    │                         │
└─────────────────────────────────────────────────────────────────┘
```

Cada capa tiene una responsabilidad clara y no necesita saber cómo funcionan las otras:

| Capa | Responsabilidad | Quién la trabaja |
|------|----------------|-----------------|
| App (Studio) | Generar y enviar texto por USB | Track software |
| Firmware | Parsear texto, generar PWM | Firmware (dado, no modificar) |
| Circuito | Convertir señal PWM en corriente para el motor | Track hardware |

---

## Por qué el circuito necesita transistores

El Arduino Nano puede entregar **máximo 40 mA por pin** de salida digital. Los motores vibratorios tipo coin de 10mm consumen entre 60 y 100 mA a plena carga — más de lo que el pin puede dar sin dañarse.

El transistor NPN actúa como **interruptor controlado por corriente**: una corriente pequeña en la base (proveniente del pin del Nano, ~5 mA) controla una corriente grande en el colector (la que va al motor, hasta 500 mA según el transistor). El Nano controla sin exponerse.

```
Pin Nano (5mA máx.)  →  Base transistor
                         │
                         ▼  amplificado
Fuente 5V USB       →  Colector → Motor → GND
```

La ganancia de corriente del S8050 (hFE) es de 40–300 según el punto de operación. En saturación (motor encendido al máximo) el transistor actúa como un interruptor cerrado: prácticamente todo el 5V llega al motor.

---

## Señal PWM y control de intensidad

El firmware genera una señal **PWM (Pulse Width Modulation)** en los pines D5 y D6. PWM no es un voltaje variable — es una señal que alterna entre 0V y 5V muy rápidamente. Lo que varía es el **duty cycle**: qué fracción del tiempo la señal está en 5V.

```
Duty cycle 100% (valor 255):
5V ████████████████████████████ 0V

Duty cycle 50% (valor 128):
5V ██████████████░░░░░░░░░░░░░░ 0V

Duty cycle 20% (valor 51):
5V █████░░░░░░░░░░░░░░░░░░░░░░░ 0V
```

El motor, por su inercia mecánica, promedia esta señal y vibra con una intensidad proporcional al duty cycle. Un valor de 200 produce aproximadamente (200/255) × 5V ≈ 3.9V promedio en el motor.

El transistor reproduce esta señal PWM a mayor corriente: cuando el pin está en 5V, el transistor conduce y el motor recibe corriente; cuando está en 0V, el transistor corta y el motor no recibe nada.

---

## El diodo flyback y por qué es necesario

Un motor es una carga **inductiva**: tiene una bobina interna que almacena energía en su campo magnético. Cuando el transistor corta la corriente bruscamente (PWM pasa a 0V), esa energía tiene que ir a algún lado. Si no hay camino, genera un **pico de voltaje inverso** que puede superar los 50V y destruir el transistor.

El **diodo flyback** (1N4148 o similar) proporciona ese camino: se conecta en paralelo con el motor, con la cátodo hacia 5V y el ánodo hacia el colector del transistor. En operación normal está en inversa y no conduce. Cuando aparece el pico, conduce y lo disipa de forma segura.

```
      5V ──────────────┬───── Motor ─────┐
                       │                 │
                    cátodo              │
                    diodo           colector Q
                    ánodo              │
                       │                │
                       └────────────────┘
                                        emisor Q
                                        │
                                       GND
```

**Los motores de pager de baja inductancia pueden funcionar sin él**, pero el dispositivo soldado debe incluirlo. La protección cuesta menos de $0.10 y evita fallas difíciles de diagnosticar.

---

## Relación entre firmware y circuito

El firmware no sabe nada del circuito — solo genera valores PWM en pines. El circuito no sabe nada del firmware — solo amplifica lo que recibe. La interfaz entre ambos son dos señales eléctricas en D5 y D6.

Esta separación tiene una consecuencia práctica para el diagnóstico:

| Síntoma | Dónde buscar |
|---------|-------------|
| La app envía pero la consola no muestra `DONE` | Firmware o conexión USB |
| La consola muestra `DONE` pero los motores no vibran | Circuito |
| Un motor vibra y el otro no | Circuito (canal específico) |
| Los motores vibran pero con intensidad incorrecta | Circuito o calibración PWM |
| El comportamiento es correcto en protoboard pero no en la placa soldada | Soldadura o layout |

El multímetro es la herramienta de diagnóstico para todo lo que está debajo de la línea D5/D6.

---

## Mapa de pines

| Pin Nano | Función | Conectado a |
|----------|---------|------------|
| D5 | PWM Motor 1 | R1 → Base Q1 |
| D6 | PWM Motor 2 | R2 → Base Q2 |
| 5V | Alimentación motores | Colector Q1, Colector Q2 (a través de los motores) |
| GND | Tierra común | Emisor Q1, Emisor Q2, GND circuito |
| USB | Alimentación y serial | PC |

Todos los demás pines del Nano quedan sin conectar en esta versión del dispositivo.

---

## Alimentación

El dispositivo se alimenta completamente por USB desde el pin 5V regulado del Nano. El regulador interno del Nano (basado en el chip USB) puede entregar hasta ~500 mA al 5V.

Consumo estimado:
- Arduino Nano en operación: ~20 mA
- Motor vibratorio coin 10mm a plena carga: ~80–100 mA cada uno
- **Total máximo con ambos motores al 100%:** ~220 mA

Esto está dentro del límite de 500 mA del USB. Sin embargo, si se usan motores de mayor consumo (algunos modelos consumen 150 mA o más), revisar el consumo antes de asumir que USB es suficiente.

---

## Archivos del track de hardware en el repo

```
docs/hardware/
├── hardware_architecture.md   ← este archivo
├── circuit.md                 ← descripción detallada del circuito
├── mediciones.md              ← tabla de calibración (Etapa 0)
├── bom.md                     ← lista de materiales (Etapa 3)
├── schematic.kicad_sch        ← esquemático KiCad (Etapa 1)
├── schematic.pdf              ← exportado (Etapa 1)
├── schematic.png              ← para ver en GitHub (Etapa 1)
├── protoboard_fritzing.fzz    ← diagrama Fritzing (Etapa 1)
├── protoboard_fritzing.png    ← exportado (Etapa 1)
├── caja_medidas.md            ← dimensiones mecánicas (Etapa 2)
├── layout_v1.jpg              ← primer layout (Etapa 2)
├── layout_v2.jpg              ← layout aprobado (Etapa 2)
├── assembly_guide.md          ← guía de armado (Etapa 6)
├── build_log.md               ← registro fotográfico (Etapas 4–5)
└── troubleshooting.md         ← problemas y soluciones (Etapa 6)
```

El `docs/protocol.md` de la raíz es compartido entre ambos tracks y describe el protocolo serial completo. Leerlo es parte del onboarding de hardware.

---

*Si durante la construcción se descubre que el circuito real difiere de lo documentado acá (un componente distinto, un pin diferente), actualizar este archivo y el esquemático antes de cerrar la etapa correspondiente.*
