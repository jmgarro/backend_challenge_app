// src/index.ts

import express from 'express'; // Importamos la librería Express para crear el servidor web
import sql from 'mssql';      // Importamos el módulo mssql para interactuar con SQL Server
import path from 'path';      // Importamos path para manejar rutas de archivos
import fs from 'fs';          // Importamos fs para operar con el sistema de archivos (lectura de streams)

// Importamos date-fns para manejo de fechas
import { parse, isValid } from 'date-fns';

// Configuración de la base de datos obtenida de las variables de entorno
const dbConfig: sql.config = {
    user: process.env.DB_USER,          
    password: process.env.DB_PASSWORD,  
    server: process.env.DB_HOST || 'localhost', 
    database: process.env.DB_DATABASE,  
    options: {
        encrypt: false, 
        trustServerCertificate: true 
    }
};

// Variables globales para estado de procesamiento
let isProcessingFile: boolean = false;
let lastProcessingStatus: string = 'Inactivo';
let processedRecords: number = 0;
let errorRecords: number = 0;

// Inicializamos Express
const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint /health
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Service is healthy and running.',
        fileProcessing: isProcessingFile ? 'Activo' : 'Inactivo',
        lastProcessingStatus,
        processedRecords,
        errorRecords
    });
});

// Función para conectar a la DB
async function connectToDatabase() {
    try {
        await sql.connect(dbConfig);
        console.log('Conexión a SQL Server establecida exitosamente.');
    } catch (err) {
        console.error('Error al conectar a SQL Server:', err);
        process.exit(1);
    }
}

// Función para parsear cada línea válida
function parseClientLine(line: string): any | null {
    const parts = line.split('|');

    if (parts.length !== 7) {
        console.warn(`[WARN] Línea corrupta (formato incorrecto): "${line}"`);
        errorRecords++;
        return null;
    }

    try {
        const [
            nombre,
            apellido,
            dni,
            estado,
            fechaIngresoStr,
            esPepStr,
            esSujetoObligadoStr
        ] = parts;

        const nombreCompleto = `${nombre} ${apellido}`;

        const parsedDNI = parseInt(dni, 10);
        if (isNaN(parsedDNI)) throw new Error(`DNI inválido: ${dni}`);

        if (!estado || estado.length > 10) throw new Error(`Estado inválido o demasiado largo: ${estado}`);

        // Parseo de fecha con date-fns
        let parsedFechaIngreso: Date | null = null;
        const trimmedFecha = fechaIngresoStr.trim();

        // Detectar fechas explícitamente inválidas
        const invalidValues = ['0000-00-00', '00/00/0000', '99/99/9999', '9999-99-99'];
        if (trimmedFecha && !invalidValues.includes(trimmedFecha)) {
            let date: Date | null = null;

            const formatsToTry = ['MM/dd/yyyy', 'yyyy-MM-dd'];

            for (const format of formatsToTry) {
                const tempDate = parse(trimmedFecha, format, new Date());
                if (isValid(tempDate)) {
                    const year = tempDate.getFullYear();
                    if (year >= 1900 && year <= 2100) {
                        date = tempDate;
                        break;
                    }
                }
            }

            if (!date) {
                throw new Error(`Fecha inválida: ${fechaIngresoStr}`);
            }

            parsedFechaIngreso = date;
        } else {
            parsedFechaIngreso = null; // Fecha nula o inválida conocida
        }

        const parsedEsPEP = esPepStr.toLowerCase() === 'true';

        const parsedEsSujetoObligado = esSujetoObligadoStr.toLowerCase() === 'true' ? true :
                                       esSujetoObligadoStr.toLowerCase() === 'false' ? false : null;

        return {
            NombreCompleto: nombreCompleto,
            DNI: parsedDNI,
            Estado: estado,
            FechaIngreso: parsedFechaIngreso,
            EsPEP: parsedEsPEP,
            EsSujetoObligado: parsedEsSujetoObligado
        };

    } catch (parseError) {
        console.error(`[ERROR] Error al parsear línea "${line}": ${(parseError as Error).message}`);
        errorRecords++;
        return null;
    }
}

