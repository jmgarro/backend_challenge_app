import sql from 'mssql';
import { getDbPool } from '../config/db';

export interface ClientRecord {
    NombreCompleto: string;
    DNI: number;
    Estado: string;
    FechaIngreso: Date | null;
    EsPEP: boolean;
    EsSujetoObligado: boolean | null;
}

export async function insertBatch(records: ClientRecord[]): Promise<number> {
    if (records.length === 0) return 0;

    console.log("estoy en el insertbatch antes del filtro");

    const validRecords = records.filter(r =>
        typeof r.NombreCompleto === 'string' && r.NombreCompleto.length <= 100 &&
        typeof r.Estado === 'string' && r.Estado.length <= 10 &&
        typeof r.DNI === 'number' && !isNaN(r.DNI) &&
        r.FechaIngreso instanceof Date && !isNaN(r.FechaIngreso.getTime())  
    );

    console.log("estoy en el insertbatch luego del filtro con registros exitosos = "+validRecords.length);

    if (validRecords.length === 0) return 0;

    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const request = new sql.Request(transaction);
        const queryParams: Record<string, any> = {};
        let query = 'INSERT INTO dbo.Clientes (NombreCompleto, DNI, Estado, FechaIngreso, EsPEP, EsSujetoObligado) VALUES ';
        const values = validRecords.map((r, i) => {
            queryParams[`NombreCompleto${i}`] = r.NombreCompleto;
            queryParams[`DNI${i}`] = r.DNI;
            queryParams[`Estado${i}`] = r.Estado;
            queryParams[`FechaIngreso${i}`] = r.FechaIngreso;
            queryParams[`EsPEP${i}`] = r.EsPEP;
            queryParams[`EsSujetoObligado${i}`] = r.EsSujetoObligado;
            return `(@NombreCompleto${i}, @DNI${i}, @Estado${i}, @FechaIngreso${i}, @EsPEP${i}, @EsSujetoObligado${i})`;
        });

        query += values.join(',');

        for (const key in queryParams) {
            const val = queryParams[key];
            if (key.startsWith('NombreCompleto')) request.input(key, sql.NVarChar(100), val);
            else if (key.startsWith('DNI')) request.input(key, sql.BigInt, val);
            else if (key.startsWith('Estado')) request.input(key, sql.VarChar(10), val);
            else if (key.startsWith('FechaIngreso')) {
                let dateVal = null;
                if (val) {
                    const parsedDate = new Date(val);
                    // Verifica si la fecha fue parseada correctamente y es válida
                    if (!isNaN(parsedDate.getTime())) {
                        dateVal = parsedDate;
                    } else {
                        // Opcional: Manejar el error si la fecha no se pudo parsear
                        console.warn(`Advertencia: No se pudo parsear la fecha para ${key}: ${val}`);
                    }
                }
                // Ahora, pasa el objeto Date de JavaScript (o null) al input de SQL
                //console.log("Fechas que se insertan: " +dateVal);
                request.input(key, sql.Date, dateVal);
            }
            else request.input(key, sql.Bit, val);
        }

        console.log("estoy preparando la query");
        //console.log(buildQueryDebugString(query, queryParams));

        await request.query(query);
        await transaction.commit();

        const insertedCount = validRecords.length;
        console.log(`✅ Insertados ${insertedCount} registros.`);
        return insertedCount;

    } catch (err) {
        await transaction.rollback();
        console.error('❌ Falló la transacción:', err);
        throw err;
    }
}


// Función auxiliar para debugging de SQL
function buildQueryDebugString(query: string, params: Record<string, any>): string {
    let debugQuery = query;

    for (const [key, value] of Object.entries(params)) {
        const safeValue = value === null || value === undefined
            ? 'NULL'
            : typeof value === 'string'
            ? `'${value.replace(/'/g, "''")}'`
            : value;

        const regex = new RegExp(`@${key}\\b`, 'g');
        debugQuery = debugQuery.replace(regex, safeValue);
    }

    return debugQuery;
}
