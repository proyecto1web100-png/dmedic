export type Rol = 'doctor' | 'secretaria'

export const ROLES: { valor: Rol; etiqueta: string; descripcion: string }[] = [
  {
    valor: 'doctor',
    etiqueta: 'Doctor',
    descripcion: 'Atiende consultas y accede a la información clínica completa.'
  },
  {
    valor: 'secretaria',
    etiqueta: 'Secretaria',
    descripcion: 'Gestiona la agenda y los datos de contacto. Sin acceso clínico.'
  }
]

export type Permiso =
  | 'pacientes.ver'
  | 'pacientes.ver_clinico'
  | 'pacientes.registrar'
  | 'pacientes.editar_contacto'
  | 'pacientes.editar_clinico'
  | 'pacientes.archivar'
  | 'pacientes.eliminar'
  | 'consultas.ver'
  | 'consultas.crear'
  | 'consultas.editar'
  | 'consultas.anular'
  | 'documentos.generar'
  | 'citas.ver'
  | 'citas.gestionar'
  | 'catalogo.gestionar'
  | 'usuarios.gestionar'
  | 'backups.crear'
  | 'backups.restaurar'
  | 'configuracion.clinica'

/**
 * Un doctor accede a todo lo clinico pero NO administra la agenda: crear y
 * mover citas es competencia exclusiva de la secretaria.
 */
const PERMISOS_DOCTOR: Permiso[] = [
  'pacientes.ver',
  'pacientes.ver_clinico',
  'pacientes.registrar',
  'pacientes.editar_contacto',
  'pacientes.editar_clinico',
  'pacientes.archivar',
  'consultas.ver',
  'consultas.crear',
  'consultas.editar',
  'consultas.anular',
  'documentos.generar',
  'citas.ver',
  'catalogo.gestionar',
  'backups.crear'
]

/**
 * La secretaria ve nombres, telefonos y motivos de cita. Nunca diagnosticos,
 * recetas, alergias ni consultas: esa frontera es el nucleo de la privacidad
 * del expediente.
 */
const PERMISOS_SECRETARIA: Permiso[] = [
  'pacientes.ver',
  'pacientes.registrar',
  'pacientes.editar_contacto',
  'citas.ver',
  'citas.gestionar'
]

/** Se suman al rol base; hoy solo el Doctor 1 los tiene. */
const PERMISOS_ADMINISTRADOR: Permiso[] = [
  'pacientes.eliminar',
  'usuarios.gestionar',
  'backups.restaurar',
  'configuracion.clinica'
]

export function permisosDe(rol: Rol, esAdministrador: boolean): Permiso[] {
  const base = rol === 'doctor' ? PERMISOS_DOCTOR : PERMISOS_SECRETARIA
  return esAdministrador ? [...base, ...PERMISOS_ADMINISTRADOR] : [...base]
}

export interface Usuario {
  id: number
  nombre: string
  rol: Rol
  esAdministrador: boolean
  activo: boolean
  debeCambiarPassword: boolean
  creadoEn: string
}

/** Lo mínimo que necesita la pantalla de acceso: nunca incluye hashes. */
export interface UsuarioParaAcceso {
  id: number
  nombre: string
  rol: Rol
  bloqueadoHasta: string | null
}

export interface UsuarioInput {
  nombre: string
  rol: Rol
  esAdministrador?: boolean
}
