import { asyncHandler } from '../middlewares/errorHandler.js';
import * as authService from '../services/auth.service.js';

/**
 * POST /api/auth/registro
 */
export const registrar = asyncHandler(async (req, res) => {
    const { profesional, token } = await authService.registrarProfesional(req.body);
    res.status(201).json({ ok: true, data: { profesional, token } });
});

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
    const { profesional, token } = await authService.iniciarSesion(req.body);
    res.json({ ok: true, data: { profesional, token } });
});

/**
 * GET /api/auth/perfil
 */
export const obtenerPerfil = asyncHandler(async (req, res) => {
    const profesional = await authService.obtenerPerfil(req.profesional.id);
    res.json({ ok: true, data: { profesional } });
});

/**
 * PUT /api/auth/perfil
 */
export const actualizarPerfil = asyncHandler(async (req, res) => {
    const profesional = await authService.actualizarPerfil(req.profesional.id, req.body);
    res.json({ ok: true, data: { profesional } });
});
