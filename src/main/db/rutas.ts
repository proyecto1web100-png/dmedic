import { app } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Los datos viven fuera de la carpeta del programa para que una reinstalacion
 * o una actualizacion nunca los toque: %APPDATA%/DMedic/
 */
export function directorioDatos(): string {
  return app.getPath('userData')
}

export function rutaBaseDatos(): string {
  return join(asegurarDirectorio(join(directorioDatos(), 'data')), 'dmedic.db')
}

export function directorioExpedientes(): string {
  return asegurarDirectorio(join(directorioDatos(), 'expedientes'))
}

export function directorioBackups(): string {
  return asegurarDirectorio(join(directorioDatos(), 'backups'))
}

export function directorioLogs(): string {
  return asegurarDirectorio(join(directorioDatos(), 'logs'))
}

export function asegurarDirectorio(ruta: string): string {
  if (!existsSync(ruta)) mkdirSync(ruta, { recursive: true })
  return ruta
}

const CARACTERES_INVALIDOS = new Set([
  '<',
  '>',
  ':',
  '"',
  '|',
  '?',
  '*',
  '/',
  String.fromCharCode(92)
])

/** Quita los caracteres que Windows no admite en nombres de carpeta. */
export function nombreCarpetaSeguro(texto: string): string {
  const limpio = Array.from(texto)
    .filter((c) => !CARACTERES_INVALIDOS.has(c) && c.charCodeAt(0) >= 32)
    .join('')
  return limpio.replace(/\s+/g, ' ').replace(/\.+$/, '').trim().slice(0, 80)
}

/** Carpeta propia de cada paciente: "EXP-2026-0001 - Perez Lopez, Juan". */
export function directorioPaciente(numeroExpediente: string, nombreListado: string): string {
  const carpeta = nombreCarpetaSeguro(`${numeroExpediente} - ${nombreListado}`)
  return asegurarDirectorio(join(directorioExpedientes(), carpeta))
}

export function subcarpetaPaciente(
  numeroExpediente: string,
  nombreListado: string,
  sub: 'Recetas' | 'Consultas' | 'Examenes' | 'Documentos'
): string {
  return asegurarDirectorio(join(directorioPaciente(numeroExpediente, nombreListado), sub))
}
