import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { db } from '../config/db.js';
import { AppError, asyncHandler } from './errorHandler.js';

/**
 * Valida el Bearer token del header Authorization e inyecta
 * req.profesional con los datos del profesional autenticado.
 * Toda ruta de negocio (pacientes, turnos, etc.) usa este middleware.
 */
export const auth = asyncHandler(async (req, res, next) => {
    const encabezado = req.headers.authorization;

                                   if (!encabezado || !encabezado.startsWith('Bearer ')) {
                                         throw new AppError('Token de autenticacion no proporcionado.', 401, 'TOKEN_FALTANTE');
                                   }

                                   const token = encabezado.slice(7).trim();
    if (!token) {
          throw new AppError('Token de autenticacion no proporcionado.', 401, 'TOKEN_FALTANTE');
    }

                                   // jwt.verify lanza JsonWebTokenError / TokenExpiredError,
                                   // que errorHandler.js traduce a 401.
                                   const payload = jwt.verify(token, config.jwt.secreto);

                                   const profesional = await db('profesionales')
      .where({ id: payload.profesional_id, activo: true })
      .first();

                                   if (!profesional) {
                                         throw new AppError('El profesional no existe o esta inactivo.', 401, 'PROFESIONAL_NO_ENCONTRADO');
                                   }

                                   delete profesional.password_hash;
    req.profesional = profesional;
    next();
});

export default auth;
