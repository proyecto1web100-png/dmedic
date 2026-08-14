export type EstadoCita = 'agendada' | 'atendida' | 'no_asistio' | 'cancelada'

export const ESTADOS_CITA: { valor: EstadoCita; etiqueta: string }[] = [
  { valor: 'agendada', etiqueta: 'Agendada' },
  { valor: 'atendida', etiqueta: 'Atendida' },
  { valor: 'no_asistio', etiqueta: 'No asistió' },
  { valor: 'cancelada', etiqueta: 'Cancelada' }
]

export interface Cita {
  id: number
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
}

export interface CitaInput {
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
