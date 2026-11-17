// descargar-circuitos.mjs
import fs from 'fs';

async function descargarTodo() {
  let todosLosPuntos = [];
  
  // Asumiendo que los IDs de provincia van del 1 al 16
  for (let id = 1; id <= 16; id++) {
    try {
      console.log(`Descargando provincia ${id}...`);
      // Cambia esta URL si la petición real tiene un dominio específico (ej. api.masvoces.net)
      const res = await fetch(`https://circuitos.masvoces.net/api/points?province_id=${id}`);
      if (!res.ok) continue;
      const data = await res.json();
      
      if (data.points && data.points.length > 0) {
        // Limpiamos los datos para que pese menos
        const puntosLimpios = data.points.map(p => ({
          lat: p.lat,
          lng: p.lng,
          circuitId: String(p.visibleCircuitId),
          circuitName: p.visibleCircuitName,
          municipality: p.municipalityName
        }));
        todosLosPuntos = todosLosPuntos.concat(puntosLimpios);
      }
    } catch (e) {
      console.log(`Error en provincia ${id}:`, e.message);
    }
  }

  // Guardamos el archivo final
  fs.writeFileSync('public/geo/circuits-points.json', JSON.stringify(todosLosPuntos));
  console.log(`¡Listo! Se guardaron ${todosLosPuntos.length} puntos.`);
}

descargarTodo();