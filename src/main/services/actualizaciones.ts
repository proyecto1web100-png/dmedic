import { app, BrowserWindow, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { directorioDatos } from '../db/rutas'
import type { EstadoActualizacion, NovedadesVersion } from '@shared/types'

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

/**
 * Que version vio por ultima vez quien usa esta computadora, y las notas de la
 * version descargada. Vive en un archivo propio y no en la base de datos a
 * proposito: es estado de la instalacion, no informacion de la clinica, y debe
 * sobrevivir intacto a restaurar un backup anterior.
 */
interface EstadoVersion {
  ultimaVersionVista: string | null
  /** Notas de la ultima version descargada, para mostrarlas tras reiniciar. */
  notasDescargadas: NovedadesVersion | null
}

function rutaEstadoVersion(): string {
  return join(directorioDatos(), 'version-vista.json')
}

function leerEstadoVersion(): EstadoVersion {
  try {
    if (existsSync(rutaEstadoVersion())) {
      const crudo = JSON.parse(readFileSync(rutaEstadoVersion(), 'utf8')) as Partial<EstadoVersion>
      return {
        ultimaVersionVista: crudo.ultimaVersionVista ?? null,
        notasDescargadas: crudo.notasDescargadas ?? null
      }
    }
  } catch (error) {
    // Un archivo ilegible no puede impedir que la aplicacion arranque: se
    // trata como si no existiera y se reescribe al primer cambio.
    console.error('No se pudo leer el estado de versión:', error)
  }
  return { ultimaVersionVista: null, notasDescargadas: null }
}

function guardarEstadoVersion(estadoVersion: EstadoVersion): void {
  try {
    writeFileSync(rutaEstadoVersion(), JSON.stringify(estadoVersion, null, 2), 'utf8')
  } catch (error) {
    console.error('No se pudo guardar el estado de versión:', error)
  }
}

/**
 * Se resuelve UNA vez al arrancar, antes de que nada reescriba el archivo: si
 * la version que corre ahora no es la ultima que se vio, hay novedades que
 * mostrar. En una instalacion nueva no hay nada que anunciar.
 */
let novedadesPendientes: NovedadesVersion | null = null

export function prepararNovedades(): void {
  const actual = app.getVersion()
  const guardado = leerEstadoVersion()

  if (guardado.ultimaVersionVista === null) {
    guardarEstadoVersion({ ...guardado, ultimaVersionVista: actual })
    return
  }
  if (guardado.ultimaVersionVista === actual) return

  novedadesPendientes = {
    version: actual,
    // Las notas solo valen si son las de ESTA version: si se actualizo por
    // otra via, se anuncia el cambio sin inventar un contenido que no se tiene.
    notas:
      guardado.notasDescargadas?.version === actual
        ? guardado.notasDescargadas.notas
        : null
  }
}

export function obtenerNovedades(): NovedadesVersion | null {
  return novedadesPendientes
}

/** El doctor ya leyó el aviso: no se vuelve a mostrar para esta versión. */
export function marcarNovedadesVistas(): void {
  novedadesPendientes = null
  const guardado = leerEstadoVersion()
  guardarEstadoVersion({ ...guardado, ultimaVersionVista: app.getVersion() })
}

function emitir(cambios: Partial<EstadoActualizacion>): void {
  estado = { ...estado, ...cambios }
  for (const ventana of BrowserWindow.getAllWindows()) {
    if (!ventana.isDestroyed()) {
      ventana.webContents.send('actualizaciones:estado', estado)
    }
  }
}

/** Las entidades que aparecen de verdad en unas notas de version. */
const ENTIDADES: Record<string, string> = {
  '&nbsp;': ' ',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'"
}

/**
 * GitHub entrega el cuerpo del release convertido a HTML, asi que las notas
 * llegan con <p>, <br> y entidades. Aqui se pasan a texto plano: la aplicacion
 * las muestra como texto, y volcar el HTML tal cual haria que el doctor leyera
 * las etiquetas. No se interpreta el HTML, se descarta.
 */
export function textoDeNotas(notas: unknown): string | null {
  const crudo =
    typeof notas === 'string'
      ? notas
      : Array.isArray(notas)
        ? notas
            .map((n) =>
              typeof n === 'object' && n !== null ? String((n as { note?: string }).note ?? '') : String(n)
            )
            .filter((t) => t.length > 0)
            .join('\n\n')
        : null

  if (crudo === null) return null

  let texto = crudo
    // Los saltos de linea del HTML se conservan como saltos de verdad.
    // Se traga el salto que el HTML ya trae tras la etiqueta, para no dejar
    // una linea en blanco entre cada renglon de las notas.
    .replace(/<\s*br\s*\/?\s*>[ \t]*\n?/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|tr|h[1-6]|blockquote)\s*>[ \t]*\n?/gi, '\n')
    // Una lista sigue leyendose como lista.
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')

  // Las entidades se resuelven despues de quitar las etiquetas, para que un
  // "&lt;p&gt;" escrito a proposito no se convierta en una etiqueta.
  texto = texto.replace(/&#(\d+);/g, (_, codigo: string) =>
    String.fromCodePoint(Number.parseInt(codigo, 10))
  )
  for (const [entidad, caracter] of Object.entries(ENTIDADES)) {
    texto = texto.split(entidad).join(caracter)
  }
  // El ampersand va al final: si no, "&amp;lt;" se decodificaria dos veces.
  texto = texto.split('&amp;').join('&')

  texto = texto
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return texto.length > 0 ? texto : null
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

  autoUpdater.on('update-downloaded', (info) => {
    // Las notas se guardan ahora porque tras reiniciar ya no hay a quien
    // preguntarle que traia esta version.
    const guardado = leerEstadoVersion()
    guardarEstadoVersion({
      ...guardado,
      notasDescargadas: {
        version: info.version,
        notas: textoDeNotas(info.releaseNotes) ?? estado.notas
      }
    })
    emitir({ fase: 'lista', porcentaje: 100 })
  })

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

/**
 * En Mac, macOS solo deja instalar una actualizacion automatica si la app esta
 * firmada por Apple. Sin firma se abre la pagina de descarga para instalarla a mano.
 */
const PAGINA_DE_DESCARGAS = 'https://github.com/proyecto1web100-png/dmedic/releases/latest'

export async function descargar(): Promise<void> {
  if (!app.isPackaged) throw new Error('Las actualizaciones solo funcionan en la versión instalada')
  if (estado.fase !== 'disponible') throw new Error('No hay ninguna actualización disponible')
  if (process.platform === 'darwin') {
    await shell.openExternal(PAGINA_DE_DESCARGAS)
    return
  }
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
