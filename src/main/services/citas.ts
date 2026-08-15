import { citaInputSchema } from '@shared/validation/cita'
import { hoyIso } from '@shared/lib/fecha'
import * as repo from '../repositories/cita'
import * as pacientesRepo from '../repositories/paciente'
import { auditar } from '../audit/auditoria'
import { exigirSesion, puede } from '../security/sesion'
import type {
  CitaConPaciente,
  CitaInput,
  EstadoCita,
  FiltroAgenda,
  PeriodoReporte,
  ReporteCitas,
  ResumenAgenda,
  SolapamientoCita
} from '@shared/types'

export class ErrorAgendaAjena extends Error {
  readonly codigo = 'AGENDA_AJENA'
  constructor() {
    super(
      'Solo puede modificar las citas de su propia agenda. La secretaría gestiona la de todos los doctores.'
    )
  }
}

/**
 * Un doctor solo toca su agenda; la secretaria puede agendar para cualquiera.
 * Devuelve el doctor al que debe quedar asignada la cita.
 */
function resolverDoctor(input: CitaInput): number {
  const sesion = exigirSesion()

  if (sesion.rol === 'doctor') {
    // Al agendar como doctor la cita es suya, sin preguntar.
    if (input.doctorId != null && input.doctorId !== sesion.usuarioId) {
      throw new ErrorAgendaAjena()
    }
    return sesion.usuarioId
  }

  if (input.doctorId == null) {
    throw new Error('Indique para qué doctor es la cita')
  }
  const doctores = repo.doctoresConAgenda()
  if (!doctores.some((d) => d.id === input.doctorId)) {
    throw new Error('El doctor seleccionado no existe o está desactivado')
  }
  return input.doctorId
}

/** Impide que un doctor edite, cancele o borre una cita que no es suya. */
function exigirPropiedad(citaId: number): CitaConPaciente {
  const sesion = exigirSesion()
  const cita = repo.obtener(citaId)
  if (!cita) throw new Error('La cita no existe')

  if (!puede('citas.gestionar_todas') && cita.doctorId !== sesion.usuarioId) {
    throw new ErrorAgendaAjena()
  }
  return cita
}

function validar(entrada: CitaInput): CitaInput {
  const resultado = citaInputSchema.safeParse(entrada)
  if (!resultado.success) throw new Error(resultado.error.issues[0].message)
  const datos = resultado.data as CitaInput

  if (datos.pacienteId && !pacientesRepo.obtener(datos.pacienteId)) {
    throw new Error('El paciente seleccionado no existe')
  }
  return datos
}

export interface ResultadoAgendar {
  id: number
  solapamientos: SolapamientoCita[]
}

export function crear(entrada: CitaInput): ResultadoAgendar {
  const sesion = exigirSesion()
  const datos = validar(entrada)
  const doctorId = resolverDoctor(datos)

  const cruces = repo.solapamientos(
    datos.fecha,
    datos.hora ?? null,
    datos.duracionMinutos ?? 30,
    undefined,
    doctorId
  )
  const id = repo.crear({ ...datos, doctorId }, sesion.usuarioId)
  auditar({
    accion: 'cita.creada',
    entidad: 'cita',
    entidadId: id,
    detalle: `${datos.fecha}${datos.hora ? ` ${datos.hora}` : ''} · doctor ${doctorId}`
  })
  return { id, solapamientos: cruces }
}

export function actualizar(id: number, entrada: CitaInput): ResultadoAgendar {
  exigirPropiedad(id)
  const datos = validar(entrada)
  const doctorId = resolverDoctor(datos)

  const cruces = repo.solapamientos(
    datos.fecha,
    datos.hora ?? null,
    datos.duracionMinutos ?? 30,
    id,
    doctorId
  )
  repo.actualizar(id, { ...datos, doctorId })
  auditar({
    accion: 'cita.editada',
    entidad: 'cita',
    entidadId: id,
    detalle: `${datos.fecha}${datos.hora ? ` ${datos.hora}` : ''} · doctor ${doctorId}`
  })
  return { id, solapamientos: cruces }
}

export function cambiarEstado(id: number, estado: EstadoCita): void {
  exigirPropiedad(id)
  repo.cambiarEstado(id, estado)
  auditar({ accion: 'cita.editada', entidad: 'cita', entidadId: id, detalle: `estado ${estado}` })
}

export function eliminar(id: number): void {
  const cita = exigirPropiedad(id)
  if (cita.consultaAtencionId !== null) {
    throw new Error(
      'Esta cita ya tiene una consulta asociada. Puede cancelarla, pero no eliminarla.'
    )
  }
  repo.eliminar(id)
  auditar({ accion: 'cita.eliminada', entidad: 'cita', entidadId: id })
}

