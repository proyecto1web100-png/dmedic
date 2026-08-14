import { db } from '../db/conexion'
import { ahoraIso } from '@shared/lib/fecha'
import { nombreCompleto } from '@shared/lib/paciente'
import type { Cita, CitaConPaciente, CitaInput, EstadoCita, SolapamientoCita } from '@shared/types'

interface FilaCita {
  id: number
  paciente_id: number | null
  nombre_provisional: string | null
  telefono_provisional: string | null
  fecha: string
  hora: string | null
  duracion_minutos: number
  motivo: string | null
  estado: EstadoCita
  notas: string | null
  consulta_origen_id: number | null
  consulta_atencion_id: number | null
  creada_en: string
  actualizada_en: string
}

interface FilaCitaConPaciente extends FilaCita {
  primer_nombre: string | null
  segundo_nombre: string | null
  primer_apellido: string | null
  segundo_apellido: string | null
  numero_expediente: string | null
  telefono_paciente: string | null
}

function aCita(f: FilaCita): Cita {
  return {
    id: f.id,
    pacienteId: f.paciente_id,
    nombreProvisional: f.nombre_provisional,
    telefonoProvisional: f.telefono_provisional,
    fecha: f.fecha,
    hora: f.hora,
    duracionMinutos: f.duracion_minutos,
    motivo: f.motivo,
    estado: f.estado,
    notas: f.notas,
    consultaOrigenId: f.consulta_origen_id,
    consultaAtencionId: f.consulta_atencion_id,
    creadaEn: f.creada_en,
    actualizadaEn: f.actualizada_en
  }
}

function aCitaConPaciente(f: FilaCitaConPaciente): CitaConPaciente {
  const registrado = f.paciente_id !== null && f.primer_nombre !== null
  return {
    ...aCita(f),
    nombre: registrado
      ? nombreCompleto({
          primerNombre: f.primer_nombre as string,
          segundoNombre: f.segundo_nombre,
          primerApellido: f.primer_apellido as string,
          segundoApellido: f.segundo_apellido
        })
      : (f.nombre_provisional ?? 'Sin nombre'),
    numeroExpediente: f.numero_expediente,
    telefono: registrado ? f.telefono_paciente : f.telefono_provisional,
    esPacienteRegistrado: registrado
  }
}

const SELECT_CON_PACIENTE = `
  SELECT c.*,
         p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido,
         p.numero_expediente, p.telefono AS telefono_paciente
    FROM cita c
    LEFT JOIN paciente p ON p.id = c.paciente_id`

/** Las citas sin hora encabezan el día; el resto van en orden cronológico. */
const ORDEN = 'ORDER BY c.fecha, c.hora IS NOT NULL, c.hora'

export function crear(input: CitaInput): number {
  const ahora = ahoraIso()
  const resultado = db()
    .prepare(
      `INSERT INTO cita (
         paciente_id, nombre_provisional, telefono_provisional, fecha, hora,
         duracion_minutos, motivo, estado, notas, consulta_origen_id,
         creada_en, actualizada_en
       ) VALUES (
         @pacienteId, @nombreProvisional, @telefonoProvisional, @fecha, @hora,
         @duracionMinutos, @motivo, 'agendada', @notas, @consultaOrigenId,
         @ahora, @ahora
       )`
    )
    .run({
      pacienteId: input.pacienteId ?? null,
      nombreProvisional: input.nombreProvisional ?? null,
      telefonoProvisional: input.telefonoProvisional ?? null,
      fecha: input.fecha,
      hora: input.hora ?? null,
      duracionMinutos: input.duracionMinutos ?? 30,
      motivo: input.motivo ?? null,
      notas: input.notas ?? null,
      consultaOrigenId: input.consultaOrigenId ?? null,
      ahora
    })
  return Number(resultado.lastInsertRowid)
}

