import dotenv from 'dotenv';

dotenv.config();

/**
 * Lee una variable de entorno. Si es obligatoria y no existe, corta el arranque.
 */
function leer(nombre, { requerida = false, porDefecto } = {}) {
    const valor = process.env[nombre];
    if (valor === undefined || valor === '') {
          if (requerida) {
                  console.error(`[CONFIG] Falta la variable de entorno obligatoria: ${nombre}`);
                  process.exit(1);
          }
          return porDefecto;
    }
    return valor;
}

function leerEntero(nombre, porDefecto) {
    const valor = process.env[nombre];
    if (valor === undefined || valor === '') return porDefecto;
    const numero = Number.parseInt(valor, 10);
    return Number.isNaN(numero) ? porDefecto : numero;
}

function leerLista(nombre, porDefecto = []) {
    const valor = process.env[nombre];
    if (!valor) return porDefecto;
    return valor.split(',').map((item) => item.trim()).filter(Boolean);
}

const config = {
    entorno: leer('NODE_ENV', { porDefecto: 'development' }),
    esProduccion: leer('NODE_ENV', { porDefecto: 'development' }) === 'production',
    puerto: leerEntero('PORT', 4000),

    // Base de datos (Render entrega DATABASE_URL ya armada)
    db: {
          connectionString: leer('DATABASE_URL', { requerida: true }),
          ssl: leer('DATABASE_SSL', { porDefecto: 'true' }) === 'true',
          poolMin: leerEntero('DB_POOL_MIN', 0),
          poolMax: leerEntero('DB_POOL_MAX', 10)
    },

    // Autenticacion
    jwt: {
          secreto: leer('JWT_SECRET', { requerida: true }),
          expiracion: leer('JWT_EXPIRES_IN', { porDefecto: '7d' })
    },

    bcryptRounds: leerEntero('BCRYPT_ROUNDS', 10),

    // CORS: dominios del frontend separados por coma
    corsOrigenes: leerLista('CORS_ORIGINS', ['http://localhost:5173']),

    zonaHorariaDefault: leer('TZ_DEFAULT', { porDefecto: 'America/Argentina/Buenos_Aires' })
};

export default config;
