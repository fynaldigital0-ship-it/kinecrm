import knexFactory from 'knex';
import config from './env.js';

/**
 * Instancia unica de Knex compartida por toda la aplicacion.
 * Requiere SSL para conexiones externas a PostgreSQL (Render).
 */
export const db = knexFactory({
    client: 'pg',
    connection: {
          connectionString: config.db.connectionString,
          ssl: config.db.ssl ? { rejectUnauthorized: false } : false
    },
    pool: {
          min: config.db.poolMin,
          max: config.db.poolMax,
          acquireTimeoutMillis: 30000,
          idleTimeoutMillis: 30000
    },
    acquireConnectionTimeout: 30000
});

/**
 * Verifica que la base responda. Se llama al arrancar el servidor.
 */
export async function verificarConexion() {
    const resultado = await db.raw('SELECT NOW() AS ahora, current_database() AS base');
    return resultado.rows[0];
}

/**
 * Cierra el pool de conexiones (apagado ordenado).
 */
export async function cerrarConexion() {
    await db.destroy();
}

export default db;
