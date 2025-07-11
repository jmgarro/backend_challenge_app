import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

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

let pool: sql.ConnectionPool;

export async function getDbPool(): Promise<sql.ConnectionPool> {
    if (!pool) {
        pool = await sql.connect(dbConfig);
        console.log('✅ Conexión a SQL Server establecida desde config/db.ts');
    }
    return pool;
}
