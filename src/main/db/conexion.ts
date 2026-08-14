import BetterSqlite3, { type Database } from 'better-sqlite3'
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  aplicarMigraciones,
  hayMigracionesPendientes,
  versionDeLaBase
} from './migraciones'
import { directorioBackups, rutaBaseDatos } from './rutas'
import { sembrarCatalogos } from './catalogos/sembrar'

let instancia: Database | null = null

/**
 * Antes de tocar la estructura de una base con datos se guarda una copia
 * intacta. Si una actualizacion sale mal, existe un punto exacto de retorno.
 * La copia es sincrona a proposito: nada debe escribir mientras se hace.
 */
function respaldarAntesDeMigrar(db: Database): void {
  const version = versionDeLaBase(db)
  // Base recien creada: no hay nada que perder.
  if (version === 0 || !hayMigracionesPendientes(db)) return

  db.pragma('wal_checkpoint(TRUNCATE)')

  const f = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  const marca =
    `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}` +
    `-${p(f.getHours())}${p(f.getMinutes())}${p(f.getSeconds())}`

  const destino = join(directorioBackups(), `dmedic-pre-actualizacion-v${version}-${marca}.db`)
  copyFileSync(rutaBaseDatos(), destino)
  console.log(`Copia previa a la actualización de esquema: ${destino}`)
}

export function abrirBaseDatos(): Database {
  if (instancia) return instancia

  const db = new BetterSqlite3(rutaBaseDatos())

  // WAL: lecturas y escrituras no se bloquean entre si y el archivo sobrevive
  // a un corte de energia sin corromperse.
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')

  try {
    respaldarAntesDeMigrar(db)
    aplicarMigraciones(db)
    sembrarCatalogos(db)
  } catch (error) {
    // Si la base no se pudo preparar, no debe quedar una conexión a medio abrir.
    db.close()
    throw error
  }

  instancia = db
  return db
}

export function db(): Database {
  if (!instancia) throw new Error('La base de datos no ha sido inicializada')
  return instancia
}

export function cerrarBaseDatos(): void {
  if (!instancia) return
  // Vuelca el WAL al archivo principal para que un backup posterior sea completo.
  try {
    instancia.pragma('wal_checkpoint(TRUNCATE)')
  } finally {
    instancia.close()
    instancia = null
  }
}

/** Envuelve una operacion de varias tablas para que no pueda quedar a medias. */
export function enTransaccion<T>(operacion: () => T): T {
  return db().transaction(operacion)()
}
