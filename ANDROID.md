# Generar APK Android de Rotación de Circuitos

Fecha de la guía: 2026-11-10  
Estado: **guía preparada; todavía no se instaló Capacitor ni se generó el APK.**

Esta guía deja preparado el camino para convertir la PWA en una aplicación
Android instalable con Capacitor. La app web actual sigue funcionando y no es
necesario modificar nada para desplegarla como PWA.

## Decisión de empaquetado

Se usará **Capacitor 7** con los archivos de `dist/` incluidos dentro del APK:

- La interfaz no depende de un hosting ni de una URL remota.
- IndexedDB sigue funcionando dentro del WebView de Android.
- El APK se puede instalar directamente (build `debug`) sin Play Store.
- Las notificaciones deben pasar de Service Worker a notificaciones locales
  nativas.
- La exportación/importación de respaldos y la barra de estado deben revisarse
  en Android; el WebView no se comporta igual que Chrome.

No se elige un TWA porque el objetivo es que todos los archivos vayan dentro del
APK y funcione sin publicar la web. Un TWA requeriría una URL HTTPS y un dominio
configurado.

## Alcance y limitaciones

- Android: sí se puede compilar desde este PC.
- iPhone: no se puede compilar desde Windows. Requiere macOS, Xcode y una cuenta
  de Apple Developer. Para iPhone queda la opción de instalar la PWA con Safari
  > Compartir > Añadir a pantalla de inicio.
- Un APK `debug` sirve para instalar y probar, no para publicar en Play Store.
- En el APK, los horarios oficiales de `public/schedules.json` quedan
  empaquetados. No habrá actualizaciones remotas salvo que más adelante se
  configure una URL real en `src/lib/api.ts` o se publique una nueva versión del
  APK.
- El Service Worker de la PWA no se usará como mecanismo principal dentro del
  APK. El shell ya está empaquetado y las notificaciones serán nativas.

## Entorno ya verificado

En este equipo:

- Android Studio `2024.3.2` (`AI-243.26053.27.2432.13536105`).
- Android Studio incluye JDK 21 en:
  `C:\Program Files\Android\Android Studio\jbr`.
- Android SDK en:
  `C:\Users\Guevara\AppData\Local\Android\Sdk`.
- Build tools disponibles: 33.0.1, 34.0.0, 35.0.0, 35.0.1 y 36.0.0.
- Plataformas Android disponibles: 33, 34 y 35.
- `adb` está en:
  `C:\Users\Guevara\AppData\Local\Android\Sdk\platform-tools\adb.exe`.
- El `java` del PATH es Java 8 y **no sirve para compilar**. Hay que usar el JBR
  21 de Android Studio.
- No hay ningún teléfono conectado por USB en este momento.

Capacitor 7 requiere JDK 21 y compileSdk 35, que están disponibles. La última
versión principal es Capacitor 8, pero no se usará en esta primera compilación
para no exigir un SDK/Android Studio más nuevos.

## Fase 1: crear el APK base

Trabajar desde:

`C:\Users\Guevara\Estudio\Universidad\4to\Programación con web con IA\Proyecto Apagón`

### 1. Preparar Java y Android en la sesión de PowerShell

Estos comandos deben ejecutarse en **la misma terminal** donde se hará el build:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

java -version
adb version
```

`java -version` debe mostrar `openjdk 21`. Si muestra `1.8`, el `JAVA_HOME` no
se aplicó correctamente.

### 2. Instalar Capacitor 7

Las comillas son necesarias en PowerShell por el carácter `@`:

```powershell
npm install "@capacitor/core@^7.6.10" "@capacitor/android@^7.6.10" "@capacitor/local-notifications@^7.0.7"
npm install -D "@capacitor/cli@^7.6.10" "@capacitor/assets@^4.0.0"
```

### 3. Inicializar Capacitor

```powershell
npx cap init "Rotación de Circuitos" "com.guevara.rotacioncircuitos" --web-dir dist
```

Se generará `capacitor.config.ts`. Debe contener algo equivalente a:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.guevara.rotacioncircuitos',
  appName: 'Rotación de Circuitos',
  webDir: 'dist',
};

export default config;
```

