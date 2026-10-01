import type { CategoriaExamen } from './catalogo'

/**
 * Archivo de estudio guardado en el expediente: un resultado de laboratorio,
 * una radiografia, un ultrasonido. El archivo se copia a la carpeta del
 * paciente, de modo que el expediente no dependa de donde estaba el original.
 */
export interface Adjunto {
  id: number
  pacienteId: number
  /** Consulta en la que se adjunto, si se hizo desde una consulta. */
  consultaId: number | null
  categoria: CategoriaExamen
  titulo: string
  /** Lo que el doctor interpreta del estudio, escrito a mano. */
  descripcion: string | null
  /** Fecha en que se realizo el estudio, que no es la de hoy. */
  fechaEstudio: string | null
  ruta: string
  nombreOriginal: string
  extension: string | null
  tamanoBytes: number
  /** La ventana puede mostrarlo en pantalla en vez de solo abrirlo fuera. */
  esImagen: boolean
  creadoEn: string
  usuarioNombre: string | null
}

export interface AdjuntoInput {
  pacienteId: number
  consultaId?: number | null
  categoria: CategoriaExamen
  titulo: string
  descripcion?: string | null
  fechaEstudio?: string | null
}

export type EstadoDocumento = 'vigente' | 'anulada'

/** Constancia de incapacidad: cuantos dias, desde cuando y por que. */
export interface Incapacidad {
  id: number
  pacienteId: number
  consultaId: number | null
  folio: string
  fechaEmision: string
  desde: string
  hasta: string
  dias: number
  motivo: string
  codigoCie10: string | null
  diagnostico: string | null
  observaciones: string | null
  estado: EstadoDocumento
  motivoAnulacion: string | null
  archivoPath: string | null
  creadaEn: string
  nombreDoctor: string | null
  numeroColegiacion: string | null
}

export interface IncapacidadInput {
  pacienteId: number
  consultaId?: number | null
  desde: string
  dias: number
  motivo: string
  codigoCie10?: string | null
  diagnostico?: string | null
  observaciones?: string | null
}

/** Referencia a otro medico o especialista, dentro o fuera de la clinica. */
export interface Referencia {
  id: number
  pacienteId: number
  consultaId: number | null
  folio: string
  fecha: string
  dirigidaA: string
  especialidad: string | null
  institucion: string | null
  motivo: string
  resumenClinico: string | null
  hallazgos: string | null
  codigoCie10: string | null
  diagnostico: string | null
  urgente: boolean
  estado: EstadoDocumento
  motivoAnulacion: string | null
  archivoPath: string | null
  creadaEn: string
  nombreDoctor: string | null
  numeroColegiacion: string | null
}

export interface ReferenciaInput {
  pacienteId: number
  consultaId?: number | null
  dirigidaA: string
  especialidad?: string | null
  institucion?: string | null
  motivo: string
  resumenClinico?: string | null
  hallazgos?: string | null
  codigoCie10?: string | null
  diagnostico?: string | null
  urgente: boolean
}

/**
 * Medicamento que el paciente ya toma de forma permanente por su enfermedad de
 * base. Es informativo: se muestra al atender, pero no entra solo en la receta.
 */
export interface MedicacionCronica {
  id: number
  pacienteId: number
  medicamentoId: number | null
  nombre: string
  concentracion: string | null
  forma: string | null
  dosis: string
  frecuencia: string
  via: string | null
  indicaciones: string | null
  /** Enfermedad base por la que lo toma. */
  motivo: string | null
  desde: string | null
  activa: boolean
  registradaEn: string
}

export interface MedicacionCronicaInput {
  pacienteId: number
  medicamentoId?: number | null
  nombre: string
  concentracion?: string | null
  forma?: string | null
  dosis: string
  frecuencia: string
  via?: string | null
  indicaciones?: string | null
  motivo?: string | null
  desde?: string | null
}
