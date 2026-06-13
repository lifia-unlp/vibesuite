# VibeBrace — Descripción del circuito

> Descripción textual del circuito completo.  
> Provista por la cátedra como referencia antes de la Etapa 1 (esquemático).  
> Leer junto con `hardware_architecture.md` y `docs/protocol.md`.

---

## Resumen

El circuito implementa dos canales independientes e idénticos de driver de motor vibratorio, controlados por señales PWM del Arduino Nano. Cada canal consiste en una resistencia de base y un transistor NPN en configuración de emisor común, con un diodo flyback de protección en paralelo con el motor.

---

## Componentes

### Arduino Nano (U1)

Microcontrolador central. Recibe comandos por USB-Serial, ejecuta el firmware, y genera señales PWM en los pines D5 y D6.

En la versión soldada se monta sobre un **zócalo DIP de 30 pines (2×15, paso 2.54mm)** soldado a la placa perforada. El Nano se inserta en el zócalo y puede retirarse sin desoldar nada — útil para reprogramar o reemplazar.

**Pines usados:**

| Pin | Función en este circuito |
|-----|--------------------------|
| D5 | PWM canal Motor 1 (salida) |
| D6 | PWM canal Motor 2 (salida) |
| 5V | Alimentación de los motores |
| GND | Tierra común del circuito |
| USB (Mini-B) | Alimentación del sistema + comunicación serial |

---

### Resistencias de base R1 y R2 (1kΩ, 1/4W)

Una por canal. Conectadas entre el pin PWM del Nano (D5 o D6) y la base del transistor correspondiente.

**Por qué están:** limitan la corriente que el pin del Nano entrega a la base del transistor. Sin resistencia, la corriente de base estaría limitada solo por la resistencia interna del pin (~25Ω), lo que podría dañar el pin o el transistor. Con 1kΩ y 5V, la corriente de base es aproximadamente (5V - 0.7V) / 1000Ω ≈ 4.3 mA — suficiente para saturar el transistor con los motores usados.

**Valor:** 1kΩ. Se puede ajustar entre 470Ω y 2.2kΩ según el transistor y la ganancia de corriente (hFE) necesaria. Con S8050 y motores de ~80mA, 1kΩ es correcto.

---

### Transistores NPN Q1 y Q2 (S8050 o equivalente: BC547, 2N2222)

Uno por canal. Configuración emisor común (emisor a GND, colector al motor, base a la resistencia).

**Pinout del S8050 (vista desde el flat side, patas hacia abajo):**
```
  Izquierda: Emisor (E)
  Centro:    Base (B)
  Derecha:   Colector (C)
```

> ⚠️ El pinout varía según el fabricante y el encapsulado. Verificar siempre con el datasheet del componente específico antes de soldar.

**Operación:** cuando D5 está en HIGH (5V PWM), la corriente fluye por R1 hacia la base de Q1, Q1 satura, y el motor M1 recibe corriente del 5V a través del colector. Cuando D5 está en LOW (0V), Q1 corta y M1 no recibe corriente.

**Corriente máxima de colector del S8050:** 500 mA. Los motores usados consumen ~80 mA — margen amplio.

---

### Diodos flyback D1 y D2 (1N4148 o equivalente: 1N4001)

Uno por canal. Conectados en paralelo con cada motor.

**Orientación:** cátodo (banda) hacia el rail de 5V, ánodo hacia el colector del transistor.

```
5V ──── cátodo ──── [D1] ──── ánodo ──── Colector Q1
                                               │
                                            Motor M1
                                               │
                                             GND
```

**Por qué están:** los motores son cargas inductivas. Al cortar la corriente, generan un pico de voltaje inverso (flyback) que puede superar los 30–50V y destruir el transistor. El diodo absorbe ese pico conduciéndolo de vuelta al rail de 5V.

---

### Motores vibratorios M1 y M2 (coin vibration motor, 10mm)

Motores DC de tipo pager con masa excéntrica. Producen vibración mecánica al girar.

