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

/** Envoltura uniforme de toda respuesta IPC: la interfaz nunca recibe una excepcion cruda. */
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; codigo?: string }
