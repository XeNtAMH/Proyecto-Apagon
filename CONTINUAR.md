# CONTINUAR — Rotación de Circuitos

Fecha de corte: 2026-11-15  
Estado: **entrega funcional y verificada**. La PWA compila, pasa los tests y
abre sin conexión después de una primera carga.

Este archivo es un traspaso breve. La documentación principal está en
`README.md` y las justificaciones de diseño en `DECISIONS.md`.

## Comandos

```powershell
npm install
npm run typecheck
npm test
npm run geo:index
npm run build
npm run preview
```

Para la PWA completa se debe usar `build` + `preview`, no `npm run dev`. El
Service Worker está desactivado en desarrollo a propósito.

## Verificado

- `npm run typecheck`: app y Service Worker sin errores.
- `npm test`: 53/53 tests (25 del motor de horarios, 7 del catálogo, 9 de
  búsqueda por Haversine, 6 del índice geográfico y 6 del estado de pestañas).
- `npm run build`: correcto; JS inicial 62.53 kB gzip (límite 90 kB).
- Chunks bajo demanda verificados: Dispositivos, Mi circuito, catálogo de
  dispositivos, Circuito y Ajustes. La PWA los precachea, así que siguen
  disponibles offline. Leaflet (43.48 kB gzip + 6.46 kB CSS) queda fuera del
  bundle inicial y del precache: solo se descarga al abrir «Buscar en el mapa».
- `npm run geo:index`: genera las 16 provincias (15 + Isla de la Juventud) y
  3 zonas a partir de `schedules.json`. Precache: 30 entradas. Los 6.855 puntos
  de `circuits-points.json` no se precachean; el Service Worker los guarda en
  `CacheFirst` al abrir el mapa.
- Prueba real con Service Worker controlando la página:
  - recarga offline del shell y de las rutas;
  - IndexedDB con los 3 circuitos;
  - banner “Sin conexión”;
  - navegación y datos oficiales disponibles.
- Comprobación a 320 px sin desbordamiento horizontal.
- Revisión visual de Inicio, Circuito, Dispositivos y Ajustes en claro y oscuro.
- `npm audit --omit=dev`: 0 vulnerabilidades de producción.

Las 9 vulnerabilidades que informa la instalación están en dependencias de
desarrollo. No ejecutar `npm audit fix --force` sin revisar los cambios de
versión.

## Dónde tocar cada cosa

- Lógica de horarios, ventanas, apagones y estimaciones:
  `src/lib/schedule.ts` y `src/lib/schedule.test.ts`.
- Persistencia IndexedDB: `src/lib/db.ts`.
- Estado global y sincronización: `src/store/useAppStore.ts`.
- Horarios oficiales: `public/schedules.json` y, para el primer arranque
  offline, `src/data/fallbackSchedules.ts`.
- Catálogo de dispositivos y flujo de selección por categoría/modelo:
  `src/data/devicePresets.ts` (chunk lazy) y `src/pages/DevicesPage.tsx`.
- Mi circuito: `src/pages/MiCircuito.tsx` (lazy), `src/lib/geo.ts` (lista
  manual), `src/lib/circuitLookup.ts` (Haversine y puntos cercanos),
  `src/lib/miCircuitoState.ts` y sus tests. Leaflet se importa dinámicamente
  dentro del efecto de la pestaña del mapa.
- Índice geográfico: `scripts/build-geo-index.mjs` genera
  `public/geo/circuits-index.json` y `public/geo/zones/manifest.json`. Los
  GeoJSON opcionales van en `public/geo/zones/<provincia>.geojson`.
- Shell y navegación: `src/App.tsx`.
- Pantallas: `src/pages/`.
- Estilos y temas: `src/styles.css`.
- Service Worker, precache y avisos: `src/sw.ts`.
- PWA/manifest: `vite.config.ts`, `public/icons/` e `index.html`.

## Reglas que no conviene romper

1. Los intervalos JSON son ventanas **con luz**, no apagones.
2. `inicio === fin` significa 24 horas con luz.
3. Las ventanas nocturnas pertenecen al día declarado y terminan al siguiente.
4. Al publicar horarios nuevos hay que aumentar `updatedAt`; si no, la app
   ignora el cambio.
5. Editar un circuito oficial crea una copia personal que la sincronización no
   sobrescribe.
6. IndexedDB es la fuente de verdad; la app debe pintar datos guardados antes
   de esperar red.
7. Los avisos locales son best-effort, no push real. No prometer entrega exacta
   con la aplicación cerrada.
8. Mantener el JS inicial por debajo de 90 kB gzip. Las páginas secundarias
   (incluida Mi circuito) van con `React.lazy`, el catálogo de dispositivos con
   `import()` dinámico y el índice geográfico es un JSON de datos, no código.
9. El índice geográfico incluye las 16 provincias reales, pero municipios y
   zonas de la lista manual se derivan solo de `schedules.json`: no inventar
   ubicaciones. Si faltan, se usa «Sin provincia» / «Sin municipio». La búsqueda
   del mapa usa `public/geo/circuits-points.json` y Haversine con un máximo de
   5 km; ese JSON y Leaflet se descargan solo al abrir el mapa, nunca en el
   arranque.

## Pendientes manuales opcionales

Nada bloquea la entrega. Antes de publicar conviene repetir en un dispositivo o
navegador real:

1. Probar permiso y recepción de una notificación programada a pocos minutos.
2. Instalar la PWA y confirmar el icono maskable en la pantalla de inicio.
3. Ejecutar Lighthouse en `npm run preview`.
4. Probar el despliegue real con HTTPS, especialmente el alcance de `sw.js` y
   la ruta `schedules.json` si se publica en un subdirectorio.

## Limitaciones conocidas

- Sin backend no hay push garantizado en segundo plano.
- SWR puede mostrar una actualización de horarios una carga tarde.
- La estimación de carga parte de batería vacía y es orientativa.
- No hay cuentas ni sincronización entre dispositivos.
- Los horarios actuales no incluyen provincia ni municipio, así que los 3
  circuitos se agrupan bajo «Sin provincia» / «Sin municipio». Las 16
  provincias existen en el índice, pero aún no tienen municipios ni zonas.
- Los circuitos encontrados por GPS pueden no tener horario en
  `schedules.json`; en ese caso se guarda un registro local sin ventanas de luz
  hasta que se publique su horario o el usuario lo complete a mano.
- La geolocalización requiere HTTPS (o localhost) y permiso del navegador; los
  errores se explican en lenguaje llano.
