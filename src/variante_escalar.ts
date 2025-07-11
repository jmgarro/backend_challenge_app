import * as fs from 'fs';
import * as path from 'path';
import * as sql from 'mssql';

import { Readable } from 'stream';

const csvParser = require('csv-parser');

const BATCH_SIZE = 100;
const CSV_FILE_PATH = path.resolve(__dirname, 'clientes.csv');

let processedRecords = 0;

interface ClienteCSV {
  NombreCompleto: string;
  DNI: string;
  Estado: string;
  FechaIngreso: string; // sigue siendo string hasta que lo parsees
  EsPEP: string; // también string hasta convertir a booleano
  EsSujetoObligado: string; // idem
}

async function insertBatch(records: any[], pool: sql.ConnectionPool) {
    if (records.length === 0) return;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const request = new sql.Request(transaction);

        let query = 'INSERT INTO dbo.Clientes (NombreCompleto, DNI, Estado, FechaIngreso, EsPEP, EsSujetoObligado) VALUES ';
        const queryParams: { [key: string]: any } = {};
        const values: string[] = [];

        records.forEach((record, index) => {
            const idx = index;
            queryParams[`NombreCompleto${idx}`] = record.NombreCompleto;
            queryParams[`DNI${idx}`] = record.DNI;
            queryParams[`Estado${idx}`] = record.Estado;
            queryParams[`FechaIngreso${idx}`] = record.FechaIngreso || null;
            queryParams[`EsPEP${idx}`] = record.EsPEP === '1' ? true : false;
            queryParams[`EsSujetoObligado${idx}`] = record.EsSujetoObligado === '1' ? true : false;

            values.push(`(@NombreCompleto${idx}, @DNI${idx}, @Estado${idx}, @FechaIngreso${idx}, @EsPEP${idx}, @EsSujetoObligado${idx})`);
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
                request.input(param, sql.Date, value);
            } else if (param.startsWith('EsPEP') || param.startsWith('EsSujetoObligado')) {
                request.input(param, sql.Bit, value);
            }
        }

        await request.query(query);
        await transaction.commit();

        processedRecords += records.length;
        console.log(`✅ Batch insert exitoso de ${records.length} registros. Total procesados: ${processedRecords}`);
    } catch (err) {
        await transaction.rollback();
        console.error('[ERROR] Batch fallido y rollback ejecutado:', err);
        throw err;
    }
}

async function run() {
    const pool = await sql.connect({
        user: 'sa',
        password: 'tuPasswordSegura',
        server: 'localhost',
        database: 'TuBaseDeDatos',
        options: {
            encrypt: false, // o true si usás Azure
            trustServerCertificate: true,
        },
    });

    const batch: any[] = [];

    const stream: Readable = fs.createReadStream(CSV_FILE_PATH)
        // @ts-ignore
        .pipe(csvParser())
        .on('data', async (row: ClienteCSV) => {
            stream.pause(); // Evita llenar memoria si la base tarda

            try {
                const nombreCompleto = row.NombreCompleto?.trim() || '';

                if (nombreCompleto.length > 100) {
                    console.warn(`❌ Registro descartado: NombreCompleto excede 100 caracteres: "${nombreCompleto}"`);
                } else {
                    batch.push({
                        NombreCompleto: nombreCompleto,
                        DNI: row.DNI,
                        Estado: row.Estado,
                        FechaIngreso: row.FechaIngreso || null,
                        EsPEP: row.EsPEP,
                        EsSujetoObligado: row.EsSujetoObligado
                    });

                    if (batch.length >= BATCH_SIZE) {
                        await insertBatch(batch, pool);
                        batch.length = 0;
                    }
                }
            } catch (err) {
                console.error('[ERROR] Procesando línea CSV:', err);
            }

            stream.resume(); // Continúa leyendo el archivo
        })
        .on('end', async () => {
            if (batch.length > 0) {
                await insertBatch(batch, pool);
            }
            console.log('🏁 Proceso completado.');
            await pool.close();
        })
        .on('error', (err: Error) => {
            console.error('[ERROR] Lectura del archivo CSV fallida:', err);
        });
}

run().catch((err) => {
    console.error('[ERROR] Error crítico de ejecución:', err);
    process.exit(1);
});
