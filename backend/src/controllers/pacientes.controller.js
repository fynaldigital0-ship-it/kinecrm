import { asyncHandler } from '../middlewares/errorHandler.js';
import * as pacientesService from '../services/pacientes.service.js';

/**
 * GET /api/pacientes
 */
export const listar = asyncHandler(async (req, res) => {
    const resultado = await pacientesService.listarPacientes(req.profesional.id, req.query);
    res.json({ ok: true, data: resultado });
});

/**
 * GET /api/pacientes/:id
 */
export const obtener = asyncHandler(async (req, res) => {
    const paciente = await pacientesService.obtenerPaciente(req.profesional.id, req.params.id);
    res.json({ ok: true, data: { paciente } });
});

/**
 * POST /api/pacientes
 */
export const crear = asyncHandler(async (req, res) => {
    const paciente = await pacientesService.crearPaciente(req.profesional.id, req.body);
    res.status(201).json({ ok: true, data: { paciente } });
});

/**
 * PUT /api/pacientes/:id
 */
export const actualizar = asyncHandler(async (req, res) => {
    const paciente = await pacientesService.actualizarPaciente(req.profesional.id, req.params.id, req.body);
    res.json({ ok: true, data: { paciente } });
});

/**
 * DELETE /api/pacientes/:id (baja logica)
 */
export const eliminar = asyncHandler(async (req, res) => {
    const paciente = await pacientesService.eliminarPaciente(req.profesional.id, req.params.id);
    res.json({ ok: true, data: { paciente } });
});
