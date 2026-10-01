import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '../db/conexion'
import { directorioLogs } from '../db/rutas'
import { sesionActual } from '../security/sesion'
import type { EntradaAuditoriaPublica, FiltroAuditoria } from '@shared/types'

export type AccionAuditada =
  | 'sesion.inicio'
  | 'sesion.inicio_fallido'
  | 'sesion.cierre'
  | 'sesion.password_cambiada'
  | 'paciente.creado'
  | 'paciente.editado'
  | 'paciente.archivado'
  | 'paciente.reactivado'
  | 'paciente.eliminado'
  | 'consulta.creada'
  | 'consulta.editada'
  | 'consulta.anulada'
  | 'consulta.adenda'
  | 'cita.creada'
  | 'cita.editada'
  | 'cita.eliminada'
  | 'paciente.consultado'
  | 'usuario.creado'
  | 'usuario.editado'
  | 'usuario.desactivado'
  | 'usuario.reactivado'
  | 'usuario.password_reiniciada'
  | 'documento.impreso'
  | 'adjunto.agregado'
  | 'adjunto.editado'
  | 'adjunto.eliminado'
  | 'incapacidad.creada'
  | 'incapacidad.anulada'
  | 'referencia.creada'
  | 'referencia.anulada'
  | 'medicacion_cronica.agregada'
  | 'medicacion_cronica.suspendida'
  | 'medicacion_cronica.reactivada'
  | 'medicacion_cronica.eliminada'
  | 'empresa.creada'
  | 'empresa.editada'
  | 'empresa.desactivada'
  | 'empresa.reactivada'
  | 'inventario.movimiento'
  | 'backup.creado'
  | 'backup.restaurado'

interface EntradaAuditoria {
  accion: AccionAuditada
  entidad?: string
  entidadId?: number
  detalle?: string
}

/**
 * Doble registro deliberado: la tabla permite consultar el historial con SQL,
 * el archivo de texto sobrevive aunque la base se restaure desde un backup
 * anterior. Auditar nunca debe hacer fallar la operacion que se esta auditando.
 */
export function auditar(entrada: EntradaAuditoria): void {
  const fecha = new Date().toISOString()
  // Con un equipo de varias personas, una acción sin autor no sirve para nada.
  const sesion = sesionActual()
  const autor = sesion ? `${sesion.nombre} (${sesion.rol})` : 'sin sesión'

  try {
    db()
      .prepare(
        `INSERT INTO auditoria (fecha, accion, entidad, entidad_id, detalle,
                                usuario_id, usuario_nombre)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        fecha,
        entrada.accion,
        entrada.entidad ?? null,
        entrada.entidadId ?? null,
        entrada.detalle ?? null,
        sesion?.usuarioId ?? null,
        sesion?.nombre ?? null
      )
  } catch (error) {
    console.error('No se pudo registrar la auditoría en la base:', error)
  }

  try {
    const linea =
      [
        fecha,
        autor,
        entrada.accion,
        entrada.entidad ?? '-',
        entrada.entidadId ?? '-',
        entrada.detalle ?? ''
      ].join(' | ') + '\n'
    appendFileSync(join(directorioLogs(), 'auditoria.log'), linea, 'utf8')
  } catch (error) {
    console.error('No se pudo escribir el archivo de auditoría:', error)
  }
}

/**
 * Lectura del registro. Solo la usa el administrador: el valor de una auditoria
 * esta en poder revisarla, no unicamente en escribirla.
 */
export function listar(filtro: FiltroAuditoria = {}): EntradaAuditoriaPublica[] {
  const condiciones: string[] = []
  const parametros: (string | number)[] = []

  const texto = filtro.texto?.trim()
  if (texto) {
    condiciones.push('(accion LIKE ? OR detalle LIKE ? OR usuario_nombre LIKE ?)')
    const patron = `%${texto}%`
    parametros.push(patron, patron, patron)
  }
  if (filtro.desde) {
    condiciones.push('fecha >= ?')
    parametros.push(filtro.desde)
  }
  if (filtro.hasta) {
    // La fecha llega como dia suelto; se incluye el dia entero.
    condiciones.push('fecha <= ?')
    parametros.push(`${filtro.hasta}T23:59:59.999Z`)
  }

  const donde = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : ''
  const limite = Math.min(Math.max(filtro.limite ?? 200, 1), 1000)

  const filas = db()
    .prepare(
      `SELECT id, fecha, accion, entidad, entidad_id, detalle, usuario_nombre
         FROM auditoria ${donde}
        ORDER BY fecha DESC, id DESC
        LIMIT ?`
    )
    .all(...parametros, limite) as {
    id: number
    fecha: string
    accion: string
    entidad: string | null
    entidad_id: number | null
    detalle: string | null
    usuario_nombre: string | null
  }[]

  return filas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    accion: f.accion,
    entidad: f.entidad,
    entidadId: f.entidad_id,
    detalle: f.detalle,
    usuarioNombre: f.usuario_nombre
  }))
}