export function comprobarSolapamiento(
  fecha: string,
  hora: string | null,
  duracionMinutos: number,
  excluirId?: number,
  doctorId?: number | null
): SolapamientoCita[] {
  const sesion = exigirSesion()
  const objetivo = sesion.rol === 'doctor' ? sesion.usuarioId : (doctorId ?? null)
  return repo.solapamientos(fecha, hora, duracionMinutos, excluirId, objetivo)
}

/** Un doctor ve su propia agenda; la secretaría ve la de todos o filtra por uno. */
function alcanceDoctor(doctorId?: number | null): number | null {
  const sesion = exigirSesion()
  if (sesion.rol === 'doctor') return sesion.usuarioId
  return doctorId ?? null
}

export function enRango(desde: string, hasta: string, doctorId?: number | null): CitaConPaciente[] {
  return repo.enRango({ desde, hasta, doctorId: alcanceDoctor(doctorId) })
}

export function dePaciente(pacienteId: number): CitaConPaciente[] {
  return repo.dePaciente(pacienteId)
}

export function obtener(id: number): CitaConPaciente {
  const cita = repo.obtener(id)
  if (!cita) throw new Error('La cita no existe')
  return cita
}

export function doctores(): { id: number; nombre: string }[] {
  return repo.doctoresConAgenda()
}

export function resumen(): ResumenAgenda {
  const hoy = hoyIso()
  const doctorId = alcanceDoctor(null)
  return { hoy: repo.delDia(hoy, doctorId), proximas: repo.proximas(hoy, doctorId) }
}

/** Rango de fechas que cubre el período pedido, tomando la fecha como referencia. */
export function rangoDelPeriodo(
  periodo: PeriodoReporte,
  referencia: string
): { desde: string; hasta: string } {
  const fecha = new Date(`${referencia}T00:00:00`)
  const aIso = (f: Date): string =>
    `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`

  if (periodo === 'dia') return { desde: referencia, hasta: referencia }

  if (periodo === 'semana') {
    const dia = fecha.getDay()
    const inicio = new Date(fecha)
    inicio.setDate(fecha.getDate() + (dia === 0 ? -6 : 1 - dia))
    const fin = new Date(inicio)
    fin.setDate(inicio.getDate() + 6)
    return { desde: aIso(inicio), hasta: aIso(fin) }
  }

  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)
  return { desde: aIso(inicio), hasta: aIso(fin) }
}

/**
 * Reporte que la secretaria imprime y entrega a cada doctor. Al no haber red,
 * el papel es el canal por el que la agenda llega a quien la necesita.
 */
export function reporte(
  periodo: PeriodoReporte,
  referencia: string,
  doctorId: number | null
): ReporteCitas {
  const objetivo = alcanceDoctor(doctorId)
  const { desde, hasta } = rangoDelPeriodo(periodo, referencia)
  const citas = repo.enRango({ desde, hasta, doctorId: objetivo })

  const nombreDoctor =
    objetivo === null
      ? null
      : (repo.doctoresConAgenda().find((d) => d.id === objetivo)?.nombre ?? null)

  return {
    periodo,
    desde,
    hasta,
    doctorId: objetivo,
    nombreDoctor,
    citas,
    totales: {
      agendadas: citas.filter((c) => c.estado === 'agendada').length,
      atendidas: citas.filter((c) => c.estado === 'atendida').length,
      noAsistio: citas.filter((c) => c.estado === 'no_asistio').length,
      canceladas: citas.filter((c) => c.estado === 'cancelada').length
    }
  }
}

export function sincronizarDesdeConsulta(
  consultaId: number,
  pacienteId: number,
  doctorId: number,
  proximaCitaFecha: string | null
): void {
  const existente = repo.porConsultaOrigen(consultaId)

  if (proximaCitaFecha === null) {
    if (existente && existente.estado === 'agendada' && existente.consultaAtencionId === null) {
      repo.eliminar(existente.id)
    }
    return
  }

  const datos: CitaInput = {
    doctorId,
    pacienteId,
    fecha: proximaCitaFecha,
    hora: existente?.hora ?? null,
    duracionMinutos: existente?.duracionMinutos ?? 30,
    motivo: existente?.motivo ?? 'Control',
    notas: existente?.notas ?? null,
    consultaOrigenId: consultaId
  }

  if (existente) repo.actualizar(existente.id, datos)
  else repo.crear(datos, doctorId)
}

export function vincularConsulta(citaId: number, consultaId: number): void {
  repo.vincularConsulta(citaId, consultaId)
  auditar({
    accion: 'cita.editada',
    entidad: 'cita',
    entidadId: citaId,
    detalle: `atendida en consulta ${consultaId}`
  })
}

export function contarAgendadasHoy(): number {
  return repo.contarAgendadasEn(hoyIso(), alcanceDoctor(null))
}

export function filtroPorDefecto(): FiltroAgenda {
  const hoy = hoyIso()
  return { desde: hoy, hasta: hoy, doctorId: alcanceDoctor(null) }
}
