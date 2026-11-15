# Decisiones de diseño y producto

Este documento explica por qué la aplicación funciona como funciona. Sirve para
poder cambiar el código sin romper supuestos importantes.

## 1. Los horarios representan ventanas CON LUZ

**Decisión:** cada intervalo del JSON indica cuándo hay energía. El apagón es el
tiempo entre dos ventanas de luz.

**Motivo:** la app necesita calcular tanto el estado actual como el próximo
apagón y las ventanas de carga. Modelar la luz evita duplicar datos y permite
calcular correctamente una ventana nocturna.

**Consecuencia:** una lista vacía no significa “sin información” ni “sin
apagones”: significa que no hay ninguna ventana con luz definida para ese día.

## 2. Inicio igual a fin significa 24 horas

**Decisión:** `00:00–00:00` representa un día completo con luz, no una ventana
vacía.

**Consecuencia:** para no definir luz ese día se debe usar una lista vacía o
simplemente omitir la clave del día.

## 3. Una ventana nocturna pertenece al día declarado

**Decisión:** `22:00–02:00` empieza el día indicado y termina en la madrugada
del día siguiente.

**Motivo:** es la interpretación más natural para un horario semanal y evita
tener que repetir la misma información en dos días.

**Consecuencia:** la colección de ventanas empieza a calcular desde un día antes
del rango solicitado para incluir ventanas nocturnas que siguen vigentes.

## 4. Las ventanas solapadas o consecutivas se fusionan

**Decisión:** dos ventanas se consideran continuas cuando la segunda empieza en
el mismo instante en que termina la primera. En ese caso se convierten en una
sola ventana.

**Motivo:** evita mostrar dos ventanas de carga separadas cuando en la realidad
la luz nunca se cortó. La fusión se aplica también entre días.

**Consecuencia:** la duración que se muestra es la de la ventana fusionada.

## 5. El estado y el próximo apagón usan una búsqueda acotada

**Decisión:** las ventanas de carga se buscan hasta 31 días hacia adelante. Los
apagones se buscan desde 32 días atrás.

**Motivo:** un calendario semanal es teóricamente infinito. La app es una PWA
ligera y no debe recorrer fechas sin límite.

**Consecuencia:** si no hay ninguna ventana dentro del horizonte, la app no
inventa un apagón; devuelve que no hay próximo apagón conocido.

## 6. `getNextOutage` incluye el apagón en curso

**Decisión:** si ya se está dentro de un apagón, se devuelve ese apagón con su
inicio real y el comienzo de la siguiente ventana de luz como fin. Si hay luz,
se devuelve el próximo apagón completo.

**Motivo:** el usuario necesita saber en todo momento cuánto falta para que
vuelva la luz, no solo el siguiente corte futuro.

**Consecuencia:** la estimación de carga de una ventana activa usa solo el
tiempo restante, aunque la ventana completa sea más larga.

## 7. `getNextChargeWindows` conserva el inicio original

**Decisión:** la primera ventana devuelta puede ser la ventana activa. Se
incluye con su hora de inicio real, no con la hora actual.

**Motivo:** la UI debe poder explicar que la ventana ya había empezado, por
ejemplo “Hoy · 10:30 — 14:00”.

**Consecuencia:** para estimar la carga de esa ventana se usa el tiempo
restante, no `durationMin` completo.

## 8. Tiempo local con `Date` nativo

**Decisión:** no se instala `date-fns` ni otra librería de fechas. Se usa
`Date` y utilidades propias con fecha/hora local.

**Motivo:** reduce el peso del bundle y los cálculos necesarios son acotados.

**Consecuencia:** los horarios son locales al dispositivo. Un cambio de zona
horaria o de hora del sistema afecta la interpretación, igual que en un reloj.

## 9. IndexedDB es la fuente de verdad

**Decisión:** circuitos, dispositivos, ajustes y metadatos se guardan en
IndexedDB. No se usa `localStorage` para los datos de la app.

**Motivo:** soporta estructuras, transacciones y capacidades mayores, y es
adecuado para una PWA offline.

**Consecuencia:** la UI lee primero de IDB. La red es una actualización, no un
requisito para pintar.

## 10. Respaldo local para el primer arranque

