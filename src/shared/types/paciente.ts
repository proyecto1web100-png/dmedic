export type Sexo = 'M' | 'F'

export type GravedadAlergia = 'leve' | 'moderada' | 'grave'

export type TipoAntecedente =
  | 'personal_patologico'
  | 'familiar'
  | 'quirurgico'
  | 'habitos'
  | 'gineco_obstetrico'

export const TIPOS_ANTECEDENTE: { valor: TipoAntecedente; etiqueta: string }[] = [
  { valor: 'personal_patologico', etiqueta: 'Personales patológicos' },
  { valor: 'familiar', etiqueta: 'Familiares' },
  { valor: 'quirurgico', etiqueta: 'Quirúrgicos' },
  { valor: 'habitos', etiqueta: 'Hábitos' },
  { valor: 'gineco_obstetrico', etiqueta: 'Gineco-obstétricos' }
]

export interface ContactoEmergencia {
  id?: number
  nombre: string
  telefono: string
  parentesco: string | null
}

export interface Alergia {
  id: number
  pacienteId: number
  sustancia: string
  reaccion: string | null
  gravedad: GravedadAlergia
  activa: boolean
  registradaEn: string
}

export interface Antecedente {
  id: number
  pacienteId: number
  tipo: TipoAntecedente
  descripcion: string
  registradoEn: string
  vigente: boolean
}

export interface ProblemaCronico {
  id: number
  pacienteId: number
  codigoCie10: string | null
  descripcion: string
  desde: string | null
  activo: boolean
}

/** Datos que identifican y describen a la persona. No cambian por consulta. */
export interface Paciente {
  id: number
  numeroExpediente: string
  primerNombre: string
  segundoNombre: string | null
  primerApellido: string
  segundoApellido: string | null
  fechaNacimiento: string
  sexo: Sexo
  numeroIdentidad: string | null
  telefono: string | null
  correo: string | null
  direccion: string | null
  tipoSangre: string | null
  aseguradora: string | null
  referidoPor: string | null
  notas: string | null
  responsableId: number | null
  responsableParentesco: string | null
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface PacienteConResumen extends Paciente {
  nombreCompleto: string
  edad: number
  ultimaConsultaEn: string | null
  totalConsultas: number
}

/** Todo lo que la cabecera del expediente necesita mostrar de inmediato. */
export interface ExpedienteResumen {
  paciente: PacienteConResumen
  contactos: ContactoEmergencia[]
  alergias: Alergia[]
  antecedentes: Antecedente[]
  cronicos: ProblemaCronico[]
  medicacionActual: MedicacionActual[]
  responsable: { id: number; nombreCompleto: string; numeroIdentidad: string | null } | null
}

export interface MedicacionActual {
  nombre: string
  concentracion: string | null
  dosis: string
  frecuencia: string
  duracion: string | null
  desde: string
}

export interface PacienteInput {
  primerNombre: string
  segundoNombre?: string | null
  primerApellido: string
  segundoApellido?: string | null
  fechaNacimiento: string
  sexo: Sexo
  numeroIdentidad?: string | null
  telefono?: string | null
  correo?: string | null
  direccion?: string | null
  tipoSangre?: string | null
  aseguradora?: string | null
  referidoPor?: string | null
  notas?: string | null
  responsableId?: number | null
  responsableParentesco?: string | null
  contactos?: ContactoEmergencia[]
}
