/**
 * Error de negocio con codigo HTTP explicito.
 * Uso: throw new AppError('El turno ya esta ocupado', 409, 'TURNO_OCUPADO');
 */
export class AppError extends Error {
    constructor(mensaje, statusCode = 400, codigo = 'ERROR_NEGOCIO', detalles = null) {
          super(mensaje);
          this.name = 'AppError';
          this.statusCode = statusCode;
          this.codigo = codigo;
          this.detalles = detalles;
          this.esOperacional = true;
          Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Envuelve controladores async para no repetir try/catch.
 */
export function asyncHandler(fn) {
    return function (req, res, next) {
          Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * 404 para rutas no registradas.
 */
export function notFoundHandler(req, res) {
    res.status(404).json({
          ok: false,
          error: {
                  codigo: 'RUTA_NO_ENCONTRADA',
                  mensaje: `La ruta ${req.method} ${req.originalUrl} no existe.`
          }
    });
}

/**
 * Traduce errores de PostgreSQL a respuestas legibles.
 */
function traducirErrorPostgres(err) {
    switch (err.code) {
      case '23505': // unique_violation
        return { statusCode: 409, codigo: 'REGISTRO_DUPLICADO', mensaje: 'Ya existe un registro con esos datos.' };
      case '23503': // foreign_key_violation
        return { statusCode: 409, codigo: 'REFERENCIA_INVALIDA', mensaje: 'El registro referenciado no existe.' };
      case '23514': // check_violation
        return { statusCode: 400, codigo: 'VALIDACION_BASE_DATOS', mensaje: 'Los datos violan una regla de la base de datos.' };
      case '23P01': // exclusion_violation -> turnos solapados
        return { statusCode: 409, codigo: 'TURNO_SOLAPADO', mensaje: 'Ya existe un turno en ese horario para el profesional.' };
      case '22P02': // invalid_text_representation
        return { statusCode: 400, codigo: 'FORMATO_INVALIDO', mensaje: 'Alguno de los identificadores enviados tiene formato invalido.' };
      default:
              return null;
    }
}

/**
 * Manejador global de errores. Debe registrarse ultimo.
 */
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof AppError) {
        return res.status(err.statusCode).json({
                ok: false,
                error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles }
        });
  }

  if (err && err.name === 'ZodError') {
        return res.status(422).json({
                ok: false,
                error: {
                          codigo: 'VALIDACION_FALLIDA',
                          mensaje: 'Los datos enviados no son validos.',
                          detalles: err.errors?.map((e) => ({ campo: e.path.join('.'), mensaje: e.message }))
                }
        });
  }

  if (err && err.code) {
        const traducido = traducirErrorPostgres(err);
        if (traducido) {
                return res.status(traducido.statusCode).json({
                          ok: false,
                          error: { codigo: traducido.codigo, mensaje: traducido.mensaje }
                });
        }
  }

  if (err && err.name === 'JsonWebTokenError') {
        return res.status(401).json({
                ok: false,
                error: { codigo: 'TOKEN_INVALIDO', mensaje: 'El token no es valido.' }
        });
  }

  if (err && err.name === 'TokenExpiredError') {
        return res.status(401).json({
                ok: false,
                error: { codigo: 'TOKEN_EXPIRADO', mensaje: 'El token expiro. Inicia sesion nuevamente.' }
        });
  }

  console.error('[ERROR NO CONTROLADO]', err);
    return res.status(500).json({
          ok: false,
          error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrio un error inesperado. Intenta nuevamente.' }
    });
}
