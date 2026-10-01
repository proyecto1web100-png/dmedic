/**
 * Empresa con convenio: agrupa a los pacientes que la clinica atiende como
 * empleados de esa empresa. El codigo es el que la clinica usa para
 * identificarla en sus propios registros.
 */
export interface Empresa {
  id: number
  codigo: string
  nombre: string
  contacto: string | null
  telefono: string | null
  correo: string | null
  notas: string | null
  activa: boolean
  creadaEn: string
  /** Cuantos pacientes tiene asignados, para la lista de empresas. */
  totalPacientes: number
}

export interface EmpresaInput {
  codigo: string
  nombre: string
  contacto?: string | null
  telefono?: string | null
  correo?: string | null
  notas?: string | null
}

/** Una atencion incluida en el reporte que se le entrega a la empresa. */
export interface AtencionEmpresa {
  consultaId: number
  fecha: string
  pacienteId: number
  nombreCompleto: string
  numeroExpediente: string
  codigoEmpleado: string | null
  motivo: string
  diagnosticoPrincipal: string | null
  nombreDoctor: string | null
}

export interface ReporteEmpresa {
  empresa: Empresa
  desde: string
  hasta: string
  atenciones: AtencionEmpresa[]
  totalAtenciones: number
  /** Empleados distintos atendidos en el periodo, que no es lo mismo. */
  totalPacientes: number
}
