import type { Resultado } from '@shared/types'

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    readonly codigo?: string
  ) {
    super(mensaje)
    this.name = 'ErrorApi'
  }
}

/**
 * Desenvuelve la respuesta del proceso principal. Convierte el fallo en una
 * excepcion con mensaje legible, para que ninguna pantalla trate por descuido
 * un error como si fuera un dato valido.
 */
export async function pedir<T>(promesa: Promise<Resultado<T>>): Promise<T> {
  const resultado = await promesa
  if (!resultado.ok) throw new ErrorApi(resultado.error, resultado.codigo)
  return resultado.datos
}

export const api = window.dmedic

export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado'
}