**Decisión:** `src/data/fallbackSchedules.ts` contiene una copia de los datos
oficiales iniciales. Se usa solo cuando IDB está vacío y falla la descarga.

**Motivo:** permite abrir la app por primera vez sin red o con una respuesta
inválida del servidor.

**Consecuencia:** el respaldo y `public/schedules.json` deben mantenerse
sincronizados. El respaldo no sustituye al JSON oficial en cargas posteriores.

## 11. Sincronización condicionada por `updatedAt`

**Decisión:** un archivo remoto solo se aplica si su `updatedAt` es posterior al
guardado localmente.

**Motivo:** evita que una caché vieja del navegador o un despliegue atrasado
pisen datos más recientes.

**Consecuencia:** si se publican cambios en los horarios sin aumentar
`updatedAt`, la app los ignorará.

## 12. Los circuitos oficiales protegidos se convierten en personales

**Decisión:** editar un circuito oficial guarda una copia con `source: "user"` y
el mismo ID. La fusión remota descarta el circuito oficial con ese ID y conserva
la copia del usuario. Los circuitos oficiales sin editar no se pueden borrar.

**Motivo:** el usuario debe poder corregir su horario sin que una actualización
remota borre sus cambios, pero sin perder la posibilidad de restaurar el
circuito original mediante un respaldo.

**Consecuencia:** la sincronización nunca sobrescribe un circuito personal.

## 13. `schedules.json` usa Stale-While-Revalidate

**Decisión:** el shell se precachea, pero el JSON de horarios se sirve con
`StaleWhileRevalidate` en la caché `official-schedules`.

**Motivo:** la app debe abrir rápido y funcionar offline. El JSON puede
actualizarse en segundo plano sin bloquear la primera pintura.

**Consecuencia:** puede mostrarse la versión anterior durante una carga; la
siguiente carga suele recibir la actualización. Es un compromiso aceptado.

## 14. Los avisos son best-effort

**Decisión:** los recordatorios se programan mediante mensajes al Service
Worker y un temporizador de respaldo en la página. El SW persiste el recordatorio
en Cache Storage para intentar restaurarlo cuando vuelve a despertar. No hay
backend push.

**Motivo:** el proyecto no tiene servidor y se quiere mantener todo local.

**Consecuencia:** el sistema operativo puede retrasar o cancelar el aviso si la
PWA está cerrada. No se promete una entrega exacta. La app no muestra avisos
retroactivos si el momento programado ya pasó.

## 15. Navegación por hash y CSS puro

**Decisión:** se usa un router propio con `location.hash`, iconos SVG inline y
CSS puro. No se instalan React Router, Tailwind ni una librería de iconos.

**Motivo:** mantener el JavaScript inicial por debajo de 200 kB gzip y permitir
despliegue estático sin rewrites.

**Consecuencia:** las URLs tienen la forma `#/dispositivos`; los enlaces
profundos funcionan sin configuración especial del servidor.

## 16. Accesibilidad y uso en gama baja

**Decisión:** la interfaz parte de 320 px, usa botones de al menos 44 × 44 px,
texto grande, foco visible, enlace “Saltar al contenido”, roles y etiquetas
ARIA donde aportan información, y respeta `prefers-reduced-motion`.

**Motivo:** el caso de uso incluye teléfonos de gama baja, luz exterior y
personas que necesitan alto contraste.

**Consecuencia:** los temas claro, oscuro y sistema comparten las mismas
variables CSS para mantener el contraste.

## 17. Pruebas del motor puro

**Decisión:** la lógica de horarios se concentra en `src/lib/schedule.ts` y se
prueba con Vitest sin DOM ni navegador. Los 25 tests cubren ventanas normales,
cruces de medianoche, fusión, fechas específicas, apagón activo, límites,
estimaciones y cuenta regresiva.

**Motivo:** es la parte con más riesgo lógico y la más fácil de romper al
cambiar la UI.

**Consecuencia:** los cambios en la semántica de horarios deben actualizar los
tests y este documento.

## Futuro (no implementado)

- Backend opcional con notificaciones push reales.
- Sincronización entre dispositivos y cuentas.
- Editor de fechas específicas más avanzado.
- Pruebas E2E con Playwright y auditoría automatizada de accesibilidad.
- Actualización manual visible cuando haya una versión nueva del Service
  Worker.
