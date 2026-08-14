import { citaInputSchema } from '@shared/validation/cita'
import { hoyIso } from '@shared/lib/fecha'
import * as repo from '../repositories/cita'
import * as pacientesRepo from '../repositories/paciente'
import { auditar } from '../audit/auditoria'
import type {
  CitaConPaciente,
  CitaInput,
  EstadoCita,
  ResumenAgenda,
  SolapamientoCita
} from '@shared/types'

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

/** Agenda la cita y devuelve los cruces detectados para que la interfaz avise. */
export function crear(entrada: CitaInput): ResultadoAgendar {
  const datos = validar(entrada)
  const cruces = repo.solapamientos(datos.fecha, datos.hora ?? null, datos.duracionMinutos ?? 30)
  const id = repo.crear(datos)
  auditar({
    accion: 'cita.creada',
    entidad: 'cita',
    entidadId: id,
    detalle: `${datos.fecha}${datos.hora ? ` ${datos.hora}` : ''}`
  })
  return { id, solapamientos: cruces }
}

export function actualizar(id: number, entrada: CitaInput): ResultadoAgendar {
  const datos = validar(entrada)
  if (!repo.obtener(id)) throw new Error('La cita no existe')

  const cruces = repo.solapamientos(
    datos.fecha,
    datos.hora ?? null,
    datos.duracionMinutos ?? 30,
    id
  )
  repo.actualizar(id, datos)
  auditar({
    accion: 'cita.editada',
    entidad: 'cita',
    entidadId: id,
    detalle: `${datos.fecha}${datos.hora ? ` ${datos.hora}` : ''}`
  })
  return { id, solapamientos: cruces }
}

export function cambiarEstado(id: number, estado: EstadoCita): void {
  if (!repo.obtener(id)) throw new Error('La cita no existe')
  repo.cambiarEstado(id, estado)
  auditar({ accion: 'cita.editada', entidad: 'cita', entidadId: id, detalle: `estado ${estado}` })
}

/**
 * Una cita cancelada o pasada se conserva: es historia de la relacion con el
 * paciente. Solo se elimina si nunca llego a atenderse ni a vincularse.
 */
export function eliminar(id: number): void {
  const cita = repo.obtener(id)
  if (!cita) throw new Error('La cita no existe')
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
  excluirId?: number
): SolapamientoCita[] {
  return repo.solapamientos(fecha, hora, duracionMinutos, excluirId)
}

export function enRango(desde: string, hasta: string): CitaConPaciente[] {
  return repo.enRango(desde, hasta)
}

export function dePaciente(pacienteId: number): CitaConPaciente[] {
  return repo.dePaciente(pacienteId)
}

export function obtener(id: number): CitaConPaciente {
  const cita = repo.obtener(id)
  if (!cita) throw new Error('La cita no existe')
  return cita
}

export function resumen(): ResumenAgenda {
  const hoy = hoyIso()
  return { hoy: repo.delDia(hoy), proximas: repo.proximas(hoy) }
}

/**
 * Al guardar una consulta que indica proxima cita se crea (o se actualiza) la
 * cita correspondiente, para que no haya que agendarla a mano por separado.
 * Si la consulta pasa a "sin proxima cita", la cita generada se retira.
 */
export function sincronizarDesdeConsulta(
  consultaId: number,
  pacienteId: number,
  proximaCitaFecha: string | null
): void {
  const existente = repo.porConsultaOrigen(consultaId)

  if (proximaCitaFecha === null) {
    // Solo se retira si sigue pendiente: una cita ya atendida es historia.
    if (existente && existente.estado === 'agendada' && existente.consultaAtencionId === null) {
      repo.eliminar(existente.id)
    }
    return
  }

  const datos: CitaInput = {
    pacienteId,
    fecha: proximaCitaFecha,
    hora: existente?.hora ?? null,
    duracionMinutos: existente?.duracionMinutos ?? 30,
    motivo: existente?.motivo ?? 'Control',
    notas: existente?.notas ?? null,
    consultaOrigenId: consultaId
  }

  if (existente) {
    repo.actualizar(existente.id, datos)
  } else {
    repo.crear(datos)
  }
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
  return repo.contarAgendadasEn(hoyIso())
}
