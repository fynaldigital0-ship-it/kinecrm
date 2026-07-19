import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, cerrarConexion } from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function inicializar() {
    const rutaSchema = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(rutaSchema, 'utf-8');

  console.log('[DB:INIT] Aplicando schema.sql...');
    try {
          await db.raw(sql);
          console.log('[DB:INIT] Esquema aplicado correctamente.');
    } catch (error) {
          console.error('[DB:INIT] Error al aplicar el esquema:', error.message);
          process.exitCode = 1;
    } finally {
          await cerrarConexion();
    }
}

inicializar();
