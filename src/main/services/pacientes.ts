import { pacienteInputSchema } from '@shared/validation/paciente'
import { nombreCompleto } from '@shared/lib/paciente'
import * as repo from '../repositories/paciente'
import { auditar } from '../audit/auditoria'
import type {
  ExpedienteResumen,
  FichaPaciente,
  PacienteConResumen,
  PacienteInput
} from '@shared/types'

export class ErrorIdentidadDuplicada extends Error {
  readonly codigo = 'IDENTIDAD_DUPLICADA'
  constructor(readonly expedienteExistente: string) {
    super(`Ya existe un paciente registrado con ese número de identidad (${expedienteExistente})`)
  }
}

function validar(entrada: PacienteInput): PacienteInput {
  const resultado = pacienteInputSchema.safeParse(entrada)
  if (!resultado.success) {
    const primero = resultado.error.issues[0]
    throw new Error(primero.message)
  }
  return resultado.data as PacienteInput
}

export function crear(entrada: PacienteInput): number {
  const datos = validar(entrada)

  if (datos.numeroIdentidad) {
    const existente = repo.obtenerPorIdentidad(datos.numeroIdentidad)
    if (existente) throw new ErrorIdentidadDuplicada(existente.numeroExpediente)
  }

  const id = repo.crear(datos)
  auditar({
    accion: 'paciente.creado',
    entidad: 'paciente',
    entidadId: id,
    detalle: nombreCompleto({
      primerNombre: datos.primerNombre,
      segundoNombre: datos.segundoNombre ?? null,
      primerApellido: datos.primerApellido,
      segundoApellido: datos.segundoApellido ?? null
    })
  })
  return id
}

export function actualizar(id: number, entrada: PacienteInput): void {
  const datos = validar(entrada)

  if (datos.numeroIdentidad) {
    const existente = repo.obtenerPorIdentidad(datos.numeroIdentidad)
    if (existente && existente.id !== id) {
      throw new ErrorIdentidadDuplicada(existente.numeroExpediente)
    }
  }

  repo.actualizar(id, datos)
  auditar({ accion: 'paciente.editado', entidad: 'paciente', entidadId: id })
}

/** Aviso previo al alta: mismo nombre y misma fecha de nacimiento. No bloquea. */
export function revisarDuplicados(entrada: {
  primerNombre: string
  primerApellido: string
  fechaNacimiento: string
  excluirId?: number
}): PacienteConResumen[] {
  if (!entrada.primerNombre || !entrada.primerApellido || !entrada.fechaNacimiento) return []
  return repo.posiblesDuplicados(
    entrada.primerNombre,
    entrada.primerApellido,
    entrada.fechaNacimiento,
    entrada.excluirId
  )
}

export function buscar(
  texto: string,
  opciones: { limite?: number; incluirInactivos?: boolean } = {}
): PacienteConResumen[] {
  return repo.buscar(texto, opciones)
}

/**
 * Los doctores comparten los expedientes, asi que cada apertura queda
 * registrada con su autor: es lo que permite distinguir una consulta legitima
 * de la curiosidad sobre el expediente de un conocido.
 */
export function expediente(id: number): ExpedienteResumen {
  const resumen = repo.expedienteResumen(id)
  if (!resumen) throw new Error('El paciente no existe')

  auditar({
    accion: 'paciente.consultado',
    entidad: 'paciente',
    entidadId: id,
    detalle: resumen.paciente.numeroExpediente
  })
  return resumen
}

/** Version sin datos clinicos, para quien no tiene permiso de verlos. */
export function ficha(id: number): FichaPaciente {
  const resumen = repo.expedienteResumen(id)
  if (!resumen) throw new Error('El paciente no existe')
  return {
    paciente: resumen.paciente,
    contactos: resumen.contactos,
    responsable: resumen.responsable
  }
}

export function archivar(id: number): void {
  repo.archivar(id)
  auditar({ accion: 'paciente.archivado', entidad: 'paciente', entidadId: id })
}

export function reactivar(id: number): void {
  repo.reactivar(id)
  auditar({ accion: 'paciente.reactivado', entidad: 'paciente', entidadId: id })
}

/**
 * Borrado irreversible. Exige que el usuario reescriba el numero de expediente:
 * hace imposible destruir un expediente por un clic accidental.
 */
export function eliminarDefinitivo(id: number, confirmacionExpediente: string): void {
  const paciente = repo.obtener(id)
  if (!paciente) throw new Error('El paciente no existe')

  if (confirmacionExpediente.trim().toUpperCase() !== paciente.numeroExpediente.toUpperCase()) {
    throw new Error(
      `Para eliminar definitivamente debe escribir el número de expediente exacto: ${paciente.numeroExpediente}`
    )
  }

  auditar({
    accion: 'paciente.eliminado',
    entidad: 'paciente',
    entidadId: id,
    detalle: `${paciente.numeroExpediente} · ${nombreCompleto(paciente)}`
  })
  repo.eliminarDefinitivo(id)
}

export const alergias = repo.alergias
export const agregarAlergia = repo.agregarAlergia
export const alternarAlergia = repo.alternarAlergia
export const eliminarAlergia = repo.eliminarAlergia
export const antecedentes = repo.antecedentes
export const agregarAntecedente = repo.agregarAntecedente
export const eliminarAntecedente = repo.eliminarAntecedente
export const cronicos = repo.cronicos
export const agregarCronico = repo.agregarCronico
export const alternarCronico = repo.alternarCronico
export const eliminarCronico = repo.eliminarCronico
