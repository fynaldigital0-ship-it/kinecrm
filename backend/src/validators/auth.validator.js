import { z } from 'zod';

export const registroSchema = z.object({
    body: z.object({
          nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
          apellido: z.string().trim().min(1, 'El apellido es obligatorio').max(100),
          email: z.string().trim().toLowerCase().email('El email no es valido').max(150),
          password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres').max(72),
          telefono: z.string().trim().max(30).optional(),
          matricula: z.string().trim().max(50).optional(),
          especialidad: z.string().trim().max(100).optional(),
          zona_horaria: z.string().trim().max(50).optional()
    })
});

export const loginSchema = z.object({
    body: z.object({
          email: z.string().trim().toLowerCase().email('El email no es valido'),
          password: z.string().min(1, 'La contrasena es obligatoria')
    })
});

export const actualizarPerfilSchema = z.object({
    body: z
      .object({
              nombre: z.string().trim().min(1).max(100).optional(),
              apellido: z.string().trim().min(1).max(100).optional(),
              telefono: z.string().trim().max(30).nullable().optional(),
              matricula: z.string().trim().max(50).nullable().optional(),
              especialidad: z.string().trim().max(100).nullable().optional(),
              zona_horaria: z.string().trim().max(50).optional(),
              duracion_turno_minutos: z.coerce.number().int().min(5).max(480).optional(),
              hora_inicio_agenda: z
                .string()
                .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora invalido (HH:MM)')
                .optional(),
              hora_fin_agenda: z
                .string()
                .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora invalido (HH:MM)')
                .optional(),
              dias_laborales: z.array(z.number().int().min(1).max(7)).min(1).max(7).optional()
      })
      .refine((datos) => Object.keys(datos).length > 0, {
              message: 'Debe enviar al menos un campo para actualizar'
      })
});
