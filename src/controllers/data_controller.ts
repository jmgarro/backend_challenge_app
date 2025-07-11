import fs from 'fs';
import { parse, isValid } from 'date-fns';
import readline from 'readline';
import { insertBatch, ClientRecord } from '../DAO/data_model';

let isProcessingFile = false;
let lastProcessingStatus = 'Inactivo';
let processedRecords = 0;
let errorRecords = 0;

export function getProcessingStatus() {
    return {
        status: 'OK',
        message: 'Service is healthy and running.',
        fileProcessing: isProcessingFile ? 'Activo' : 'Inactivo',
        lastProcessingStatus,
        processedRecords,
        errorRecords
    };
}

export async function processFileController(filePath: string) {
    if (isProcessingFile) {
        console.log('⚠️ Ya hay un procesamiento en curso. Se ignora.');
        return;
    }

    isProcessingFile = true;
    lastProcessingStatus = 'Procesando...';
    processedRecords = 0;
    errorRecords = 0;

    console.log(`📄 Procesando archivo: ${filePath}`);

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const recordsToInsert: ClientRecord[] = [];
    const BATCH_SIZE = 250;

    for await (const line of rl) {
        if (!line.includes('|')) continue;

        const record = parseClientLine(line);
        if (record) {
            recordsToInsert.push(record);
        } else {
            errorRecords++;
        }

        if (recordsToInsert.length >= BATCH_SIZE) {
            try {   
                console.log("estoy en antes del insertBatch1");
                const insertedCount = await insertBatch(recordsToInsert);
                processedRecords += insertedCount;
            } catch (err) {
                console.error('Error al insertar batch:', err);
                errorRecords += recordsToInsert.length;
            }
            recordsToInsert.length = 0;
        }
    }

    if (recordsToInsert.length > 0) {
        try {
            console.log("estoy en antes del insertBatch2");
            const insertedCount = await insertBatch(recordsToInsert);
            processedRecords += insertedCount;
        } catch (err) {
            console.error('Error al insertar batch final:', err);
            errorRecords += recordsToInsert.length;
        }
    }

    lastProcessingStatus = 'Completado';
    isProcessingFile = false;

    console.log('✅ Procesamiento completo.');
    updateStatus();
}

function updateStatus() {
    console.log(getProcessingStatus());
}

function parseClientLine(line: string): ClientRecord | null {
    const parts = line.split('|');
    if (parts.length !== 7) return null;

    try {
        const [
            nombre, apellido, dni,
            estado, fechaIngresoStr,
            esPepStr, esSujetoObligadoStr
        ] = parts;

        const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`.trim();

        // Validación de longitud de nombreCompleto
        if (nombreCompleto.length > 100) {
            // No procesar este registro, saltar al siguiente
            throw new Error('Nombre demasiado largo');
        }

        if(estado.trim().length > 10){
            // No procesar este registro, saltar al siguiente
            throw new Error('Estado demasiado largo');
        }

        const parsedDNI = parseInt(dni.trim(), 10);
        if (isNaN(parsedDNI)) throw new Error('DNI inválido');

        const parsedFechaIngreso = parseDate(fechaIngresoStr.trim());
        const parsedEsPEP = esPepStr.trim().toLowerCase() === 'true';

        let parsedEsSujetoObligado: boolean | null = null;
        const valSujeto = esSujetoObligadoStr.trim().toLowerCase();
        if (valSujeto === 'true') parsedEsSujetoObligado = true;
        else if (valSujeto === 'false') parsedEsSujetoObligado = false;

        return {
            NombreCompleto: nombreCompleto,
            DNI: parsedDNI,
            Estado: estado.trim(),
            FechaIngreso: parsedFechaIngreso,
            EsPEP: parsedEsPEP,
            EsSujetoObligado: parsedEsSujetoObligado
        };
    } catch {
        console.log("estoy eliminando registros en el data controller");
        return null;
    }
}

export { parseClientLine };

function parseDate(rawDate: string): Date | null {
    const trimmed = rawDate.trim();
    const invalids = ['0000-00-00', '00/00/0000', '99/99/9999', '9999-99-99'];
    if (!trimmed || invalids.includes(trimmed)) return null;

    // Primero, intenta parsear la fecha usando el constructor nativo de JavaScript.
    // Es muy bueno con formatos complejos como 'Fri May 25 2018 00:00:00 GMT+0000 (Coordinated Universal Time)'.
    const parsedByNativeDate = new Date(trimmed);

    // Verifica si la fecha parseada es válida
    if (!isNaN(parsedByNativeDate.getTime())) {
        return parsedByNativeDate;
    }

    // Si el constructor nativo falló, intenta con los formatos específicos de date-fns
    // (útil si también recibes fechas en MM/dd/yyyy o yyyy-MM-dd, por ejemplo).
    for (const format of ['MM/dd/yyyy', 'yyyy-MM-dd']) {
        const parsed = parse(trimmed, format, new Date());
        if (isValid(parsed)) return parsed;
    }

    // Si ninguna de las opciones anteriores pudo parsear la fecha, devuelve null.
    return null;
}
