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
}

export interface MedicamentoInput {
  nombre: string
  forma?: string | null
  concentracion?: string | null
  via?: string | null
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
