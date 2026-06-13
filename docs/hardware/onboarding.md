# VibeBrace Hardware — Guía de incorporación

> Objetivo: verificar que tenés todo lo necesario — herramientas, componentes y entorno digital — antes de la primera sesión de trabajo.  
> No hay nada que instalar en esta guía. El foco es el banco de trabajo y el circuito.

---

## Lo que vas a tener verificado al final de esta guía

- El dispositivo en protoboard funciona y podés controlarlo desde VibeBrace Studio
- Sabés usar el multímetro para medir voltaje y continuidad
- Tenés KiCad instalado y podés abrir el esquemático
- Conocés la estructura del repo y dónde va cada archivo de hardware

---

## Parte 1 — Herramientas físicas

Verificar que tenés acceso a lo siguiente antes de la primera clase práctica. Si algo falta, avisarle al docente con anticipación.

### Herramientas de medición

| Herramienta | Para qué se usa en este proyecto |
|-------------|----------------------------------|
| Multímetro digital | Medir voltajes, verificar continuidad, detectar cortocircuitos |
| Sonda de prueba (cables con punta) | Medir puntos específicos del circuito |

**Verificar que el multímetro funciona:** poner en modo continuidad (símbolo ))) o campana), tocar las dos puntas entre sí — debe sonar o mostrar 0Ω.

### Herramientas de soldadura (Etapa 4 en adelante)

| Herramienta | Especificación mínima |
|-------------|----------------------|
| Soldador de punta fina | 25–40W, punta tipo lápiz |
| Estaño | 60/40 o 63/37, diámetro 0.8mm, con flux incorporado |
| Soporte para soldador | Con esponja húmeda o lana de acero |
| Pinzas de punta fina | Para sostener componentes al soldar |
| Cortaalambres | Para recortar patas de componentes |
| Flux líquido o pasta | Mejora la calidad de la soldadura (opcional pero recomendado) |
| Malla desoldadora o bomba | Para corregir errores de soldadura |

**No empezar la Etapa 4 sin soldador y estaño.** Verificar con el docente si el lab tiene equipo disponible o si hay que llevar el propio.

### Herramientas de documentación

- Cámara (el celular alcanza) para fotografiar el proceso
- Regla milimetrada para medir la caja y la placa
- Papel cuadriculado para el layout (Etapa 2)

---

## Parte 2 — Verificar el dispositivo en protoboard

El prototipo en protoboard es la referencia durante todo el proyecto. Antes de arrancar, verificar que funciona correctamente.

**2.1** Conectar el Arduino Nano por USB a la computadora.

**2.2** Abrir VibeBrace Studio (`http://localhost:3000`). Si el servidor no está corriendo, seguir los pasos del `onboarding.md` del track de software para levantarlo — necesitás tenerlo corriendo aunque tu track sea hardware.

**2.3** En la toolbar, hacer click en **Listar puertos** y conectar al puerto del Nano.

**2.4** Agregar estos tres pasos y ejecutarlos:

| Paso | Motor 1 | Motor 2 | Duración | Qué verificar |
|------|---------|---------|----------|---------------|
| `S,255,0,500` | 255 | 0 | 500ms | Solo M1 vibra |
| `S,0,255,500` | 0 | 255 | 500ms | Solo M2 vibra |
| `S,200,200,1000` | 200 | 200 | 1000ms | Ambos vibran |

Si alguno de los tres pasos no produce el resultado esperado, registrarlo en un comentario del issue de onboarding antes de continuar.

**2.5** Con el multímetro en modo DC voltaje, medir entre los pines 5V y GND del Nano mientras está conectado. Debe marcar entre 4.8V y 5.2V. Registrar el valor exacto — va a ser el primer dato de `mediciones.md`.

---

## Parte 3 — Instalar KiCad

KiCad es el software de diseño de esquemáticos. Es gratuito y de código abierto.

**3.1** Ir a https://www.kicad.org/download/ y descargar la versión para tu sistema operativo. Usar **KiCad 7** o superior.

