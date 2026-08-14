import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { EstadoActualizacion } from '@shared/types'

let estado: EstadoActualizacion = {
  fase: 'inactivo',
  versionActual: app.getVersion(),
  versionDisponible: null,
  porcentaje: 0,
  notas: null,
  error: null,
  disponibleEnEsteEntorno: false
}

let instalacionPendienteAlSalir = false

function emitir(cambios: Partial<EstadoActualizacion>): void {
  estado = { ...estado, ...cambios }
  for (const ventana of BrowserWindow.getAllWindows()) {
    if (!ventana.isDestroyed()) {
      ventana.webContents.send('actualizaciones:estado', estado)
    }
  }
}

function textoDeNotas(notas: unknown): string | null {
  if (typeof notas === 'string') return notas
  if (Array.isArray(notas)) {
    return notas
      .map((n) => (typeof n === 'object' && n !== null ? String((n as { note?: string }).note ?? '') : String(n)))
      .filter((t) => t.length > 0)
      .join('\n\n')
  }
  return null
}

export function configurar(): void {
  estado.disponibleEnEsteEntorno = app.isPackaged
  if (!app.isPackaged) return

  // Nunca se descarga ni se instala sin que el doctor lo decida: una
  // actualización a mitad de una consulta es inaceptable en software clínico.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => emitir({ fase: 'buscando', error: null }))

  autoUpdater.on('update-available', (info) =>
    emitir({
      fase: 'disponible',
      versionDisponible: info.version,
      notas: textoDeNotas(info.releaseNotes)
    })
  )

  autoUpdater.on('update-not-available', () =>
    emitir({ fase: 'sin_novedades', versionDisponible: null })
  )

  autoUpdater.on('download-progress', (progreso) =>
    emitir({ fase: 'descargando', porcentaje: Math.round(progreso.percent) })
  )

  autoUpdater.on('update-downloaded', () => emitir({ fase: 'lista', porcentaje: 100 }))

  autoUpdater.on('error', (error) =>
    emitir({
      fase: 'error',
      error: error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')
        ? 'No hay conexión a internet para buscar actualizaciones.'
        : error.message
    })
  )
}

export function obtenerEstado(): EstadoActualizacion {
  return estado
}

export async function buscar(): Promise<EstadoActualizacion> {
  if (!app.isPackaged) {
    emitir({
      fase: 'sin_novedades',
      error: null,
      versionDisponible: null
    })
    return estado
  }
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    emitir({ fase: 'error', error: (error as Error).message })
  }
  return estado
}

export async function descargar(): Promise<void> {
  if (!app.isPackaged) throw new Error('Las actualizaciones solo funcionan en la versión instalada')
  if (estado.fase !== 'disponible') throw new Error('No hay ninguna actualización disponible')
  emitir({ fase: 'descargando', porcentaje: 0 })
  await autoUpdater.downloadUpdate()
}

/**
 * No instala aquí: marca la intención y cierra. El cierre normal ya hace el
 * backup y suelta la base de datos; solo entonces se aplica la actualización.
 */
export function instalarAlSalir(): void {
  if (estado.fase !== 'lista') {
    throw new Error('La actualización todavía no ha terminado de descargarse')
  }
  instalacionPendienteAlSalir = true
  app.quit()
}

export function hayInstalacionPendiente(): boolean {
  return instalacionPendienteAlSalir
}

/** Se invoca al final del cierre, con la base ya cerrada y respaldada. */
export function aplicarActualizacion(): void {
  autoUpdater.quitAndInstall(false, true)
}

/**
 * Búsqueda silenciosa al arrancar: si hay algo nuevo la interfaz lo mostrará,
 * pero nunca descarga ni interrumpe.
 */
export function buscarAlArrancar(): void {
  if (!app.isPackaged) return
  setTimeout(() => {
    void buscar()
  }, 8000)
}
