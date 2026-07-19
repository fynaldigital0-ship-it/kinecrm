-- =====================================================================
-- KineCRM - Esquema de base de datos
-- Bloque 1: fundacion (profesionales, pacientes, autorizaciones, turnos)
-- Se aplica con "npm run db:init" (backend/db/init.js)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------
-- Funcion generica para mantener actualizado_en al dia
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- profesionales
-- =====================================================================
CREATE TABLE IF NOT EXISTS profesionales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    apellido text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    telefono text,
    matricula text,
    especialidad text,
    zona_horaria text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    duracion_turno_minutos integer NOT NULL DEFAULT 60,
    hora_inicio_agenda time NOT NULL DEFAULT '08:00',
    hora_fin_agenda time NOT NULL DEFAULT '20:00',
    dias_laborales integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
    activo boolean NOT NULL DEFAULT true,
    creado_en timestamptz NOT NULL DEFAULT now(),
    actualizado_en timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_profesionales_email UNIQUE (email)
  );

CREATE TRIGGER trg_profesionales_actualizado
BEFORE UPDATE ON profesionales
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_timestamp();

-- =====================================================================
-- pacientes
-- =====================================================================
CREATE TABLE IF NOT EXISTS pacientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profesional_id uuid NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    apellido text NOT NULL,
    dni text,
    email text,
    telefono text,
    fecha_nacimiento date,
    direccion text,
    obra_social text,
    numero_afiliado text,
    notas text,
    estado text NOT NULL DEFAULT 'activo',
    creado_en timestamptz NOT NULL DEFAULT now(),
    actualizado_en timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_pacientes_estado CHECK (estado IN ('activo', 'inactivo'))
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_pacientes_profesional_dni
  ON pacientes (profesional_id, dni)
  WHERE dni IS NOT NULL AND dni <> '';

CREATE INDEX IF NOT EXISTS idx_pacientes_profesional
  ON pacientes (profesional_id);

CREATE INDEX IF NOT EXISTS idx_pacientes_busqueda
  ON pacientes (profesional_id, apellido, nombre);

CREATE TRIGGER trg_pacientes_actualizado
BEFORE UPDATE ON pacientes
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_timestamp();

-- =====================================================================
-- autorizaciones
-- =====================================================================
CREATE TABLE IF NOT EXISTS autorizaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profesional_id uuid NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
    paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    obra_social text,
    numero_autorizacion text,
    sesiones_autorizadas integer NOT NULL,
    sesiones_restantes integer NOT NULL,
    fecha_desde date NOT NULL,
    fecha_hasta date,
    estado text NOT NULL DEFAULT 'vigente',
    creado_en timestamptz NOT NULL DEFAULT now(),
    actualizado_en timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_autorizaciones_estado CHECK (estado IN ('vigente', 'agotada', 'vencida', 'anulada')),
    CONSTRAINT chk_autorizaciones_sesiones_autorizadas CHECK (sesiones_autorizadas > 0),
    CONSTRAINT chk_autorizaciones_sesiones_restantes CHECK (sesiones_restantes >= 0)
  );

CREATE INDEX IF NOT EXISTS idx_autorizaciones_paciente
  ON autorizaciones (paciente_id);

CREATE INDEX IF NOT EXISTS idx_autorizaciones_profesional
  ON autorizaciones (profesional_id);

CREATE TRIGGER trg_autorizaciones_actualizado
BEFORE UPDATE ON autorizaciones
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_timestamp();

-- =====================================================================
-- turnos
-- =====================================================================
CREATE TABLE IF NOT EXISTS turnos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profesional_id uuid NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
    paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    autorizacion_id uuid REFERENCES autorizaciones(id) ON DELETE SET NULL,
    inicio timestamptz NOT NULL,
    fin timestamptz NOT NULL,
    estado text NOT NULL DEFAULT 'pendiente',
    notas text,
    creado_en timestamptz NOT NULL DEFAULT now(),
    actualizado_en timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_turnos_estado CHECK (estado IN ('pendiente', 'confirmado', 'completado', 'cancelado', 'ausente')),
    CONSTRAINT chk_turnos_rango CHECK (fin > inicio),
    CONSTRAINT turnos_no_solapados EXCLUDE USING gist (
      profesional_id WITH =,
      tstzrange(inicio, fin) WITH &&
    ) WHERE (estado <> 'cancelado')
  );

CREATE INDEX IF NOT EXISTS idx_turnos_profesional_inicio
  ON turnos (profesional_id, inicio);

CREATE INDEX IF NOT EXISTS idx_turnos_paciente
  ON turnos (paciente_id);

CREATE TRIGGER trg_turnos_actualizado
BEFORE UPDATE ON turnos
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_timestamp();

-- ---------------------------------------------------------------------
-- fn_sincronizar_sesiones: descuenta/repone sesiones de la autorizacion
-- cuando un turno pasa a "completado" (o revierte ese estado).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sincronizar_sesiones()
RETURNS TRIGGER AS $$
BEGIN
  -- El turno paso a completado: descuenta una sesion de la autorizacion
  IF NEW.estado = 'completado' AND (OLD.estado IS DISTINCT FROM 'completado') AND NEW.autorizacion_id IS NOT NULL THEN
    UPDATE autorizaciones
       SET sesiones_restantes = GREATEST(sesiones_restantes - 1, 0),
           actualizado_en = now()
     WHERE id = NEW.autorizacion_id;

    UPDATE autorizaciones
       SET estado = 'agotada'
     WHERE id = NEW.autorizacion_id
       AND sesiones_restantes <= 0
       AND estado = 'vigente';
  END IF;

  -- El turno estaba completado y cambia a otro estado: repone la sesion
  IF OLD.estado = 'completado' AND (NEW.estado IS DISTINCT FROM 'completado') AND OLD.autorizacion_id IS NOT NULL THEN
    UPDATE autorizaciones
       SET sesiones_restantes = sesiones_restantes + 1,
           estado = CASE WHEN estado = 'agotada' THEN 'vigente' ELSE estado END,
           actualizado_en = now()
     WHERE id = OLD.autorizacion_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sincronizar_sesiones
AFTER UPDATE ON turnos
FOR EACH ROW
EXECUTE FUNCTION fn_sincronizar_sesiones();

-- =====================================================================
-- Vista v_autorizaciones_detalle
-- =====================================================================
CREATE OR REPLACE VIEW v_autorizaciones_detalle AS
SELECT
  a.id,
  a.profesional_id,
  a.paciente_id,
  a.obra_social,
  a.numero_autorizacion,
  a.sesiones_autorizadas,
  a.sesiones_restantes,
  a.fecha_desde,
  a.fecha_hasta,
  a.estado,
  (a.fecha_hasta IS NOT NULL AND a.fecha_hasta < CURRENT_DATE) AS esta_vencida,
  a.creado_en,
  a.actualizado_en
FROM autorizaciones a;
