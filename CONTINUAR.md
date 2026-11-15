# CONTINUAR — Rotación de Circuitos

Fecha de corte: 2026-11-10  
Estado: **entrega funcional y verificada**. La PWA compila, pasa los tests y
abre sin conexión después de una primera carga.

Este archivo es un traspaso breve. La documentación principal está en
`README.md` y las justificaciones de diseño en `DECISIONS.md`.

## Comandos

```powershell
npm install
npm run typecheck
npm test
npm run build
npm run preview
```

Para la PWA completa se debe usar `build` + `preview`, no `npm run dev`. El
Service Worker está desactivado en desarrollo a propósito.

## Verificado

- `npm run typecheck`: app y Service Worker sin errores.
- `npm test`: 25/25 tests.
- `npm run build`: correcto; JS inicial 64.80 kB gzip.
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
8. Mantener el JS inicial por debajo de 200 kB gzip. El presupuesto actual es
   amplio (64.80 kB gzip), pero no añadir librerías grandes sin medir.

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
