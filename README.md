# Rotación de Circuitos

PWA offline-first para consultar los horarios de apagón de cada circuito, ver
las próximas ventanas con luz y estimar cuánto puede cargarse un dispositivo
durante ellas. No tiene backend, cuentas, analítica ni publicidad: todos los
datos personales se guardan en el navegador.

## Funcionalidades

- Estado actual **CON LUZ / SIN LUZ** y cuenta regresiva en tiempo real.
- Próximo apagón y las siguientes ventanas de carga.
- Varios circuitos con horario semanal o con fechas específicas.
- Asistente «Mi circuito» por provincia, municipio y zona, con geolocalización
  opcional y dirección de referencia guardada solo en el dispositivo.
- Catálogo de dispositivos por categoría y modelo, con cálculo de carga para
  power banks, UPS, laptops y otros equipos.
- Avisos locales configurables antes del apagón.
- Exportación e importación de todos los datos en JSON.
- Temas claro, oscuro y automático.
- Funcionamiento sin conexión después de la primera visita.
- Interfaz usable desde 320 px, con controles de al menos 44 × 44 px.

## Stack

- React 18 + TypeScript.
- Vite 7.
- Zustand para el estado global.
- IndexedDB mediante `idb`.
- Vitest para el motor de horarios, el catálogo, la búsqueda Haversine y el
  índice geográfico.
- `vite-plugin-pwa` con `injectManifest` y Workbox.
- CSS puro, sin framework de estilos ni librería de iconos.

## Requisitos

- Node.js 20.19 o superior (también se admite Node 22.12+). El proyecto se
  verificó con Node 24.15 y npm 11.12.
- Un navegador moderno con JavaScript, IndexedDB y Service Worker.

## Inicio rápido

```powershell
npm install
npm run dev
```

Abre la URL que muestra Vite. Durante el desarrollo el Service Worker está
desactivado a propósito (`devOptions.enabled: false`), por lo que la app no
será offline y las notificaciones programadas no podrán probarse igual que en
producción.

Para probar la PWA completa:

```powershell
npm run build
npm run preview
```

Abre `http://localhost:4173`, carga la página una vez y después prueba recargar
sin conexión desde DevTools > Network > Offline.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo sin Service Worker. |
| `npm run typecheck` | Comprueba la app y el Service Worker con TypeScript. |
| `npm test` | Ejecuta los tests una vez. |
| `npm run test:watch` | Ejecuta Vitest en modo interactivo. |
| `npm run build` | Typecheck y build de producción con la PWA. |
| `npm run preview` | Sirve el contenido de `dist/` para probar la PWA. |

## Cómo se interpretan los horarios

Los intervalos del JSON representan **ventanas CON LUZ**, no apagones. La app
calcula el apagón como el tiempo restante entre dos ventanas.

- `{"start":"10:30","end":"14:00"}`: hay luz de 10:30 a 14:00.
- `{"start":"22:00","end":"02:00"}`: la ventana empieza el día declarado y
  termina al día siguiente.
- `{"start":"00:00","end":"00:00"}`: hay luz durante 24 horas.
- Una lista vacía significa que ese día no hay ninguna ventana de luz conocida.
- Las ventanas solapadas o consecutivas se fusionan automáticamente.

El horario semanal usa las claves `monday` a `sunday`. También se admite una
lista de fechas específicas:

```json
[
  {
    "date": "2026-11-14",
    "intervals": [{ "start": "08:00", "end": "12:00" }]
  }
]
```

Todas las horas se interpretan en la zona horaria local del dispositivo.

## Datos oficiales

La fuente remota de ejemplo es `public/schedules.json`. Para actualizarla:

1. Mantén estable el `id` de cada circuito. Ese ID relaciona los datos remotos
   con IndexedDB.
2. Modifica los horarios cuando sea necesario.
3. Actualiza `updatedAt` a una fecha ISO 8601 posterior, por ejemplo
   `2026-11-20T12:00:00.000Z`. La app solo aplica datos remotos si son más
   recientes que los guardados.
4. Si cambias los datos de ejemplo, sincroniza también
   `src/data/fallbackSchedules.ts`; ese archivo permite el primer arranque sin
   red.

Estructura mínima:

```json
{
  "version": 1,
  "updatedAt": "2026-11-20T12:00:00.000Z",
  "circuits": [
    {
      "id": "c-centro-01",
      "name": "Centro · C-01",
      "schedule": {
        "monday": [{ "start": "10:30", "end": "14:00" }],
        "tuesday": [],
        "wednesday": [],
        "thursday": [],
        "friday": [],
        "saturday": [],
        "sunday": []
      }
    }
  ]
}
```