El `appId` es el identificador Android. Si se publica en Play Store debe ser
único y no se debe cambiar después de publicar la primera versión.

### 4. Compilar la web y crear el proyecto Android

```powershell
npm run build
npx cap add android
npx cap sync android
```

`npx cap add android` crea la carpeta `android/`. Esa carpeta forma parte del
proyecto nativo y debe conservarse.

### 5. Compilar el APK

```powershell
Set-Location android
.\gradlew.bat assembleDebug
Set-Location ..
Copy-Item .\android\app\build\outputs\apk\debug\app-debug.apk .\RotacionCircuitos-debug.apk
```

La primera compilación puede tardar varios minutos porque Gradle descarga sus
dependencias. Requiere internet.

Si Gradle no encuentra el SDK, crear `android/local.properties` con:

```properties
sdk.dir=C\:\\Users\\Guevara\\AppData\\Local\\Android\\Sdk
```

### 6. Instalar en el teléfono

Por USB:

1. Activar Opciones de desarrollador y Depuración USB en Android.
2. Conectar el teléfono y autorizar el equipo.

```powershell
adb devices
adb install -r .\RotacionCircuitos-debug.apk
```

Sin cable:

1. Copiar `RotacionCircuitos-debug.apk` al teléfono.
2. Abrirlo con el administrador de archivos.
3. Permitir la instalación de apps desconocidas para esa aplicación.

El APK está firmado con la clave de depuración de este equipo y no sirve para
subirlo a Play Store.

## Fase 2: icono y splash de Android

Crear una carpeta `assets/` en la raíz con:

```text
assets/
  icon-only.png          1024 x 1024
  splash.png             2732 x 2732, fondo #0a3b31 y símbolo centrado
```

El icono actual de 512 px está en `public/icons/icon-512.png`. Para una prueba
se puede usar ampliado, pero lo ideal es generar una versión nítida de 1024 px
con el mismo diseño de rayo.

Generar los recursos nativos:

```powershell
npx capacitor-assets generate --android
npx cap sync android
```

Después revisar el nombre visible en:

`android/app/src/main/res/values/strings.xml`

Debe aparecer `Rotación de Circuitos` como `app_name`.

## Fase 3: notificaciones locales nativas

En Chrome, los avisos actuales usan `Notification` + Service Worker. Dentro del
WebView de Capacitor eso no es fiable y puede no estar disponible. Para el APK
hay que usar `@capacitor/local-notifications`.

### 3.1. No registrar el Service Worker en Android

En `src/main.tsx`, registrar el Service Worker solo en web:

```ts
import { Capacitor } from '@capacitor/core';

if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true });
}
```

### 3.2. Adaptar el hook de avisos

En `src/hooks/useOutageNotifications.ts`:

1. Detectar `Capacitor.isNativePlatform()`.
2. En Android, solicitar permiso con
   `LocalNotifications.requestPermissions()` al activar los avisos.
3. Calcular el próximo apagón con `getNextOutage`, igual que ahora.
4. Cancelar el aviso anterior y programar uno nuevo con un ID fijo, por ejemplo
   `1001`, usando la fecha `triggerAt`.
5. Evitar programar dos veces el mismo aviso usando una clave formada por el
   inicio del apagón y los minutos de anticipación.
6. Repetir la programación al cambiar de circuito, al volver la app a primer
   plano y al abrirla.
7. No ejecutar simultáneamente la ruta web del Service Worker y la ruta nativa.

