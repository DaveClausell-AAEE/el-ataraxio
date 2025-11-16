/*
=================================================================
 ARCHIVO: server.js
 DESCRIPCIÓN: Servidor Backend (Node.js + WebSocket).
 FUNCIÓN: 
 1. Gestiona la conexión WebSocket con la interfaz web.
 2. Asigna grupos experimentales de forma balanceada.
 3. Recibe los datos finales del experimento y los guarda como archivos .json.
 AUTOR: [Dave Clausell]
 REPOSITORIO: https://github.com/DaveClausell-AAEE/Ataraxia
 LICENCIA: Publicado bajo licencia CC BY 4.0
=================================================================
*/

// --- Dependencias ---
const express = require('express');      // Para servir archivos estáticos (aunque no se usa en este script)
const http = require('http');            // Para crear el servidor HTTP
const WebSocket = require('ws');         // Para la comunicación WebSocket
const path = require('path');            // Para manejar rutas de archivos
const fs = require('fs');                // Para escribir archivos en el sistema

// --- Configuración Inicial: Carpeta de Datos ---
// Crea una carpeta 'data' si no existe, para guardar los JSON.
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log(`Carpeta 'data' creada en: ${dataDir}`);
}
// ------------------------------

// --- Configuración del Servidor ---
const app = express();
// (Opcional: Servir la interfaz web desde este servidor)
// app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- Lógica de Asignación de Grupos ---
// Define los grupos y lleva la cuenta de cuántos hay en cada uno
// para balancear la muestra.
const groups = ['Control', 'Solo Musica', 'Solo Aroma', 'Musica y Aroma'];
let groupAssignments = {
  'Control': 0,
  'Solo Musica': 0,
  'Solo Aroma': 0,
  'Musica y Aroma': 0
};

/**
 * Asigna un grupo al participante, eligiendo el grupo
 * que tenga la menor cantidad de participantes hasta el momento.
 * Si hay empate, elige uno al azar entre los menos asignados.
 * @returns {string} El nombre del grupo asignado.
 */
function assignGroup() {
  let minCount = Infinity;
  let leastAssignedGroups = [];

  // 1. Encontrar el número mínimo de asignaciones
  for (const group of groups) {
    if (groupAssignments[group] < minCount) {
      minCount = groupAssignments[group];
      leastAssignedGroups = [group];
    } else if (groupAssignments[group] === minCount) {
      leastAssignedGroups.push(group);
    }
  }

  // 2. Elegir al azar entre los grupos con menos asignaciones
  const assignedGroup = leastAssignedGroups[Math.floor(Math.random() * leastAssignedGroups.length)];
  
  // 3. Incrementar el contador para ese grupo y retornarlo
  groupAssignments[assignedGroup]++;
  return assignedGroup;
}

// --- Manejador Principal de Conexiones WebSocket ---
wss.on('connection', (ws) => {
  console.log('Cliente (interfaz web) conectado.');

  // --- Manejador de Mensajes del Cliente ---
  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);

      // --- EVENTO: SOLICITAR_GRUPO ---
      // La interfaz web pide un grupo al iniciar el experimento.
      if (parsedMessage.event === 'SOLICITAR_GRUPO') {
        const assignedGroup = assignGroup();
        
        console.log('--- Solicitud de Grupo Recibida ---');
        console.log(`Grupo asignado: ${assignedGroup}`);
        console.log('Estado actual de asignaciones:', groupAssignments);
        console.log('---------------------------');
        
        // Responder SÓLO al cliente que lo pidió
        ws.send(JSON.stringify({ event: 'GROUP_ASSIGNED', group: assignedGroup }));
      
      // --- EVENTO: FIN_EXPERIMENTO ---
      // La interfaz web envía todos los datos al finalizar.
      } else if (parsedMessage.event === 'FIN_EXPERIMENTO') {
        const finalData = parsedMessage.data.all_data;
        const participantId = finalData ? finalData.participantId : null;
        
        if (participantId && participantId.trim().length > 0) {
            // "Sanitizar" el ID para usarlo como nombre de archivo
            const safeParticipantId = participantId.replace(/[^a-z0-9_ -]/gi, '_');
            const fileName = path.join(dataDir, `${safeParticipantId}_data.json`);
            const fileContent = JSON.stringify(finalData, null, 2); // 'null, 2' formatea el JSON para que sea legible

            // Guardar el archivo
            fs.writeFile(fileName, fileContent, 'utf8', (err) => {
                if (err) { console.error(`ERROR AL GUARDAR ${fileName}:`, err); }
                else { console.log(`>>> ¡ÉXITO! Datos del participante ${participantId} guardados en ${fileName}`); }
            });
        } else {
            console.error('ERROR: No se encontró ID de participante en los datos finales. No se pudo guardar el archivo.');
        }
      }
    } catch (error) {
        console.error("Error al procesar el mensaje del cliente:", error);
    }
  });

  ws.on('close', () => {
    console.log('Cliente desconectado.');
  });
});

// --- Iniciar el Servidor ---
const PORT = 3000;
const HOST = '0.0.0.0'; // Escucha en todas las interfaces, no solo localhost

server.listen(PORT, HOST, () => {
  console.log(`Servidor iniciado y escuchando en http://${HOST}:${PORT}`);
  console.log('Esperando conexiones de la interfaz web...');
  console.log('Estado inicial de asignaciones:', groupAssignments);
});
