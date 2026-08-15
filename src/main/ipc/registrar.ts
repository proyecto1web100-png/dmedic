import { ipcMain } from 'electron'
import { exigirPermiso, exigirSesion } from '../security/sesion'
import type { Permiso, Resultado } from '@shared/types'

interface OpcionesCanal {
  /** Los canales de autenticacion e instalacion son los unicos que no exigen sesion. */
  publico?: boolean
  /** Permiso obligatorio. Se comprueba aqui, no en la interfaz. */
  permiso?: Permiso
}

function mensajeDeError(error: unknown): { error: string; codigo?: string } {
  if (error instanceof Error) {
    const codigo = (error as Error & { codigo?: string }).codigo
    return { error: error.message, codigo }
  }
  return { error: 'Ocurrió un error inesperado' }
}

/**
 * Todo handler devuelve Resultado<T>: la interfaz recibe siempre un objeto
 * previsible en lugar de una excepcion cruda, y ningun detalle interno
 * (rutas, SQL, trazas) se filtra a la ventana.
 */
export function canal<A extends unknown[], T>(
  nombre: string,
  manejador: (...argumentos: A) => T | Promise<T>,
  opciones: OpcionesCanal = {}
): void {
  ipcMain.handle(nombre, async (_evento, ...argumentos): Promise<Resultado<T>> => {
    try {
      if (!opciones.publico) {
        if (opciones.permiso) exigirPermiso(opciones.permiso)
        else exigirSesion()
      }
      const datos = await manejador(...(argumentos as A))
      return { ok: true, datos }
    } catch (error) {
      if (!(error as Error & { codigo?: string }).codigo) {
        console.error(`[${nombre}]`, error)
      }
      return { ok: false, ...mensajeDeError(error) }
    }
  })
}
