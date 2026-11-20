import fs from 'fs';
import path from 'path';

// 1. Configuración de carpetas
const rawDir = './catalog/raw';
const outputJsonPath = './public/data/devices.json';
const outputTsPath = './src/data/fallbackDevices.ts';

function build() {
  console.log('Iniciando construcción del catálogo...');
  let allDevices = [];

  // Leer todos los archivos de la carpeta raw
  const files = fs.readdirSync(rawDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf8'));
    allDevices = allDevices.concat(data);
    console.log(`- Leídos ${data.length} equipos de ${file}`);
  }

  // 2. Validar y Limpiar
  const uniqueDevices = new Map();
  const validDevices = allDevices
    .filter((d) => {
      if (
        !d.id ||
        !d.batteryWh ||
        d.batteryWh <= 0 ||
        !d.chargeWatts ||
        d.chargeWatts <= 0
      ) {
        console.warn(`Descartado equipo inválido: ${d.model || 'Desconocido'}`);
        return false;
      }
      if (uniqueDevices.has(d.id)) return false; // Evitar duplicados
      uniqueDevices.set(d.id, true);
      return true;
    })
    .map((d) => {
      return {
        ...d,
        efficiency: d.efficiency || 0.85, // 85% por defecto
        rechargeable: d.rechargeable !== false,
      };
    });

  // 3. Compresión (Guardar como Array de Arrays para ahorrar 50% de espacio)
  const columns = [
    'id',
    'category',
    'brand',
    'model',
    'batteryWh',
    'chargeWatts',
    'efficiency',
    'rechargeable',
    'source',
    'confidence',
  ];
  const compactDevices = validDevices.map((d) => [
    d.id,
    d.category,
    d.brand,
    d.model,
    d.batteryWh,
    d.chargeWatts,
    d.efficiency,
    d.rechargeable,
    d.source || 'manual',
    d.confidence || 'medium',
  ]);

  const finalOutput = {
    version: 1,
    updatedAt: new Date().toISOString(),
    columns,
    devices: compactDevices,
  };

  // 4. Guardar los archivos para la PWA
  if (!fs.existsSync('./public/data')) {
    fs.mkdirSync('./public/data', { recursive: true });
  }
  fs.writeFileSync(outputJsonPath, JSON.stringify(finalOutput));

  const tsContent = `// Archivo autogenerado. No editar a mano.\nexport const FALLBACK_DEVICES = ${JSON.stringify(finalOutput, null, 2)} as const;\n`;
  fs.writeFileSync(outputTsPath, tsContent);

  console.log(
    `\nÉxito! Catálogo generado con ${validDevices.length} equipos válidos.`,
  );
  console.log(`Archivo JSON listo en: ${outputJsonPath}`);
}

build();