**3.2** Instalar con las opciones por defecto. La instalación incluye las librerías de símbolos y footprints que vamos a necesitar — no desmarcar nada.

**3.3** Abrir KiCad. En la pantalla inicial debería aparecer el Project Manager.

**3.4** Verificar que las librerías están disponibles: menú **Preferences → Manage Symbol Libraries**. Debe haber entradas como `Device`, `Transistor_BJT`, `Connector`, `power`. Si la lista está vacía, reinstalar marcando la opción de librerías.

**3.5** Cerrar KiCad por ahora. Lo van a usar en la Etapa 1.

---

## Parte 4 — Instalar Fritzing (opcional)

Fritzing se usa para diagramas de protoboard — más visual que KiCad, más fácil para documentar el montaje físico.

**4.1** Ir a https://fritzing.org/download/ y descargarlo. Es de pago (precio libre desde ~8 USD) o disponible como release en GitHub: https://github.com/fritzing/fritzing-app/releases — buscar el último release y descargar el `.zip` para Windows.

**4.2** Descomprimir y ejecutar `Fritzing.exe` — no requiere instalación.

**4.3** Verificar que abre correctamente y que en el panel derecho aparecen componentes como "Arduino Nano" en la pestaña **Parts**.

Si no podés descargarlo, avisarle al docente — hay alternativas como hacer el diagrama de protoboard en papel cuadriculado fotografiado.

---

## Parte 5 — Estructura del repo para hardware

Todo el trabajo de hardware vive en `docs/hardware/`. Antes de crear cualquier archivo, verificar que la carpeta existe en el repo:

```
vibesuite/
└── docs/
    └── hardware/          ← acá va todo lo del track hardware
        ├── circuit.md         (Etapa 0 — descripción del circuito)
        ├── mediciones.md      (Etapa 0 — tabla de mediciones)
        ├── bom.md             (Etapa 3 — lista de materiales)
        ├── schematic.kicad_sch (Etapa 1 — archivo de KiCad)
        ├── schematic.pdf      (Etapa 1 — exportado)
        ├── schematic.png      (Etapa 1 — para ver en GitHub)
        ├── protoboard_fritzing.fzz (Etapa 1 — Fritzing)
        ├── protoboard_fritzing.png (Etapa 1 — exportado)
        ├── caja_medidas.md    (Etapa 2 — medidas mecánicas)
        ├── layout_v1.jpg      (Etapa 2 — primer layout)
        ├── layout_v2.jpg      (Etapa 2 — layout aprobado)
        ├── assembly_guide.md  (Etapa 6 — guía de armado)
        ├── build_log.md       (Etapas 4–5 — registro fotográfico)
        └── troubleshooting.md (Etapa 6 — problemas y soluciones)
```

Si la carpeta no existe, crearla:

```
cd %USERPROFILE%\Documents\vibesuite\docs
mkdir hardware
```

Crear un archivo inicial para verificar que Git la trackea:

```
cd hardware
echo # VibeBrace Hardware > README.md
git add README.md
git commit -m "Crea carpeta docs/hardware"
git push origin main
```

> Recordar: el push directo a `main` solo funciona para los Owners de la org. Los estudiantes deben crear una rama y abrir un PR.

---

## Parte 6 — Primer issue y rama de trabajo

Antes de escribir una sola línea de documentación, crear la rama de trabajo:

```
git checkout -b hardware/etapa-0-mediciones
```

El prefijo `hardware/` indica que es trabajo del track de hardware, diferenciándolo de `feature/` (software) y `fix/` (correcciones).

Crear el archivo inicial de mediciones:

```
docs/hardware/mediciones.md
```

Con esta estructura mínima:

```markdown
# Mediciones del prototipo en protoboard

Fecha: [fecha]
Realizado por: [nombre]
Firmware: VibeBrace_Serial_simple.ino

## Voltaje de alimentación

| Punto de medición | Valor medido |
|-------------------|-------------|
| 5V pin Nano — GND | V |

## Voltaje en motor según intensidad PWM

| Intensidad (PWM) | Voltaje en motor M1 (V) |
|-----------------|------------------------|
| 255 | |
| 200 | |
| 150 | |
| 100 | |
| 50 | |
```

