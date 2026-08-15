import { permisosDe, type Permiso, type Sesion } from '@shared/types'

/**
 * La sesion vive solo en memoria del proceso principal. La interfaz nunca la
 * almacena ni puede falsificarla: cada operacion IPC pregunta aqui.
 */
let sesionActiva: Sesion | null = null
let permisosActivos: Set<Permiso> = new Set()

export function iniciarSesion(sesion: Sesion): void {
  sesionActiva = sesion
  permisosActivos = new Set(permisosDe(sesion.rol, sesion.esAdministrador))
}

export function cerrarSesion(): void {
  sesionActiva = null
  permisosActivos = new Set()
}

export function sesionActual(): Sesion | null {
  return sesionActiva
}

export function haySesion(): boolean {
  return sesionActiva !== null
}

export function permisosDeLaSesion(): Permiso[] {
  return [...permisosActivos]
}

export function puede(permiso: Permiso): boolean {
  return permisosActivos.has(permiso)
}

export class ErrorNoAutenticado extends Error {
  readonly codigo = 'NO_AUTENTICADO'
  constructor() {
    super('Debe iniciar sesión para realizar esta acción')
  }
}

export class ErrorSinPermiso extends Error {
  readonly codigo = 'SIN_PERMISO'
  constructor(readonly permiso: Permiso) {
    super('Su usuario no tiene permiso para realizar esta acción')
  }
}

/** Todo handler que toque datos clinicos pasa por aqui primero. */
export function exigirSesion(): Sesion {
  if (!sesionActiva) throw new ErrorNoAutenticado()
  return sesionActiva
}

/**
 * La comprobacion vive en el proceso principal, no en la ventana. Ocultar un
 * boton no es un control de acceso: cualquiera podria invocar el canal IPC.
 */
export function exigirPermiso(permiso: Permiso): Sesion {
  const sesion = exigirSesion()
  if (!permisosActivos.has(permiso)) throw new ErrorSinPermiso(permiso)
  return sesion
}
