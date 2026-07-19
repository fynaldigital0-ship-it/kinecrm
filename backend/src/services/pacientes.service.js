import { db } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

const CAMPOS_LISTADO = [
    'id',
    'nombre',
    'apellido',
    'dni',
    'email',
    'telefono',
    'obra_social',
    'estado',
    'creado_en'
  ];

/**
 * Listado paginado de pacientes del profesional autenticado,
 * con busqueda por nombre/apellido/DNI y filtro por estado.
 */
export async function listarPacientes(profesionalId, { pagina, limite, busqueda, estado }) {
    const base = db('pacientes').where({ profesional_id: profesionalId });

  if (estado) {
        base.andWhere({ estado });
  }

  if (busqueda) {
        const termino = `%${busqueda.toLowerCase()}%`;
        base.andWhere((qb) => {
                qb.whereRaw('LOWER(nombre) LIKE ?', [termino])
                  .orWhereRaw('LOWER(apellido) LIKE ?', [termino])
                  .orWhereRaw('LOWER(dni) LIKE ?', [termino]);
        });
  }

  const offset = (pagina - 1) * limite;

  const [{ total }, pacientes] = await Promise.all([
        base.clone().count('* as total').first(),
        base
          .clone()
          .select(CAMPOS_LISTADO)
          .orderBy('apellido', 'asc')
          .orderBy('nombre', 'asc')
          .limit(limite)
          .offset(offset)
      ]);

  return {
        pacientes,
        paginacion: {
                pagina,
                limite,
                total: Number(total),
                totalPaginas: Math.max(Math.ceil(Number(total) / limite), 1)
        }
  };
}

/**
 * Detalle de un paciente, incluyendo sus autorizaciones vigentes
 * con sesiones restantes (v_autorizaciones_detalle).
 */
export async function obtenerPaciente(profesionalId, id) {
    const paciente = await db('pacientes').where({ id, profesional_id: profesionalId }).first();

  if (!paciente) {
        throw new AppError('Paciente no encontrado.', 404, 'PACIENTE_NO_ENCONTRADO');
  }

  const autorizaciones = await db('v_autorizaciones_detalle')
      .where({ paciente_id: id, profesional_id: profesionalId })
      .orderBy('fecha_desde', 'desc');

  return { ...paciente, autorizaciones };
}

export async function crearPaciente(profesionalId, datos) {
    const [paciente] = await db('pacientes')
      .insert({
              profesional_id: profesionalId,
              nombre: datos.nombre,
              apellido: datos.apellido,
              dni: datos.dni ?? null,
              email: datos.email ?? null,
              telefono: datos.telefono ?? null,
              fecha_nacimiento: datos.fecha_nacimiento ?? null,
              direccion: datos.direccion ?? null,
              obra_social: datos.obra_social ?? null,
              numero_afiliado: datos.numero_afiliado ?? null,
              notas: datos.notas ?? null
      })
      .returning('*');

  return paciente;
}

export async function actualizarPaciente(profesionalId, id, cambios) {
    const [paciente] = await db('pacientes')
      .where({ id, profesional_id: profesionalId })
      .update(cambios)
      .returning('*');

  if (!paciente) {
        throw new AppError('Paciente no encontrado.', 404, 'PACIENTE_NO_ENCONTRADO');
  }

  return paciente;
}

/**
 * Baja logica: nunca se borra el registro, solo se marca inactivo.
 */
export async function eliminarPaciente(profesionalId, id) {
    const [paciente] = await db('pacientes')
      .where({ id, profesional_id: profesionalId })
      .update({ estado: 'inactivo' })
      .returning('*');

  if (!paciente) {
        throw new AppError('Paciente no encontrado.', 404, 'PACIENTE_NO_ENCONTRADO');
  }

  return paciente;
}