Al editar un circuito oficial, la app crea una copia personal
(`source: "user"`). Las actualizaciones oficiales no sobrescriben esa copia y
los circuitos oficiales originales no se pueden borrar. Los circuitos creados
por el usuario sí se pueden eliminar.

## Persistencia y sincronización

- IndexedDB `rotacion-circuitos` es la fuente de verdad local.
- En el primer arranque sin datos se intenta descargar el JSON; si falla, se
  usa el respaldo incluido en el bundle.
- Los datos ya guardados se pintan primero y la descarga se hace en segundo
  plano.
- La sincronización se reintenta al recuperar conexión, al volver a la pestaña
  y cada 6 horas.
- `schedules.json` se cachea con Stale-While-Revalidate. Por eso puede aparecer
  una versión anterior durante una carga y actualizarse en la siguiente.
- Los ajustes se guardan en la misma base de datos; no se usa `localStorage`
  para los datos de la app.

## Dispositivos

Añadir un dispositivo son dos pasos: primero se elige la categoría y después el
modelo, con buscador y una opción «No sé» por categoría.

- El catálogo (`src/data/devicePresets.ts`) se carga bajo demanda en un chunk
  aparte y no entra en el JS inicial.
- Al guardar se copian capacidad, potencia y eficiencia al dispositivo, junto
  con `presetId` como metadato de origen. Cambiar el catálogo no altera equipos
  ya guardados.
- «No sé» usa valores conservadores y la app avisa de que son estimados.
- Los ajustes técnicos (capacidad en mAh/Wh, cargador y eficiencia) están en
  «Ajustes avanzados», cerrado por defecto tras añadir un modelo.
- iPhone 14 se puede añadir en tres toques: Añadir dispositivo → Teléfono →
  iPhone 14.

## Mi circuito y ubicación

La ruta `#/mi-circuito` ayuda a identificar el circuito sin saber su código.
Hay dos formas de elegir y la selección se guarda en IndexedDB:

- **Elegir por lista**: provincia → municipio → zona. Los datos salen de
  `public/geo/circuits-index.json`, que incluye las 15 provincias y la Isla de
  la Juventud. Los municipios y zonas se derivan de los campos opcionales
  `province` y `municipality` de `schedules.json`; si faltan, se agrupan bajo
  «Sin provincia» / «Sin municipio». No se inventan ubicaciones.
- **Buscar en el mapa**: Leaflet se importa dinámicamente solo al abrir esta
  opción (`import('leaflet')`) y no entra en el precache. Al tocar el mapa o
  pulsar «Usar mi ubicación actual» se busca el circuito más cercano.
- La búsqueda usa `src/lib/circuitLookup.ts`: descarga perezosa de
  `public/geo/circuits-points.json` (~6.855 puntos), caché en memoria y la
  fórmula de Haversine escrita en TypeScript, sin dependencias externas. El
  fetch solo ocurre al abrir el mapa, nunca en el arranque de la app.
- Si el punto más cercano está a 5 km o menos, se muestra «Tu circuito es:
  [nombre] (Municipio: [municipio])» y el botón «Guardar mi circuito». Si está
  más lejos, se pide usar la lista manual.
- Al guardar se persiste el `circuitId` en IndexedDB (ajustes) y se vuelve a
  Inicio. Si los horarios oficiales todavía no incluyen ese circuito, se crea
  un registro local sin ventanas de luz para conservar la elección; el usuario
  puede completar el horario desde la pantalla del circuito.
- El JSON de puntos no se precachea: el Service Worker lo guarda con
  `CacheFirst` la primera vez que se usa, de modo que las siguientes búsquedas
  funcionan sin conexión.
- La dirección es opcional, se guarda en IndexedDB y no se usa para calcular la
  zona. «Buscar mi dirección» es una acción aparte con consentimiento explícito
  para consultar Nominatim; si falla, el flujo principal no se ve afectado.

## Respaldo

Ajustes > Respaldo de datos permite exportar un JSON con circuitos,
dispositivos, preferencias y la fecha de última actualización. La importación
reemplaza los datos actuales después de pedir confirmación. El archivo no se
envía a ningún servidor.

## Notificaciones

La app solicita permiso en el momento de activar los avisos. El aviso se
programa en el Service Worker y se deja un temporizador de respaldo en la
pestaña abierta. Es una implementación local **best-effort**:

- No hay servidor de notificaciones push.
- El sistema puede no despertar el Service Worker exactamente a la hora
  programada, especialmente si el navegador cierra la app.
- La entrega es más fiable si la PWA está instalada y con permisos concedidos.
- Nunca se muestra un aviso retroactivo si ya pasó el momento previsto.

