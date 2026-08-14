import type { Sesion } from '@shared/types'

/**
 * La sesion vive solo en memoria del proceso principal. La interfaz nunca la
 * almacena ni puede falsificarla: cada operacion IPC pregunta aqui.
 */
let sesionActiva: Sesion | null = null

export function iniciarSesion(sesion: Sesion): void {
  sesionActiva = sesion
}

export function cerrarSesion(): void {
  sesionActiva = null
}

export function sesionActual(): Sesion | null {
  return sesionActiva
}

export function haySesion(): boolean {
  return sesionActiva !== null
}

export class ErrorNoAutenticado extends Error {
  readonly codigo = 'NO_AUTENTICADO'
  constructor() {
    super('Debe iniciar sesión para realizar esta acción')
  }
}

/** Todo handler que toque datos clinicos pasa por aqui primero. */
export function exigirSesion(): Sesion {
  if (!sesionActiva) throw new ErrorNoAutenticado()
  return sesionActiva
}
