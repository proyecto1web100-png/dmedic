import { db } from '../db/conexion'
import { ahoraIso } from '@shared/lib/fecha'
import { nombreCompleto } from '@shared/lib/paciente'
import type {
  Cita,
  CitaConPaciente,
  CitaInput,
  EstadoCita,
  FiltroAgenda,
  SolapamientoCita
} from '@shared/types'

interface FilaCita {
  id: number
  doctor_id: number | null
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
  nombre_doctor: string | null
}

function aCita(f: FilaCita): Cita {
  return {
    id: f.id,
    doctorId: f.doctor_id,
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
    esPacienteRegistrado: registrado,
    nombreDoctor: f.nombre_doctor
  }
}

const SELECT_CON_PACIENTE = `
  SELECT c.*,
         p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido,
         p.numero_expediente, p.telefono AS telefono_paciente,
         u.nombre AS nombre_doctor
    FROM cita c
    LEFT JOIN paciente p ON p.id = c.paciente_id
    LEFT JOIN usuario u  ON u.id = c.doctor_id`

/** Las citas sin hora encabezan el día; el resto van en orden cronológico. */
const ORDEN = 'ORDER BY c.fecha, c.hora IS NOT NULL, c.hora'

export function crear(input: CitaInput, creadaPor: number): number {
  const ahora = ahoraIso()
  const resultado = db()
    .prepare(
      `INSERT INTO cita (
         doctor_id, paciente_id, nombre_provisional, telefono_provisional, fecha, hora,
         duracion_minutos, motivo, estado, notas, consulta_origen_id,
         creada_por, creada_en, actualizada_en
       ) VALUES (
         @doctorId, @pacienteId, @nombreProvisional, @telefonoProvisional, @fecha, @hora,
         @duracionMinutos, @motivo, 'agendada', @notas, @consultaOrigenId,
         @creadaPor, @ahora, @ahora
       )`
    )
    .run({
      doctorId: input.doctorId ?? null,
      creadaPor,
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
         doctor_id = @doctorId, paciente_id = @pacienteId,
         nombre_provisional = @nombreProvisional,
         telefono_provisional = @telefonoProvisional, fecha = @fecha, hora = @hora,
         duracion_minutos = @duracionMinutos, motivo = @motivo, notas = @notas,
         actualizada_en = @ahora
       WHERE id = @id`
    )
    .run({
      id,
      doctorId: input.doctorId ?? null,
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

export function enRango(filtro: FiltroAgenda): CitaConPaciente[] {
  const condiciones = ['c.fecha BETWEEN @desde AND @hasta']
  const parametros: Record<string, unknown> = { desde: filtro.desde, hasta: filtro.hasta }

  if (filtro.doctorId != null) {
    condiciones.push('c.doctor_id = @doctorId')
    parametros.doctorId = filtro.doctorId
  }
  if (filtro.incluirCanceladas === false) {
    condiciones.push(`c.estado != 'cancelada'`)
  }

  const filas = db()
    .prepare(`${SELECT_CON_PACIENTE} WHERE ${condiciones.join(' AND ')} ${ORDEN}`)
    .all(parametros) as FilaCitaConPaciente[]
  return filas.map(aCitaConPaciente)
}

export function delDia(fecha: string, doctorId?: number | null): CitaConPaciente[] {
  return enRango({ desde: fecha, hasta: fecha, doctorId })
}

export function proximas(
  desde: string,
  doctorId?: number | null,
  limite = 10
): CitaConPaciente[] {
  const filtroDoctor = doctorId != null ? 'AND c.doctor_id = @doctorId' : ''
  const filas = db()
    .prepare(
      `${SELECT_CON_PACIENTE}
        WHERE c.fecha > @desde AND c.estado = 'agendada' ${filtroDoctor}
        ${ORDEN}
        LIMIT @limite`
    )
    .all({ desde, doctorId: doctorId ?? null, limite }) as FilaCitaConPaciente[]
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
  excluirId?: number,
  doctorId?: number | null
): SolapamientoCita[] {
  if (hora === null) return []

  const inicio = aMinutos(hora)
  const fin = inicio + duracionMinutos

  // El cruce solo importa dentro de la agenda del mismo doctor: dos doctores
  // atendiendo a la misma hora en consultorios distintos es lo normal.
  return delDia(fecha, doctorId)
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

export function contarAgendadasEn(fecha: string, doctorId?: number | null): number {
  const filtro = doctorId != null ? 'AND doctor_id = @doctorId' : ''
  const fila = db()
    .prepare(
      `SELECT COUNT(*) AS total FROM cita
        WHERE fecha = @fecha AND estado = 'agendada' ${filtro}`
    )
    .get({ fecha, doctorId: doctorId ?? null }) as { total: number }
  return fila.total
}

export function doctoresConAgenda(): { id: number; nombre: string }[] {
  return db()
    .prepare(
      `SELECT id, nombre FROM usuario
        WHERE rol = 'doctor' AND activo = 1
        ORDER BY nombre`
    )
    .all() as { id: number; nombre: string }[]
}
