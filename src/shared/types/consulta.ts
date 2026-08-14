export type EstadoConsulta = 'activa' | 'anulada'

export interface SignosVitales {
  peso: number | null
  altura: number | null
  imc: number | null
  presionSistolica: number | null
  presionDiastolica: number | null
  temperatura: number | null
  frecuenciaCardiaca: number | null
  frecuenciaRespiratoria: number | null
  saturacionOxigeno: number | null
  glucosa: number | null
}

export interface DiagnosticoConsulta {
  id?: number
  codigoCie10: string
  descripcion: string
  esPrincipal: boolean
  nota: string | null
}

export interface MedicamentoRecetado {
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

export interface Consulta {
  id: number
  pacienteId: number
  fecha: string
  motivo: string
  sintomas: string | null
  exploracion: string | null
  tratamiento: string | null
  observaciones: string | null
  recomendaciones: string | null
  proximaCitaFecha: string | null
  sinProximaCita: boolean
  estado: EstadoConsulta
  motivoAnulacion: string | null
  creadaEn: string
  actualizadaEn: string
}

export interface ConsultaCompleta extends Consulta {
  signos: SignosVitales
  diagnosticos: DiagnosticoConsulta[]
  medicamentos: MedicamentoRecetado[]
  adendas: Adenda[]
  editable: boolean
}

export interface Adenda {
  id: number
  consultaId: number
  texto: string
  creadaEn: string
}

export interface ConsultaResumen {
  id: number
  fecha: string
  motivo: string
  estado: EstadoConsulta
  diagnosticoPrincipal: string | null
  totalMedicamentos: number
}

export interface ConsultaInput {
  pacienteId: number
  /** Cita de la agenda desde la que se inició la consulta, si la hubo. */
  citaId?: number | null
  motivo: string
  sintomas?: string | null
  exploracion?: string | null
  tratamiento?: string | null
  observaciones?: string | null
  recomendaciones?: string | null
  proximaCitaFecha?: string | null
  sinProximaCita: boolean
  signos: SignosVitales
  diagnosticos: DiagnosticoConsulta[]
  medicamentos: MedicamentoRecetado[]
}

export interface FiltroHistorial {
  desde?: string | null
  hasta?: string | null
  codigoCie10?: string | null
  texto?: string | null
}

/** Rango de referencia usado para marcar un valor fuera de lo normal, sin bloquear. */
export type NivelAlerta = 'normal' | 'atencion' | 'critico'

export interface AlertaVital {
  campo: keyof SignosVitales
  nivel: NivelAlerta
  mensaje: string
}