Commitear y abrir un PR. El docente revisa y aprueba antes de que empiece la Etapa 1.

---

## Flujo de trabajo diario

```
1. Actualizar el repo
   git pull origin main

2. Pararse en la rama de trabajo
   git checkout hardware/etapa-X-nombre

3. Trabajar: medir, fotografiar, documentar, diseñar en KiCad

4. Antes de commitear fotos: verificar que no pesan más de 2MB cada una
   (reducir con el celular o con un compresor online si es necesario)

5. Commitear con mensaje descriptivo
   git add .
   git commit -m "Agrega fotos de soldadura de resistencias (Etapa 4A)"

6. Pushear y actualizar el PR
   git push origin hardware/etapa-X-nombre
```

---

## Convenciones específicas del track de hardware

**Nombres de archivos:** usar guión bajo, sin espacios, sin mayúsculas. `build_log.md` ✓, `Build Log Final FINAL.md` ✗.

**Fotos:** nombrarlas con etapa y descripción. `etapa4a_resistencias_soldadas.jpg`, `etapa5_placa_en_caja.jpg`. Subir en formato JPG, máximo 2MB por foto.

**Mediciones:** siempre registrar fecha, condiciones (motor encendido/apagado, intensidad PWM) y herramienta usada. Un valor sin contexto no sirve.

**KiCad:** commitear siempre el `.kicad_sch` Y el `.png` exportado. GitHub no renderiza archivos de KiCad — el PNG permite ver el esquemático directo en el repo sin abrir el software.

**No commitear:** archivos de backup de KiCad (`*-backups/`), archivos temporales de Fritzing. Agregar al `.gitignore` si aparecen.

---

## Problemas frecuentes

**KiCad no encuentra las librerías de símbolos**
Reinstalar marcando la opción "Install symbol libraries". Verificar en Preferences → Manage Symbol Libraries que la ruta apunta a la carpeta de instalación.

**Los motores no vibran en ninguno de los pasos de verificación**
Verificar que el cable USB transmite datos (no solo carga). Probar con otro cable. Verificar que VibeBrace Studio muestra `← DONE` en la consola — si aparece, el firmware corrió y el problema es eléctrico (revisar conexiones en protoboard).

**Solo vibra un motor**
El transistor del canal que no funciona probablemente tiene la base sin conexión o la resistencia mal colocada en la protoboard. Verificar con multímetro en modo continuidad desde el pin D5 o D6 del Nano hasta la base del transistor correspondiente.

**El multímetro no mide nada / marca OL**
En modo voltaje DC: verificar que el rango está en 20V o en "auto". OL significa que el voltaje supera el rango seleccionado o que las puntas están invertidas.

**Fritzing no tiene el componente Arduino Nano**
Buscarlo en la pestaña Parts con el buscador. Si no aparece, descargarlo como `.fzpz` desde https://fritzing.org/parts/ e importarlo con File → Import.

---

## Lecturas recomendadas antes de la Etapa 1

- `docs/protocol.md` — entender el protocolo serial ayuda a interpretar qué está haciendo el firmware cuando los motores vibran
- `docs/hardware/circuit.md` — descripción textual del circuito (provista por la cátedra antes de la Etapa 1)
- Datasheet del S8050 — buscar "S8050 datasheet PDF", prestar atención al pinout (E/B/C) y a los valores máximos de corriente de colector
- [Tutorial de KiCad para principiantes — Getting Started](https://docs.kicad.org/7.0/en/getting_started_in_kicad/getting_started_in_kicad.html)

---

*¿Algo no funciona o no está claro? Abrir un issue en GitHub con el título `[onboarding-hw] descripción del problema`. No avanzar a la Etapa 0 hasta resolver los puntos de verificación de esta guía.*