Las notificaciones nativas necesitan permiso de Android 13+ y pueden requerir
permiso de alarmas exactas en Android 12+. Revisar el `AndroidManifest.xml`
generado y añadir lo que corresponda:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
```

Para una app de debug es aceptable. Para Play Store hay que revisar las políticas
de alarmas exactas y justificar su uso; si no, usar una alarma inexacta.

### 3.3. Ajustar la pantalla de Ajustes

`src/pages/SettingsPage.tsx` consulta hoy `Notification.permission` de forma
síncrona. En Android el permiso es asíncrono. Hay que:

- Consultar `LocalNotifications.checkPermissions()`.
- Solicitar permiso con `LocalNotifications.requestPermissions()`.
- Mostrar “Permitido”, “Bloqueado” o “Pendiente” según la respuesta nativa.
- Ocultar el bloque “Instalar aplicación” dentro del APK: `beforeinstallprompt`
  no existe en una app nativa.

### 3.4. Probar

1. Activar el recordatorio con 2–5 minutos de anticipación.
2. Cerrar la app y bloquear el teléfono.
3. Comprobar que el aviso aparece.
4. Probar también con batería optimizada y comprobar si el fabricante retrasa la
   alarma. Algunos Android necesitan excluir la app de la optimización de
   batería.

No prometer entrega exacta en todos los fabricantes: sigue siendo una alarma
local, no push.

## Fase 4: adaptaciones específicas del WebView

Antes de considerar el APK terminado, probar y corregir:

1. **Exportar respaldo JSON.** El `<a download>` con Blob puede no descargar
   archivos en un WebView Android. Si falla, usar
   `@capacitor/filesystem` + `@capacitor/share` para escribir el JSON y abrir la
   hoja de compartir de Android.
2. **Importar respaldo.** Verificar que el selector `<input type="file">` abre
   el selector de archivos de Android. Si no, usar un plugin de archivos.
3. **Botón Atrás.** Comprobar que navega entre las vistas hash y no cierra la
   app de forma inesperada. Si hace falta, añadir `@capacitor/app` y gestionar
   `backButton`.
4. **Barra de estado y safe area.** Android 15 aplica edge-to-edge. Comprobar
   que el header no queda debajo de la barra de estado. Si ocurre, añadir
   `@capacitor/status-bar` y ajustar el color/solapamiento.
5. **Instalación PWA.** El botón de instalación de la PWA no aplica dentro del
   APK y debe ocultarse.
6. **Actualizaciones.** Cada cambio web requiere:
   `npm run build && npx cap sync android &&` volver a compilar el APK.
7. **Datos.** Reinstalar el APK encima de la versión anterior conserva
   IndexedDB si la firma es la misma. Desinstalar la app borra sus datos; pedir
   al usuario exportar un respaldo antes.

## Fase 5: versión de prueba y versión de publicación

El APK generado con `assembleDebug` es para probar. Para una versión de
publicación:

- Crear un keystore y no perderlo.
- Configurar `signingConfigs` en `android/app/build.gradle`.
- Generar `bundleRelease` (AAB) para Play Store o `assembleRelease` (APK) para
  distribución directa.
- Guardar el keystore fuera del repositorio y añadirlo a `.gitignore`.

No crear ni compartir contraseñas del keystore dentro de la documentación o del
código.

## Checklist final

- [ ] El APK instala en un teléfono Android real.
- [ ] Aparece el icono correcto y el splash con la marca.
- [ ] La app abre y navega sin conexión desde la primera ejecución.
- [ ] Los circuitos y dispositivos se guardan tras cerrar y abrir.
- [ ] El botón Atrás se comporta de forma razonable.
- [ ] Exportar e importar un respaldo funciona o está adaptado.
- [ ] Las notificaciones nativas se programan y aparecen con la app cerrada.
- [ ] La barra de estado no tapa el header.
- [ ] `npm run typecheck`, `npm test` y `npm run build` siguen pasando.
- [ ] Se documenta que actualizar la web exige recompilar el APK.

## Archivos que se tocarán cuando se haga

- `package.json` y `package-lock.json`: dependencias de Capacitor.
- `capacitor.config.ts`: configuración nativa.
- `android/`: proyecto Android generado.
- `assets/`: iconos y splash para generar recursos Android.
- `src/main.tsx`: registrar el SW solo en web.
- `src/hooks/useOutageNotifications.ts`: rama nativa de notificaciones.
- `src/pages/SettingsPage.tsx`: permisos nativos y ocultar instalación PWA.
- Posiblemente `src/lib/db.ts` o un helper nuevo para respaldos nativos.

## Referencias oficiales

- Capacitor Android: https://capacitorjs.com/docs/android
- Notificaciones locales: https://capacitorjs.com/docs/apis/local-notifications
- Generación de iconos y splash: https://capacitorjs.com/docs/assets
- Sistema de archivos: https://capacitorjs.com/docs/apis/filesystem
- Compartir archivos: https://capacitorjs.com/docs/apis/share
