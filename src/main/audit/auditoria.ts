import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '../db/conexion'
import { directorioLogs } from '../db/rutas'
import { sesionActual } from '../security/sesion'

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
