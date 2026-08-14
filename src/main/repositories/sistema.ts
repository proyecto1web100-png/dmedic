import { db } from '../db/conexion'
import type { ConfiguracionClinica } from '@shared/types'

export interface FilaUsuario {
  id: number
  nombre: string
  password_hash: string
  recuperacion_hash: string | null
  recuperacion_usada: number
  intentos_fallidos: number
  bloqueado_hasta: string | null
  creado_en: string
}

export function usuarioPrincipal(): FilaUsuario | null {
  const fila = db().prepare('SELECT * FROM usuario ORDER BY id LIMIT 1').get() as
    | FilaUsuario
    | undefined
  return fila ?? null
}

export function crearUsuario(datos: {
  nombre: string
  passwordHash: string
  recuperacionHash: string
}): number {
  const resultado = db()
    .prepare(
      `INSERT INTO usuario (nombre, password_hash, recuperacion_hash, recuperacion_usada,
                            intentos_fallidos, creado_en)
       VALUES (?, ?, ?, 0, 0, ?)`
    )
    .run(datos.nombre, datos.passwordHash, datos.recuperacionHash, new Date().toISOString())
  return Number(resultado.lastInsertRowid)
}

export function actualizarPassword(id: number, passwordHash: string): void {
  db()
    .prepare(
      'UPDATE usuario SET password_hash = ?, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?'
    )
    .run(passwordHash, id)
}

/** El codigo usado se sustituye por uno nuevo: nunca se queda sin via de recuperacion. */
export function reemplazarCodigoRecuperacion(id: number, recuperacionHash: string): void {
  db()
    .prepare('UPDATE usuario SET recuperacion_hash = ?, recuperacion_usada = 0 WHERE id = ?')
    .run(recuperacionHash, id)
}

export function registrarIntentoFallido(id: number, bloqueadoHasta: string | null): number {
  db()
    .prepare(
      'UPDATE usuario SET intentos_fallidos = intentos_fallidos + 1, bloqueado_hasta = ? WHERE id = ?'
    )
    .run(bloqueadoHasta, id)
  const fila = db().prepare('SELECT intentos_fallidos FROM usuario WHERE id = ?').get(id) as {
    intentos_fallidos: number
  }
  return fila.intentos_fallidos
}

export function limpiarIntentos(id: number): void {
  db()
    .prepare('UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?')
    .run(id)
}

// ===== Configuracion =====

interface FilaConfiguracion {
  nombre_clinica: string
  direccion: string | null
  telefono: string | null
  logo_data_url: string | null
  nombre_doctor: string
  especialidad: string | null
  tema: 'claro' | 'oscuro'
  tamano_fuente: 'normal' | 'grande'
}

const CONFIGURACION_POR_DEFECTO: ConfiguracionClinica = {
  nombreClinica: 'DMedic',
  direccion: null,
  telefono: null,
  logoDataUrl: null,
  nombreDoctor: '',
  especialidad: 'Medicina General',
  tema: 'claro',
  tamanoFuente: 'normal'
}

export function configuracion(): ConfiguracionClinica {
  const fila = db().prepare('SELECT * FROM configuracion_clinica WHERE id = 1').get() as
    | FilaConfiguracion
    | undefined
  if (!fila) return { ...CONFIGURACION_POR_DEFECTO }
  return {
    nombreClinica: fila.nombre_clinica,
    direccion: fila.direccion,
    telefono: fila.telefono,
    logoDataUrl: fila.logo_data_url,
    nombreDoctor: fila.nombre_doctor,
    especialidad: fila.especialidad,
    tema: fila.tema,
    tamanoFuente: fila.tamano_fuente
  }
}

export function guardarConfiguracion(config: ConfiguracionClinica): void {
  db()
    .prepare(
      `INSERT INTO configuracion_clinica (
         id, nombre_clinica, direccion, telefono, logo_data_url,
         nombre_doctor, especialidad, tema, tamano_fuente
       ) VALUES (1, @nombreClinica, @direccion, @telefono, @logoDataUrl,
                 @nombreDoctor, @especialidad, @tema, @tamanoFuente)
       ON CONFLICT(id) DO UPDATE SET
         nombre_clinica = excluded.nombre_clinica,
         direccion = excluded.direccion,
         telefono = excluded.telefono,
         logo_data_url = excluded.logo_data_url,
         nombre_doctor = excluded.nombre_doctor,
         especialidad = excluded.especialidad,
         tema = excluded.tema,
         tamano_fuente = excluded.tamano_fuente`
    )
    .run(config)
}
