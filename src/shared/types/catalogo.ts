export interface Cie10 {
  codigo: string
  descripcion: string
  categoria: string | null
}

export interface Medicamento {
  id: number
  nombre: string
  forma: string | null
  concentracion: string | null
  via: string | null
  activo: boolean
  /** Solo los medicamentos que la clinica entrega llevan control de existencias. */
  controlaInventario: boolean
  existencia: number
  /** Por debajo de esta cantidad el medicamento se marca como bajo. */
  minimo: number
  /** Como se cuenta: tabletas, frascos, ampollas. */
  unidad: string | null
  vencimiento: string | null
  bajoMinimo: boolean
  vencido: boolean
  /** Vence dentro de los proximos 60 dias: hay tiempo de usarlo o cambiarlo. */
  porVencer: boolean
}

export interface MedicamentoInput {
  nombre: string
  forma?: string | null
  concentracion?: string | null
  via?: string | null
  controlaInventario?: boolean
  minimo?: number | null
  unidad?: string | null
}

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste'

export const TIPOS_MOVIMIENTO: { valor: TipoMovimiento; etiqueta: string }[] = [
  { valor: 'entrada', etiqueta: 'Entrada' },
  { valor: 'salida', etiqueta: 'Salida' },
  { valor: 'ajuste', etiqueta: 'Ajuste' }
]

/** Un movimiento de existencias. Nunca se edita ni se borra: es el historial. */
export interface MovimientoInventario {
  id: number
  medicamentoId: number
  medicamentoNombre: string
  tipo: TipoMovimiento
  cantidad: number
  existenciaResultante: number
  lote: string | null
  vencimiento: string | null
  motivo: string | null
  pacienteId: number | null
  pacienteNombre: string | null
  usuarioNombre: string | null
  fecha: string
}

export interface MovimientoInput {
  medicamentoId: number
  tipo: TipoMovimiento
  /** En un ajuste es la existencia que queda; en entrada y salida, cuanto entra o sale. */
  cantidad: number
  lote?: string | null
  vencimiento?: string | null
  motivo?: string | null
  pacienteId?: number | null
  consultaId?: number | null
}

/**
 * Protocolo propio del doctor asociado a un diagnostico. El sistema NUNCA
 * genera contenido clinico: solo devuelve lo que el doctor guardo previamente.
 */
export interface PlantillaTratamiento {
  id: number
  codigoCie10: string
  nombre: string
  tratamiento: string | null
  recomendaciones: string | null
  items: PlantillaItem[]
  /** Estudios que el doctor suele pedir para ese diagnostico. */
  examenes: PlantillaExamen[]
}

/** Mismo contenido que un examen indicado en consulta, guardado en el protocolo. */
export interface PlantillaExamen {
  id?: number
  examenId: number | null
  nombre: string
  categoria: CategoriaExamen
  indicaciones: string | null
  urgente: boolean
}

export interface PlantillaItem {
  id?: number
  medicamentoId: number | null
  nombre: string
  concentracion: string | null
  forma: string | null
  dosis: string
  frecuencia: string
  duracion: string | null
  via: string | null
  indicaciones: string | null
}

/**
 * Examen o procedimiento del catalogo de la clinica: analisis de laboratorio,
 * estudios de imagen y procedimientos que se indican al paciente.
 */
export type CategoriaExamen = 'laboratorio' | 'imagen' | 'procedimiento' | 'otro'

export const CATEGORIAS_EXAMEN: { valor: CategoriaExamen; etiqueta: string }[] = [
  { valor: 'laboratorio', etiqueta: 'Laboratorio' },
  { valor: 'imagen', etiqueta: 'Imagen' },
  { valor: 'procedimiento', etiqueta: 'Procedimiento' },
  { valor: 'otro', etiqueta: 'Otro' }
]

export interface Examen {
  id: number
  nombre: string
  categoria: CategoriaExamen
  /** Indicacion habitual del estudio: «en ayunas de 8 horas», «con vejiga llena». */
  preparacion: string | null
  activo: boolean
}

export interface ExamenInput {
  nombre: string
  categoria: CategoriaExamen
  preparacion?: string | null
}