## Estructura del proyecto

```text
public/
  favicon.svg
  geo/                   Índice de zonas y GeoJSON opcionales por provincia
  icons/                 Iconos normales y maskable de la PWA
  schedules.json         Datos oficiales de ejemplo
scripts/                 Generador del índice geográfico
src/
  components/            Iconos SVG y navegación inferior
  data/                  Catálogo de dispositivos y respaldo de horarios
  hooks/                 Tema, ruta, conexión, instalación y avisos
  lib/                   Horarios, fechas, IDB, validación, API, geo y backups
  pages/                 Inicio, Circuito, Mi circuito, Dispositivos y Ajustes
  store/                 Estado global con Zustand
  App.tsx                Shell, hidratación y navegación
  main.tsx               Montaje de React y registro del Service Worker
  styles.css             Sistema visual responsive y temas
  sw.ts                  Service Worker con precache y SWR
  types.ts               Contratos de datos
  vite-env.d.ts          Tipos de Vite/PWA
index.html
vite.config.ts           Build, tests y manifest PWA
tsconfig.json
tsconfig.sw.json
```

## Verificación realizada

- `npm run typecheck`: correcto para la app y el Service Worker.
- `npm test`: 59/59 tests (25 del motor de horarios, 7 del catálogo, 11 del
  índice geográfico, 10 de geometría y 6 del estado de pestañas).
- `npm run build`: correcto.
- JavaScript inicial: 193.19 kB minificado → **62.53 kB gzip**, por debajo del
  límite de 90 kB. Leaflet no forma parte del bundle inicial.
- Chunks bajo demanda: Leaflet 149.90 kB → **43.48 kB gzip** (CSS 6.46 kB gzip),
  Mi circuito 4.15 kB gzip, Dispositivos 4.26 kB gzip, catálogo 2.02 kB gzip,
  Circuito 3.42 kB gzip y Ajustes 3.48 kB gzip. Leaflet y su CSS quedan fuera
  del precache; el resto sí se precachea (30 entradas, 409.95 KiB).
- Índice geográfico: 17 entradas (16 provincias + «Sin provincia»), 3 zonas, sin
  IDs duplicados. Pesa 2.31 kB (557 B gzip), muy por debajo del límite de 40 kB.
- `public/geo/circuits-points.json` contiene 6.855 puntos (~792 kB). No entra en
  el precache: se descarga al abrir el mapa y el Service Worker lo guarda con
  `CacheFirst` para las siguientes búsquedas sin conexión.
- Recarga offline probada con Service Worker controlando la página: shell,
  circuitos, navegación y banner de conexión funcionan sin red.
- Sin desbordamiento horizontal comprobado a 320 px en Inicio, Circuito y
  Ajustes.
- `npm audit --omit=dev`: 0 vulnerabilidades de producción.

Vite muestra 9 vulnerabilidades en dependencias de desarrollo. No se ha
ejecutado `npm audit fix --force` para no introducir cambios mayores sin
revisión.

## Despliegue

Es una aplicación estática. Sirve `dist/` en cualquier hosting con HTTPS (el
Service Worker requiere HTTPS o `localhost`). No necesita rewrites de servidor
porque las rutas usan hash (`#/circuito`, `#/mi-circuito`, `#/dispositivos`,
`#/ajustes`).

En Netlify o Vercel basta con:

- Build command: `npm run build`
- Output directory: `dist`

Para GitHub Pages bajo un subdirectorio, genera el build con la base
correspondiente:

```powershell
npm run build -- --base=/nombre-del-repo/
```

Después publica el contenido de `dist/`. Verifica que `schedules.json` y
`icons/` se sirven desde la misma base.

## Prueba manual recomendada antes de entregar

1. `npm run build` y `npm run preview`.
2. Recargar una vez para que el Service Worker tome el control.
3. DevTools > Application: comprobar precache, IndexedDB y
   `official-schedules`.
4. Activar Offline y hacer una recarga fuerte.
5. Probar cambio de circuito, guardado, recarga y exportación/importación.
6. Probar la instalación y los avisos con permiso concedido.
7. Revisar Lighthouse y la consola sin errores.

## Limitaciones conocidas

- Los avisos locales no equivalen a push con un backend; la entrega exacta en
  segundo plano depende del sistema operativo y del navegador.
- El cálculo de carga es orientativo: parte de batería vacía, usa 3.7 V cuando
  solo hay mAh y aplica 85 % de eficiencia por defecto.
- Los cambios en `schedules.json` pueden tardar una carga adicional en verse
  por el comportamiento SWR.
- No hay autenticación ni sincronización entre dispositivos.
