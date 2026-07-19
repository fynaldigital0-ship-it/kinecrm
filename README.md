import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import config from './config/env.js';
import { db, verificarConexion, cerrarConexion } from './config/db.js';
import { errorHandler, notFoundHandler, asyncHandler } from './middlewares/errorHandler.js';

const app = express();

/* ------------------------------------------------------------------ */
/* Configuracion base                                                  */
/* ------------------------------------------------------------------ */

// Render corre detras de un proxy: necesario para rate-limit e IPs reales.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

app.use(cors({
  origin(origin, callback) {
    // Permite herramientas sin origin (curl, Postman, webhooks de Make.com)
    if (!origin) return callback(null, true);
    if (config.corsOrigenes.includes('*') || config.corsOrigenes.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Secret']
}));

// El webhook de WhatsApp puede mandar payloads grandes (media, transcripciones)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(morgan(config.esProduccion ? 'combined' : 'dev'));

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Superaste el limite de peticiones. Intenta en unos minutos.' }
  }
});

app.use('/api', limitadorGeneral);

/* ------------------------------------------------------------------ */
/* Rutas de salud y raiz                                               */
/* ------------------------------------------------------------------ */

app.get('/', (req, res) => {
  res.json({
    ok: true,
    servicio: 'KineCRM API',
    version: '1.0.0',
    entorno: config.entorno,
    documentacion: '/api/health'
  });
});

app.get('/api/health', asyncHandler(async (req, res) => {
  const inicio = Date.now();
  const info = await verificarConexion();
  res.json({
    ok: true,
    estado: 'operativo',
    baseDatos: {
      conectada: true,
      nombre: info.base,
      horaServidor: info.ahora,
      latenciaMs: Date.now() - inicio
    },
    openai: { configurada: Boolean(config.openai.apiKey), modelo: config.openai.modelo },
    uptimeSegundos: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
}));

// Endpoint liviano para el health check de Render (no toca la base)
app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

/* ------------------------------------------------------------------ */
/* Rutas de negocio                                                    */
/* Se registran en los proximos bloques:                               */
/*   app.use('/api/auth', authRoutes);                                 */
/*   app.use('/api/pacientes', pacientesRoutes);                       */
/*   app.use('/api/turnos', turnosRoutes);                             */
/*   app.use('/api/autorizaciones', autorizacionesRoutes);             */
/*   app.use('/api/evoluciones', evolucionesRoutes);                   */
/*   app.use('/api/webhook', webhookRoutes);                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Manejo de errores                                                   */
/* ------------------------------------------------------------------ */

app.use(notFoundHandler);
app.use(errorHandler);

/* ------------------------------------------------------------------ */
/* Arranque del servidor                                               */
/* ------------------------------------------------------------------ */

let servidor;

async function iniciar() {
  try {
    const info = await verificarConexion();
    console.log(`[DB] Conectado a "${info.base}" - hora del servidor: ${info.ahora}`);
  } catch (error) {
    console.error('[DB] No se pudo conectar a PostgreSQL:', error.message);
    process.exit(1);
  }

  servidor = app.listen(config.puerto, '0.0.0.0', () => {
    console.log('====================================================');
    console.log(`  KineCRM API escuchando en el puerto ${config.puerto}`);
    console.log(`  Entorno: ${config.entorno}`);
    console.log(`  CORS permitido: ${config.corsOrigenes.join(', ')}`);
    console.log('====================================================');
  });
}

/* ------------------------------------------------------------------ */
/* Shutdown ordenado (Render envia SIGTERM en cada deploy)             */
/* ------------------------------------------------------------------ */

async function apagar(senal) {
  console.log(`\n[${senal}] Cerrando servidor de forma ordenada...`);

  const forzar = setTimeout(() => {
    console.error('[SHUTDOWN] Cierre forzado tras 10s.');
    process.exit(1);
  }, 10000);

  try {
    if (servidor) {
      await new Promise((resolve) => servidor.close(resolve));
      console.log('[SHUTDOWN] Servidor HTTP cerrado.');
    }
    await cerrarConexion();
    console.log('[SHUTDOWN] Pool de PostgreSQL cerrado.');
    clearTimeout(forzar);
    process.exit(0);
  } catch (error) {
    console.error('[SHUTDOWN] Error al cerrar:', error);
    clearTimeout(forzar);
    process.exit(1);
  }
}

process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));

process.on('unhandledRejection', (razon) => {
  console.error('[PROMESA NO MANEJADA]', razon);
});

process.on('uncaughtException', (error) => {
  console.error('[EXCEPCION NO CAPTURADA]', error);
  apagar('uncaughtException');
});

iniciar();

export { app, db };
