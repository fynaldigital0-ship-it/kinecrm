import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middlewares/validate.js';
import { auth } from '../middlewares/auth.js';
import { registroSchema, loginSchema, actualizarPerfilSchema } from '../validators/auth.validator.js';
import { registrar, login, obtenerPerfil, actualizarPerfil } from '../controllers/auth.controller.js';

const router = Router();

// Rate limit especifico y mas estricto para login (fuerza bruta).
const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
          ok: false,
          error: {
                  codigo: 'DEMASIADOS_INTENTOS',
                  mensaje: 'Demasiados intentos de inicio de sesion. Intenta en unos minutos.'
          }
    }
});

router.post('/registro', validate(registroSchema), registrar);
router.post('/login', limitadorLogin, validate(loginSchema), login);
router.get('/perfil', auth, obtenerPerfil);
router.put('/perfil', auth, validate(actualizarPerfilSchema), actualizarPerfil);

export default router;