// Función principal para procesar el archivo
async function processFile(filePath: string) {
    if (isProcessingFile) {
        console.log('Ya hay un procesamiento de archivo en curso. Se ignora la nueva solicitud.');
        return;
    }

    isProcessingFile = true;
    lastProcessingStatus = 'Procesando...';
    processedRecords = 0;
    errorRecords = 0;
    console.log(`Iniciando procesamiento del archivo: ${filePath}`);

    let pool: sql.ConnectionPool | undefined;
    try {
        pool = await sql.connect(dbConfig);

        const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
        const readline = require('readline');
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const recordsToInsert: any[] = [];
        const BATCH_SIZE = 5000;

        const processingPromise = new Promise<void>((resolve, reject) => {
            rl.on('line', async (line: string) => {
                rl.pause();

                // *** FILTRO NUEVO: procesar solo si la línea contiene '|'
                if (!line.includes('|')) {
                    rl.resume();
                    return;
                }

                const parsedRecord = parseClientLine(line);

                if (parsedRecord) {
                    recordsToInsert.push(parsedRecord);

                    if (recordsToInsert.length >= BATCH_SIZE) {
                        try {
                            await insertBatch(recordsToInsert, pool as sql.ConnectionPool);
                            recordsToInsert.length = 0;
                        } catch (err) {
                            reject(err);
                        }
                    }
                }
                rl.resume();
            });

            rl.on('close', async () => {
                try {
                    if (recordsToInsert.length > 0) {
                        await insertBatch(recordsToInsert, pool as sql.ConnectionPool);
                    }
                    console.log('Procesamiento del archivo completado.');
                    lastProcessingStatus = 'Completado';
                    isProcessingFile = false;
                    resolve();
                } catch (err) {
                    lastProcessingStatus = `Error en inserción final: ${(err as Error).message}`;
                    isProcessingFile = false;
                    reject(err);
                }
            });

            fileStream.on('error', (err) => {
                console.error('[ERROR] Error al leer el archivo:', err);
                lastProcessingStatus = `Error: ${err.message}`;
                isProcessingFile = false;
                reject(err);
            });
        });

        await processingPromise;

    } catch (err) {
        console.error('[ERROR] Error durante el procesamiento del archivo:', err);
        lastProcessingStatus = `Error fatal: ${(err as Error).message}`;
        isProcessingFile = false;
    }
}

function buildQueryDebugString(query: string, params: Record<string, any>): string {
  let debugQuery = query;

  for (const [key, value] of Object.entries(params)) {
    const safeValue = value === null || value === undefined
      ? 'NULL'
      : typeof value === 'string'
      ? `'${value.replace(/'/g, "''")}'`
      : value;

    // Reemplaza todas las ocurrencias del parámetro (con límite de palabra)
    const regex = new RegExp(`@${key}\\b`, 'g');
    debugQuery = debugQuery.replace(regex, safeValue);
  }

  return debugQuery;
}

// Función para insertar batch en SQL Server
async function insertBatch(records: any[], pool: sql.ConnectionPool) {
  if (records.length === 0) return;

  // Filtrar registros con NombreCompleto mayor a 100 caracteres
  const filteredRecords = records.filter(record => {
    if (typeof record.NombreCompleto === 'string' && record.NombreCompleto.length > 100) {
      console.warn(`Registro descartado por NombreCompleto > 100 chars: "${record.NombreCompleto}"`);
      return false; // descarta
    }
    return true;
  });

  if (filteredRecords.length === 0) {
    console.log('No hay registros válidos para insertar.');
    return;
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const request = new sql.Request(transaction);

    let query = 'INSERT INTO dbo.Clientes (NombreCompleto, DNI, Estado, FechaIngreso, EsPEP, EsSujetoObligado) VALUES ';
    const queryParams: { [key: string]: any } = {};

    const values: string[] = filteredRecords.map((record, index) => {
      const idx = index;
      queryParams[`NombreCompleto${idx}`] = record.NombreCompleto;
      queryParams[`DNI${idx}`] = record.DNI;
      queryParams[`Estado${idx}`] = record.Estado;
      queryParams[`FechaIngreso${idx}`] = record.FechaIngreso;
      queryParams[`EsPEP${idx}`] = record.EsPEP;
      queryParams[`EsSujetoObligado${idx}`] = record.EsSujetoObligado;

      return `(@NombreCompleto${idx}, @DNI${idx}, @Estado${idx}, @FechaIngreso${idx}, @EsPEP${idx}, @EsSujetoObligado${idx})`;
    });

    query += values.join(',');

    for (const param in queryParams) {
      const value = queryParams[param];

      if (param.startsWith('NombreCompleto')) {
        request.input(param, sql.NVarChar(100), value);
      } else if (param.startsWith('Estado')) {
        request.input(param, sql.VarChar(10), value);
      } else if (param.startsWith('DNI')) {
        request.input(param, sql.BigInt, value);
      } else if (param.startsWith('FechaIngreso')) {
        request.input(param, sql.Date, value ?? null);
      } else if (param.startsWith('EsPEP') || param.startsWith('EsSujetoObligado')) {
        request.input(param, sql.Bit, value);
      } else {
        request.input(param, sql.NVarChar, value?.toString() ?? null);
      }
    }

    //console.log(buildQueryDebugString(query, queryParams));/*esto es solo para debug*/

    await request.query(query);

    await transaction.commit();

    processedRecords += filteredRecords.length;
    console.log(`Batch insert exitoso de ${filteredRecords.length} registros. Total procesados: ${processedRecords}`);

  } catch (err) {
    try {
      await transaction.rollback();
      console.error('[ERROR] Transacción revertida con éxito.');
    } catch (rollbackError) {
      console.error('[ERROR] Falló el rollback (ya podría estar abortada):', rollbackError);
    }

    console.error('[ERROR] Falló el batch insert:', err);
    throw err;
  }
}

// Función principal de arranque
async function main() {
    await connectToDatabase();

    const dataFilePath = path.join(__dirname, '..', 'challenge', 'input', 'CLIENTES_IN_0425.dat');

    processFile(dataFilePath).catch(err => {
        console.error('[ERROR] Error no manejado en processFile:', err);
    });

    app.listen(PORT, () => {
        console.log(`Servidor Express escuchando en puerto ${PORT}`);
    });
}

main().catch(err => {
    console.error('[ERROR] Error en la ejecución principal:', err);
    process.exit(1);
});
