export type EstadoCita = 'agendada' | 'atendida' | 'no_asistio' | 'cancelada'

export const ESTADOS_CITA: { valor: EstadoCita; etiqueta: string }[] = [
  { valor: 'agendada', etiqueta: 'Agendada' },
  { valor: 'atendida', etiqueta: 'Atendida' },
  { valor: 'no_asistio', etiqueta: 'No asistió' },
  { valor: 'cancelada', etiqueta: 'Cancelada' }
]

export interface Cita {
  id: number
  /** Doctor al que pertenece la cita. Define de quién es la agenda. */
  doctorId: number | null
  pacienteId: number | null
  nombreProvisional: string | null
  telefonoProvisional: string | null
  fecha: string
  hora: string | null
  duracionMinutos: number
  motivo: string | null
  estado: EstadoCita
  notas: string | null
  consultaOrigenId: number | null
  consultaAtencionId: number | null
  creadaEn: string
  actualizadaEn: string
}

/** Cita con los datos del paciente ya resueltos, lista para pintar en el calendario. */
export interface CitaConPaciente extends Cita {
  nombre: string
  numeroExpediente: string | null
  telefono: string | null
  esPacienteRegistrado: boolean
  nombreDoctor: string | null
}

export interface CitaInput {
  /** Solo la secretaría puede elegirlo; un doctor siempre se lo asigna a sí mismo. */
  doctorId?: number | null
  pacienteId?: number | null
  nombreProvisional?: string | null
  telefonoProvisional?: string | null
  fecha: string
  hora?: string | null
  duracionMinutos?: number
  motivo?: string | null
  notas?: string | null
  consultaOrigenId?: number | null
}

/** Solapamiento detectado al agendar. Avisa, nunca impide guardar. */
export interface SolapamientoCita {
  id: number
  nombre: string
  hora: string
  duracionMinutos: number
}

export interface ResumenAgenda {
  hoy: CitaConPaciente[]
  proximas: CitaConPaciente[]
}

export type PeriodoReporte = 'dia' | 'semana' | 'mes'

export interface FiltroAgenda {
  desde: string
  hasta: string
  /** Nulo = todos los doctores. Un doctor solo puede pedir la suya. */
  doctorId?: number | null
  incluirCanceladas?: boolean
}

export interface ReporteCitas {
  periodo: PeriodoReporte
  desde: string
  hasta: string
  doctorId: number | null
  nombreDoctor: string | null
  citas: CitaConPaciente[]
  totales: {
    agendadas: number
    atendidas: number
    noAsistio: number
    canceladas: number
  }
}
