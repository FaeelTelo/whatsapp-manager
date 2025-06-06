import dotenv from "dotenv";
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Configuração para PostgreSQL local
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // SSL normalmente não é necessário para conexões locais
  ssl: false
};

console.log('[DB] Configurando pool para PostgreSQL local:', {
  host: 'localhost',
  port: 5432,
  database: 'whatsapp_db'
});

export const pool = new Pool(connectionConfig);

// Tratamento de erros do pool
pool.on('error', (err) => {
  console.error('[DB] Erro no pool de conexões:', err);
});

// Teste de conexão
async function testConnection() {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW()');
      console.log('[DB] Conexão bem-sucedida. Hora do banco:', res.rows[0].now);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[DB] Falha na conexão:', {
      error: err.message,
      stack: err.stack,
      advice: 'Verifique se o PostgreSQL está rodando localmente na porta 5432'
    });
  }
}

testConnection();

export const db = drizzle(pool, { schema });