export function actualizar(id: number, input: CitaInput): void {
  db()
    .prepare(
      `UPDATE cita SET
         paciente_id = @pacienteId, nombre_provisional = @nombreProvisional,
         telefono_provisional = @telefonoProvisional, fecha = @fecha, hora = @hora,
         duracion_minutos = @duracionMinutos, motivo = @motivo, notas = @notas,
         actualizada_en = @ahora
       WHERE id = @id`
    )
    .run({
      id,
      pacienteId: input.pacienteId ?? null,
      nombreProvisional: input.nombreProvisional ?? null,
      telefonoProvisional: input.telefonoProvisional ?? null,
      fecha: input.fecha,
      hora: input.hora ?? null,
      duracionMinutos: input.duracionMinutos ?? 30,
      motivo: input.motivo ?? null,
      notas: input.notas ?? null,
      ahora: ahoraIso()
    })
}

export function cambiarEstado(id: number, estado: EstadoCita): void {
  db()
    .prepare('UPDATE cita SET estado = ?, actualizada_en = ? WHERE id = ?')
    .run(estado, ahoraIso(), id)
}

export function vincularConsulta(id: number, consultaId: number): void {
  db()
    .prepare(
      `UPDATE cita SET consulta_atencion_id = ?, estado = 'atendida', actualizada_en = ?
       WHERE id = ?`
    )
    .run(consultaId, ahoraIso(), id)
}

export function eliminar(id: number): void {
  db().prepare('DELETE FROM cita WHERE id = ?').run(id)
}

export function obtener(id: number): CitaConPaciente | null {
  const fila = db().prepare(`${SELECT_CON_PACIENTE} WHERE c.id = ?`).get(id) as
    | FilaCitaConPaciente
    | undefined
  return fila ? aCitaConPaciente(fila) : null
}

export function enRango(desde: string, hasta: string): CitaConPaciente[] {
  const filas = db()
    .prepare(`${SELECT_CON_PACIENTE} WHERE c.fecha BETWEEN ? AND ? ${ORDEN}`)
    .all(desde, hasta) as FilaCitaConPaciente[]
  return filas.map(aCitaConPaciente)
}

export function delDia(fecha: string): CitaConPaciente[] {
  const filas = db()
    .prepare(`${SELECT_CON_PACIENTE} WHERE c.fecha = ? ${ORDEN}`)
    .all(fecha) as FilaCitaConPaciente[]
  return filas.map(aCitaConPaciente)
}

export function proximas(desde: string, limite = 10): CitaConPaciente[] {
  const filas = db()
    .prepare(
      `${SELECT_CON_PACIENTE}
        WHERE c.fecha > ? AND c.estado = 'agendada'
        ${ORDEN}
        LIMIT ?`
    )
    .all(desde, limite) as FilaCitaConPaciente[]
  return filas.map(aCitaConPaciente)
}

export function dePaciente(pacienteId: number): CitaConPaciente[] {
  const filas = db()
    .prepare(`${SELECT_CON_PACIENTE} WHERE c.paciente_id = ? ORDER BY c.fecha DESC, c.hora DESC`)
    .all(pacienteId) as FilaCitaConPaciente[]
  return filas.map(aCitaConPaciente)
}

export function porConsultaOrigen(consultaId: number): Cita | null {
  const fila = db().prepare('SELECT * FROM cita WHERE consulta_origen_id = ?').get(consultaId) as
    | FilaCita
    | undefined
  return fila ? aCita(fila) : null
}

function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

/**
 * Citas del mismo dia cuyo intervalo se cruza con el propuesto. Solo informa:
 * el doctor decidio que la agenda no tiene restriccion de horarios.
 */
export function solapamientos(
  fecha: string,
  hora: string | null,
  duracionMinutos: number,
  excluirId?: number
): SolapamientoCita[] {
  if (hora === null) return []

  const inicio = aMinutos(hora)
  const fin = inicio + duracionMinutos

  return delDia(fecha)
    .filter(
      (c) =>
        c.id !== excluirId &&
        c.hora !== null &&
        c.estado === 'agendada' &&
        aMinutos(c.hora) < fin &&
        aMinutos(c.hora) + c.duracionMinutos > inicio
    )
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      hora: c.hora as string,
      duracionMinutos: c.duracionMinutos
    }))
}

export function contarAgendadasEn(fecha: string): number {
  const fila = db()
    .prepare(`SELECT COUNT(*) AS total FROM cita WHERE fecha = ? AND estado = 'agendada'`)
    .get(fecha) as { total: number }
  return fila.total
}