**Especificaciones típicas:**
- Voltaje operativo: 3V
- Voltaje máximo: 5V (operación a 5V es aceptable para uso en pulsos, no continuo prolongado)
- Corriente nominal: 60–80 mA
- Corriente de arranque: hasta 120 mA

**Polaridad:** los motores DC tienen polaridad. Invertir los cables cambia el sentido de giro pero no afecta la vibración percibida. No hay polaridad crítica en este circuito, pero conviene ser consistente entre M1 y M2.

**Conexión:** dos cables que salen del motor se conectan entre el 5V (rail) y el colector del transistor. El orden (cuál cable va a 5V y cuál al colector) no importa para la vibración, pero elegir uno y documentarlo.

---

## Diagrama de conexiones (texto)

### Canal Motor 1 (idéntico para Motor 2 con D6, R2, Q2, D2, M2)

```
Arduino Nano D5
      │
      ├──[ R1 1kΩ ]──── Base Q1 (S8050)
      │                      │
      │                 Colector Q1 ──────┬──── Motor M1 ──── 5V (Nano)
      │                      │            │
      │                      │          Ánodo D1
      │                      │          Cátodo D1 ──── 5V (Nano)
      │                 Emisor Q1
      │                      │
     GND ───────────────────GND
```

### Alimentación

```
USB (PC) ──► Nano USB pin ──► Regulador interno Nano ──► Pin 5V Nano
                                                               │
                                              ┌────────────────┤
                                              │                │
                                         Motor M1         Motor M2
                                         (via Q1)         (via Q2)
```

Todo el circuito se alimenta desde el pin 5V del Nano, que a su vez se alimenta por USB. No hay fuente de alimentación externa.

---

## Tabla de conexiones completa

| Desde | Hasta | Componente / cable |
|-------|-------|--------------------|
| Nano D5 | R1 pin 1 | cable o pista |
| R1 pin 2 | Base Q1 | cable o pista |
| Nano D6 | R2 pin 1 | cable o pista |
| R2 pin 2 | Base Q2 | cable o pista |
| Nano 5V | Motor M1 terminal A | cable rojo |
| Motor M1 terminal B | Colector Q1 | cable negro |
| Colector Q1 | Ánodo D1 | cable o pista |
| Cátodo D1 | Nano 5V | cable o pista |
| Emisor Q1 | Nano GND | cable o pista |
| Nano 5V | Motor M2 terminal A | cable rojo |
| Motor M2 terminal B | Colector Q2 | cable negro |
| Colector Q2 | Ánodo D2 | cable o pista |
| Cátodo D2 | Nano 5V | cable o pista |
| Emisor Q2 | Nano GND | cable o pista |

---

## Valores de componentes verificados

| Componente | Valor | Tolerancia aceptable |
|-----------|-------|---------------------|
| R1, R2 | 1kΩ | 470Ω – 2.2kΩ |
| Q1, Q2 | S8050 NPN | BC547, 2N2222, S9013 |
| D1, D2 | 1N4148 | 1N4001 – 1N4007 |

---

## Lo que este circuito no tiene (y por qué)

**Capacitores de desacople:** un diseño más robusto incluiría capacitores de 100nF entre 5V y GND cerca de cada transistor para filtrar el ruido eléctrico generado por los motores. Para los motores de bajo consumo usados aquí no es estrictamente necesario, pero es buena práctica.

**Indicador LED:** un LED en serie con una resistencia de 470Ω entre el pin D13 del Nano y GND permitiría indicar visualmente el estado de ejecución. El firmware ya controla D13 durante la reproducción — solo falta el LED externo.

**Conector de batería:** la alimentación por USB es suficiente para el uso actual (conectado a PC). Un uso inalámbrico requeriría una batería LiPo y un módulo de carga — fuera del alcance de esta versión.

Estas extensiones están documentadas como trabajo futuro en `hardware_architecture.md`.

---

*Este documento describe el circuito tal como fue construido en el prototipo de protoboard. Si durante la construcción de la placa soldada se realizan modificaciones (componentes diferentes, valores ajustados), actualizar este archivo y el esquemático KiCad antes de cerrar la Etapa 1.*
