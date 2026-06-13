# VibeBrace Studio

Editor visual y dispositivo ejecutor de patrones vibrotáctiles basado en Arduino Nano.

El editor visual permite diseñar secuencias de vibración desde el browser y enviarlas por USB a una pulsera con dos motores vibradores tipo moneda.

## Inicio rápido

1. Seguir `docs/onboarding.md` para instalar dependencias y flashear el firmware.
2. Levantar el servidor: `cd server && node server.js`
3. Abrir `http://localhost:3000` en browser

## Estructura del proyecto

| Carpeta | Contenido |
|---------|-----------|
| `firmware/` | Código del Arduino (.ino) — no modificar |
| `server/` | Servidor Node.js — provisto por la cátedra |
| `public/` | Interfaz web — acá trabajan los estudiantes |
| `docs/` | Documentación |

## Documentación

- [Protocolo serial](docs/protocol.md)
- [Arquitectura](docs/architecture.md)
- [Guía de incorporación](docs/onboarding.md)
- [Plan incremental](docs/plan_incremental.md)