import BetterSqlite3 from 'better-sqlite3'
import { copyFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { abrirBaseDatos, cerrarBaseDatos, db } from '../db/conexion'
import { directorioBackups, rutaBaseDatos } from '../db/rutas'
import { auditar } from '../audit/auditoria'

const MESES_DE_RETENCION = 3
const PREFIJO = 'dmedic-'

export interface ArchivoBackup {
  nombre: string
  ruta: string
  tamanoBytes: number
  creadoEn: string
}

function marcaDeTiempo(fecha = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return (
    `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}` +
    `-${p(fecha.getHours())}${p(fecha.getMinutes())}${p(fecha.getSeconds())}`
  )
}

/**
 * Un backup jamas sobrescribe a otro. La marca de tiempo tiene resolucion de
 * segundos, asi que dos copias seguidas colisionarian: en ese caso se agrega un
 * sufijo hasta encontrar un nombre libre.
 */
function rutaLibre(): string {
  const base = join(directorioBackups(), `${PREFIJO}${marcaDeTiempo()}`)
  if (!existsSync(`${base}.db`)) return `${base}.db`

  for (let sufijo = 2; sufijo < 1000; sufijo++) {
    const candidata = `${base}-${sufijo}.db`
    if (!existsSync(candidata)) return candidata
  }
  throw new Error('No se pudo asignar un nombre libre para el backup')
}

/**
 * Comprueba que el archivo recien escrito abre, pasa el chequeo de integridad y
 * conserva los datos. Un backup corrupto no detectado es peor que no tener backup.
 */
function verificar(ruta: string, pacientesEsperados: number): void {
  let copia: BetterSqlite3.Database | null = null
  try {
    copia = new BetterSqlite3(ruta, { readonly: true })
    const integridad = copia.pragma('integrity_check', { simple: true })
    if (integridad !== 'ok') {
      throw new Error(`la verificación de integridad devolvió "${String(integridad)}"`)
    }
    const fila = copia.prepare('SELECT COUNT(*) AS total FROM paciente').get() as {
      total: number
    }
    if (fila.total !== pacientesEsperados) {
      throw new Error(
        `el backup contiene ${fila.total} pacientes y la base activa tiene ${pacientesEsperados}`
      )
    }
  } finally {
    copia?.close()
    // Abrir el backup deja archivos auxiliares junto a el. Se borran para que la
    // carpeta contenga un unico archivo por copia y baste con llevarse ese a la USB.
    for (const sufijo of ['-wal', '-shm']) {
      try {
        if (existsSync(`${ruta}${sufijo}`)) unlinkSync(`${ruta}${sufijo}`)
      } catch {
        // Un auxiliar que no se pudo borrar no invalida el backup.
      }
    }
  }
}

function purgarAntiguos(): number {
  const limite = new Date()
  limite.setMonth(limite.getMonth() - MESES_DE_RETENCION)

  let eliminados = 0
  for (const archivo of listar()) {
    if (new Date(archivo.creadoEn) < limite) {
      try {
        unlinkSync(archivo.ruta)
        eliminados++
      } catch (error) {
        console.error(`No se pudo eliminar el backup ${archivo.nombre}:`, error)
      }
    }
  }
  return eliminados
}

export function listar(): ArchivoBackup[] {
  const carpeta = directorioBackups()
  return readdirSync(carpeta)
    .filter((nombre) => nombre.startsWith(PREFIJO) && nombre.endsWith('.db'))
    .map((nombre) => {
      const ruta = join(carpeta, nombre)
      const info = statSync(ruta)
      return {
        nombre,
        ruta,
        tamanoBytes: info.size,
        creadoEn: info.mtime.toISOString()
      }
    })
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
}

export interface ResultadoBackup {
  ruta: string
  tamanoBytes: number
  eliminadosPorRetencion: number
}

/**
 * Copia consistente mediante la API de respaldo en linea de SQLite: nunca copia
 * una base a medio escribir, aunque la aplicacion este en uso.
 */
export async function crear(motivo: 'manual' | 'diario' | 'cierre'): Promise<ResultadoBackup> {
  const destino = rutaLibre()

  const pacientes = (
    db().prepare('SELECT COUNT(*) AS total FROM paciente').get() as { total: number }
  ).total

  await db().backup(destino)
  verificar(destino, pacientes)

  const eliminados = purgarAntiguos()
  const tamano = statSync(destino).size

  auditar({
    accion: 'backup.creado',
    entidad: 'backup',
    detalle: `${motivo} · ${destino} · ${tamano} bytes`
  })

  return { ruta: destino, tamanoBytes: tamano, eliminadosPorRetencion: eliminados }
}

export function copiarA(rutaBackup: string, carpetaDestino: string): string {
  if (!existsSync(rutaBackup)) throw new Error('El backup ya no existe')
  const nombre = rutaBackup.split(/[/\\]/).pop() as string
  const destino = join(carpetaDestino, nombre)
  if (existsSync(destino)) {
    throw new Error('Ya existe un archivo con ese nombre en la carpeta de destino')
  }
  copyFileSync(rutaBackup, destino)
  return destino
}

export interface ResultadoRestauracion {
  copiaDeSeguridadPrevia: string
}

/**
 * Restaurar sustituye TODA la informacion actual. Antes de tocar nada se crea
 * un backup del estado presente, de modo que la operacion siempre es reversible.
 * La aplicacion debe reiniciarse despues: quien llama es responsable de hacerlo.
 */
export async function restaurar(rutaBackup: string): Promise<ResultadoRestauracion> {
  if (!existsSync(rutaBackup)) throw new Error('El archivo de backup no existe')

  // Se valida ANTES de destruir nada: si el backup esta corrupto, no se toca la base activa.
  let candidato: BetterSqlite3.Database | null = null
  try {
    candidato = new BetterSqlite3(rutaBackup, { readonly: true })
    const integridad = candidato.pragma('integrity_check', { simple: true })
    if (integridad !== 'ok') {
      throw new Error('El archivo de backup está dañado y no puede restaurarse')
    }
    candidato.prepare('SELECT COUNT(*) FROM paciente').get()
  } catch (error) {
    throw new Error(
      `El archivo seleccionado no es un backup válido de DMedic: ${(error as Error).message}`
    )
  } finally {
    candidato?.close()
  }

  const previo = await crear('manual')

  cerrarBaseDatos()

  const destino = rutaBaseDatos()
  for (const sufijo of ['-wal', '-shm']) {
    const auxiliar = `${destino}${sufijo}`
    if (existsSync(auxiliar)) unlinkSync(auxiliar)
  }
  copyFileSync(rutaBackup, destino)

  abrirBaseDatos()
  auditar({
    accion: 'backup.restaurado',
    entidad: 'backup',
    detalle: `${rutaBackup} · copia previa ${previo.ruta}`
  })

  return { copiaDeSeguridadPrevia: previo.ruta }
}

/** Un backup diario basta: solo se crea si hoy todavia no hay ninguno. */
export async function crearDiarioSiHaceFalta(): Promise<ResultadoBackup | null> {
  const hoy = new Date().toISOString().slice(0, 10)
  const existeDeHoy = listar().some((b) => b.creadoEn.slice(0, 10) === hoy)
  if (existeDeHoy) return null
  return crear('diario')
}

/** Dias transcurridos desde la ultima copia a un medio externo, para el recordatorio. */
export function ultimoBackup(): ArchivoBackup | null {
  return listar()[0] ?? null
}
