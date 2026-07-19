import { z } from 'zod';

const uuidSchema = z.string().uuid('El identificador no tiene formato valido');

export const listarPacientesSchema = z.object({
    query: z.object({
          pagina: z.coerce.number().int().min(1).optional().default(1),
          limite: z.coerce.number().int().min(1).max(100).optional().default(20),
          busqueda: z.string().trim().max(150).optional(),
          estado: z.enum(['activo', 'inactivo']).optional()
    })
});

export const idPacienteSchema = z.object({
    params: z.object({
          id: uuidSchema
    })
});

export const crearPacienteSchema = z.object({
    body: z.object({
          nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
          apellido: z.string().trim().min(1, 'El apellido es obligatorio').max(100),
          dni: z.string().trim().max(20).optional(),
          email: z.string().trim().toLowerCase().email('El email no es valido').optional(),
          telefono: z.string().trim().max(30).optional(),
          fecha_nacimiento: z.string().date('Formato de fecha invalido (YYYY-MM-DD)').optional(),
          direccion: z.string().trim().max(200).optional(),
          obra_social: z.string().trim().max(100).optional(),
          numero_afiliado: z.string().trim().max(50).optional(),
          notas: z.string().trim().max(2000).optional()
    })
});

export const actualizarPacienteSchema = z.object({
    params: z.object({
          id: uuidSchema
    }),
    body: z
      .object({
              nombre: z.string().trim().min(1).max(100).optional(),
              apellido: z.string().trim().min(1).max(100).optional(),
              dni: z.string().trim().max(20).nullable().optional(),
              email: z.string().trim().toLowerCase().email('El email no es valido').nullable().optional(),
              telefono: z.string().trim().max(30).nullable().optional(),
              fecha_nacimiento: z.string().date('Formato de fecha invalido (YYYY-MM-DD)').nullable().optional(),
              direccion: z.string().trim().max(200).nullable().optional(),
              obra_social: z.string().trim().max(100).nullable().optional(),
              numero_afiliado: z.string().trim().max(50).nullable().optional(),
              notas: z.string().trim().max(2000).nullable().optional(),
              estado: z.enum(['activo', 'inactivo']).optional()
      })
      .refine((datos) => Object.keys(datos).length > 0, {
              message: 'Debe enviar al menos un campo para actualizar'
      })
});
