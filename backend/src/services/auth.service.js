import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import config from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';

const CAMPOS_PUBLICOS = [
    'id',
    'nombre',
    'apellido',
    'email',
    'telefono',
    'matricula',
    'especialidad',
    'zona_horaria',
    'duracion_turno_minutos',
    'hora_inicio_agenda',
    'hora_fin_agenda',
    'dias_laborales',
    'activo',
    'creado_en',
    'actualizado_en'
  ];

function firmarToken(profesional) {
    return jwt.sign({ profesional_id: profesional.id }, config.jwt.secreto, {
          expiresIn: config.jwt.expiracion
    });
}

export async function registrarProfesional(datos) {
    const emailNormalizado = datos.email.toLowerCase();

  const existente = await db('profesionales').where({ email: emailNormalizado }).first();
    if (existente) {
          throw new AppError('Ya existe una cuenta registrada con ese email.', 409, 'EMAIL_YA_REGISTRADO');
    }

  const passwordHash = await bcrypt.hash(datos.password, config.bcryptRounds);

  const [profesional] = await db('profesionales')
      .insert({
              nombre: datos.nombre,
              apellido: datos.apellido,
              email: emailNormalizado,
              password_hash: passwordHash,
              telefono: datos.telefono ?? null,
              matricula: datos.matricula ?? null,
              especialidad: datos.especialidad ?? null,
              zona_horaria: datos.zona_horaria ?? 'America/Argentina/Buenos_Aires'
      })
      .returning(CAMPOS_PUBLICOS);

  const token = firmarToken(profesional);
    return { profesional, token };
}

export async function iniciarSesion({ email, password }) {
    const profesional = await db('profesionales').where({ email: email.toLowerCase() }).first();

  if (!profesional || !profesional.activo) {
        throw new AppError('Email o contrasena incorrectos.', 401, 'CREDENCIALES_INVALIDAS');
  }

  const passwordValida = await bcrypt.compare(password, profesional.password_hash);
    if (!passwordValida) {
          throw new AppError('Email o contrasena incorrectos.', 401, 'CREDENCIALES_INVALIDAS');
    }

  const token = firmarToken(profesional);
    delete profesional.password_hash;
    return { profesional, token };
}

export async function obtenerPerfil(profesionalId) {
    const profesional = await db('profesionales')
      .select(CAMPOS_PUBLICOS)
      .where({ id: profesionalId })
      .first();

  if (!profesional) {
        throw new AppError('Profesional no encontrado.', 404, 'PROFESIONAL_NO_ENCONTRADO');
  }

  return profesional;
}

export async function actualizarPerfil(profesionalId, cambios) {
    const [profesional] = await db('profesionales')
      .where({ id: profesionalId })
      .update(cambios)
      .returning(CAMPOS_PUBLICOS);

  if (!profesional) {
        throw new AppError('Profesional no encontrado.', 404, 'PROFESIONAL_NO_ENCONTRADO');
  }

  return profesional;
}
