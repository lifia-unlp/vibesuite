// VibeBrace Serial (simplificado) – Arduino Nano (ATmega328P)
// Interfaz (115200 baud, líneas con \n):
//   S,d1,d2,ms
//   RAMP,m,d0,d1,totalMs,steps
//   TREMOLO,m,base,depth,rateHz,totalMs
//   XFADE,duty,totalMs,steps
//   RUN | STOP | CLR
//
// Pines: MOTOR1=D5, MOTOR2=D6

#include <Arduino.h>
#include <string.h>
#include <math.h>

// -------------------- Config --------------------
const uint8_t MOTOR1 = 5;
const uint8_t MOTOR2 = 6;
const uint8_t LEDPIN = LED_BUILTIN;

const uint16_t MIN_MS = 5, MAX_MS = 20000; // permitir hasta 20 s
const uint8_t  MIN_D  = 0, MAX_D  = 255;

struct Step { uint8_t d1, d2; uint16_t ms; };

const int QUEUE_MAX = 96;
Step q[QUEUE_MAX];
int qHead = 0, qTail = 0;

bool running = false;
bool stepActive = false;
unsigned long stepEnd = 0;
Step cur;

char lineBuf[128];
int lineLen = 0;

// -------------------- Helpers --------------------
static inline int clampi(int v, int lo, int hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
void motors(uint8_t a, uint8_t b) {
  analogWrite(MOTOR1, a);
  analogWrite(MOTOR2, b);
}

bool qEmpty() { return qHead == qTail; }
bool qPush(const Step& s) {
  int nTail = (qTail + 1) % QUEUE_MAX;
  if (nTail == qHead) return false;  // llena
  q[qTail] = s; qTail = nTail; return true;
}
bool qPop(Step& out) {
  if (qEmpty()) return false;
  out = q[qHead]; qHead = (qHead + 1) % QUEUE_MAX; return true;
}
void qClear(){ qHead = qTail = 0; }

// CSV simple (separa por coma y fin de línea). Modifica el buffer.
// Devuelve cantidad de tokens.
int splitCSV(char* s, char* tok[], int maxTok) {
  int n = 0; char* p = strtok(s, ",\r\n");
  while (p && n < maxTok) { tok[n++] = p; p = strtok(NULL, ",\r\n"); }
  return n;
}

// -------------------- Generadores de patrones --------------------
void addStep(int d1, int d2, int ms) {
  qPush(Step{
    (uint8_t)clampi(d1,MIN_D,MAX_D),
    (uint8_t)clampi(d2,MIN_D,MAX_D),
    (uint16_t)clampi(ms,MIN_MS,MAX_MS)
  });
}

void addRamp(int m, int d0, int d1, int totalMs, int steps) {
  steps   = clampi(steps, 2, 200);
  d0      = clampi(d0, MIN_D, MAX_D);
  d1      = clampi(d1, MIN_D, MAX_D);
  int dt  = max(5, totalMs / steps);
  for (int i = 0; i < steps; ++i) {
    float t = (steps == 1) ? 1.0f : (float)i / (steps - 1);
    int dv  = (int)(d0 + t * (d1 - d0));
    uint8_t a = (m == 2) ? 0 : (uint8_t)dv; // m:1->M1, 2->M2, 3->ambos
    uint8_t b = (m == 1) ? 0 : (uint8_t)dv;
    qPush(Step{ a, b, (uint16_t)dt });
  }
}

void addTremolo(int m, int base, int depth, int rateHz, int totalMs) {
  base   = clampi(base,  MIN_D, MAX_D);
  depth  = clampi(depth, 0,     MAX_D);
  rateHz = clampi(rateHz,1,     50);
  totalMs= clampi(totalMs,50,   5000);
  int stepMs = max(30, 1000 / (rateHz * 4)); // 4 pasos por ciclo aprox.
  for (int t = 0; t < totalMs; t += stepMs) {
    float phi = 2.0f * 3.1415926f * (t / 1000.0f) * rateHz;
    int dv = base + (int)(depth * 0.5f * (1.0f + sin(phi)));
    dv = clampi(dv, MIN_D, MAX_D);
    uint8_t a = (m == 2) ? 0 : (uint8_t)dv;
    uint8_t b = (m == 1) ? 0 : (uint8_t)dv;
    qPush(Step{ a, b, (uint16_t)stepMs });
  }
}

void addXfade(int duty, int totalMs, int steps) {
  duty  = clampi(duty, MIN_D, MAX_D);
  steps = clampi(steps, 2, 200);
  int dt = max(5, totalMs / steps);
  for (int i = 0; i < steps; ++i) {
    float t = (float)i / (steps - 1);
    int a = (int)(duty * (1.0f - t));
    int b = (int)(duty * t);
    qPush(Step{ (uint8_t)a, (uint8_t)b, (uint16_t)dt });
  }
}

// -------------------- Parser de comandos --------------------
void parseLine(char* raw) {
  // limpia CR/LF al final
  int n = strlen(raw);
  while (n && (raw[n-1] == '\r' || raw[n-1] == '\n')) raw[--n] = 0;
  if (!n) return;

  char* tok[8];
  int nt = splitCSV(raw, tok, 8);
  if (nt == 0) return;

  // Comandos simples
  if (strcmp(tok[0], "RUN") == 0)  { running = true;  stepActive = false; digitalWrite(LEDPIN, HIGH); Serial.println(F("ACK RUN"));  return; }
  if (strcmp(tok[0], "STOP") == 0) { running = false; stepActive = false; motors(0,0); digitalWrite(LEDPIN, LOW);  Serial.println(F("ACK STOP")); return; }
  if (strcmp(tok[0], "CLR") == 0)  { qClear(); motors(0,0); Serial.println(F("ACK CLR")); return; }

  // S,d1,d2,ms
  if (strcmp(tok[0], "S") == 0 && nt >= 4) { addStep(atoi(tok[1]), atoi(tok[2]), atoi(tok[3])); return; }

  // RAMP,m,d0,d1,totalMs,steps
  if (strcmp(tok[0], "RAMP") == 0 && nt >= 6) { addRamp(atoi(tok[1]), atoi(tok[2]), atoi(tok[3]), atoi(tok[4]), atoi(tok[5])); return; }

  // TREMOLO,m,base,depth,rateHz,totalMs
  if (strcmp(tok[0], "TREMOLO") == 0 && nt >= 6) { addTremolo(atoi(tok[1]), atoi(tok[2]), atoi(tok[3]), atoi(tok[4]), atoi(tok[5])); return; }

  // XFADE,duty,totalMs,steps
  if (strcmp(tok[0], "XFADE") == 0 && nt >= 4) { addXfade(atoi(tok[1]), atoi(tok[2]), atoi(tok[3])); return; }

  Serial.print(F("ERR ")); Serial.println(tok[0]);
}

// -------------------- Arduino --------------------
void setup() {
  pinMode(MOTOR1, OUTPUT);
  pinMode(MOTOR2, OUTPUT);
  pinMode(LEDPIN, OUTPUT);
  motors(0,0);
  digitalWrite(LEDPIN, LOW);

  Serial.begin(115200);
  delay(300);
  Serial.println(F("VibeBrace Serial READY"));
}

void loop() {
  // 1) Ingreso por Serial (líneas)
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      lineBuf[lineLen] = 0;
      if (lineLen > 0) parseLine(lineBuf);
      lineLen = 0;
    } else if (lineLen < (int)sizeof(lineBuf) - 1) {
      lineBuf[lineLen++] = c;
    }
  }

  // 2) Reproductor de cola
  if (running) {
    if (!stepActive) {
      if (qPop(cur)) {
        motors(cur.d1, cur.d2);
        stepEnd = millis() + cur.ms;
        stepActive = true;
      } else {
        running = false;
        motors(0,0);
        digitalWrite(LEDPIN, LOW);
        Serial.println(F("DONE"));
      }
    } else if ((long)(millis() - stepEnd) >= 0) {
      stepActive = false;
      motors(0,0); // breve silencio entre pasos
    }
  }
}
