import express from 'express';
import path from 'path';
import { processFileController, getProcessingStatus } from './controllers/data_controller';
import { getDbPool } from './config/db';
import { generateDataFile } from './generateFile';

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE_PATH = path.join(__dirname, '..', 'challenge', 'input', 'CLIENTES_IN_0425.dat');

/*cuando se levanta la app se regenera el archivo de datos de entrada con los parámetros fijados */
async function startServer() {
  try {
    await getDbPool(); // Asegura conexión a la base

    console.log('📄 Generando archivo de datos inicial...');
    await generateDataFile(100000, 0.20); // Espera a que termine antes de levantar el server
    console.log('✅ Archivo de datos generado correctamente.');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor Express escuchando en puerto ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err);
    process.exit(1);
  }
}

startServer();

/*servicio para poblar la tabla Clientes con los datos procesados del archivo de entrada */
app.get('/health', async (req, res) => {
  try {
    await processFileController(DATA_FILE_PATH); // Usa el archivo ya generado al iniciar
    res.status(200).json(getProcessingStatus());
  } catch (err) {
    console.error('[ERROR] Falló el procesamiento en /health:', err);
    res.status(500).json({ error: 'Error durante la ejecución de /health' });
  }
});

/* servicio para disponibilizar información del proceso de docker con sus parámetros de consumos de recursos */
app.get('/metrics', (req, res) => {
  const memoriaUso = process.memoryUsage();
  const cpuUso = process.cpuUsage();

  res.json({
    memoria: memoriaUso,
    cpu: cpuUso,
    uptime: process.uptime() // segundos que lleva corriendo el proceso
  });
});

export default app;