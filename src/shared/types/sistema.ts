import type { Permiso, Rol, UsuarioParaAcceso } from './usuario'

export interface Sesion {
  usuarioId: number
  nombre: string
  rol: Rol
  esAdministrador: boolean
  debeCambiarPassword: boolean
}

export interface EstadoAuth {
  instalado: boolean
  autenticado: boolean
  sesion: Sesion | null
  permisos: Permiso[]
  /** Usuarios activos, para que la pantalla de acceso muestre a quién entrar. */
  usuarios: UsuarioParaAcceso[]
}

export interface ConfiguracionClinica {
  nombreClinica: string
  direccion: string | null
  telefono: string | null
  logoDataUrl: string | null
  nombreDoctor: string
  especialidad: string | null
  tema: 'claro' | 'oscuro'
  tamanoFuente: 'normal' | 'grande'
  /** Papel de la receta. Los demás documentos siempre son carta. */
  tamanoReceta: 'carta' | 'media_carta'
}

export interface ResumenDashboard {
  totalPacientes: number
  consultasHoy: number
  citasHoy: number
  pacientesNuevosMes: number
  ultimosAtendidos: {
    pacienteId: number
    nombreCompleto: string
    numeroExpediente: string
    fecha: string
    motivo: string
  }[]
}

export type FaseActualizacion =
  | 'inactivo'
  | 'buscando'
  | 'disponible'
  | 'sin_novedades'
  | 'descargando'
  | 'lista'
  | 'error'

export interface EstadoActualizacion {
  fase: FaseActualizacion
  versionActual: string
  versionDisponible: string | null
  porcentaje: number
  notas: string | null
  error: string | null
  /** En desarrollo no hay artefactos publicados contra los que comparar. */
  disponibleEnEsteEntorno: boolean
}

/**
 * Lo que se le muestra al doctor la primera vez que abre una version nueva:
 * que numero de version esta usando y que cambio, con las notas que el
 * administrador escribio al publicarla.
 */
export interface NovedadesVersion {
  version: string
  notas: string | null
}

export interface ArchivoBackupPublico {
  nombre: string
  ruta: string
  tamanoBytes: number
  creadoEn: string
}

export interface DocumentoPublico {
  id: number
  tipo: string
  ruta: string
  creadoEn: string
}

/** Una linea del registro de auditoria, tal como se muestra en pantalla. */
export interface EntradaAuditoriaPublica {
  id: number
  fecha: string
  accion: string
  entidad: string | null
  entidadId: number | null
  detalle: string | null
  usuarioNombre: string | null
}

export interface FiltroAuditoria {
  /** Busca en accion, detalle y nombre del usuario. */
  texto?: string | null
  desde?: string | null
  hasta?: string | null
  limite?: number
}

/** Envoltura uniforme de toda respuesta IPC: la interfaz nunca recibe una excepcion cruda. */
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; codigo?: string }

/**
 * Periodo de prueba y activacion. La aplicacion arranca con 24 horas de prueba
 * en cada equipo nuevo; el codigo que la desbloquea se calcula a partir del
 * identificador del equipo, asi que solo sirve en esa computadora.
 */
export interface EstadoLicencia {
  activado: boolean
  bloqueado: boolean
  restanteMs: number
  /** Momento en que termina la prueba. Nulo cuando el equipo ya esta activado. */
  expiraEn: string | null
  /** Lo que el cliente le dicta o le envia al administrador para pedir su codigo. */
  idEquipo: string
  /** Dias que concedio la ultima prorroga, o 0 si la prueba sigue siendo la inicial. */
  diasProrroga: number
}
