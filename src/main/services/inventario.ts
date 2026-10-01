import { auditar } from '../audit/auditoria'
import { exigirPermiso, sesionActual } from '../security/sesion'
import * as repo from '../repositories/inventario'
import * as catalogo from '../repositories/catalogo'
import type { Medicamento, MovimientoInput, MovimientoInventario } from '@shared/types'

/**
 * Existencias de los medicamentos que la clinica entrega. La cantidad nunca se
 * edita a mano: solo cambia registrando un movimiento, de modo que siempre se
 * pueda explicar por que hay lo que hay.
 */

export function listar(): Medicamento[] {
  exigirPermiso('inventario.ver')
  return catalogo.inventario()
}

export function movimientos(medicamentoId: number): MovimientoInventario[] {
  exigirPermiso('inventario.ver')
  return repo.movimientosDeMedicamento(medicamentoId)
}

export function ultimosMovimientos(): MovimientoInventario[] {
  exigirPermiso('inventario.ver')
  return repo.ultimosMovimientos()
}

export function registrar(input: MovimientoInput): number {
  exigirPermiso('inventario.gestionar')
  if (input.cantidad <= 0 && input.tipo !== 'ajuste') {
    throw new Error('La cantidad debe ser mayor que cero')
  }

  const id = repo.registrar(input, sesionActual()?.usuarioId ?? null)
  const movimiento = repo
    .movimientosDeMedicamento(input.medicamentoId, 1)
    .find((m) => m.id === id)

  auditar({
    accion: 'inventario.movimiento',
    entidad: 'medicamento',
    entidadId: input.medicamentoId,
    detalle: movimiento
      ? `${movimiento.tipo} ${movimiento.cantidad} de ${movimiento.medicamentoNombre} · quedan ${movimiento.existenciaResultante}`
      : `${input.tipo} ${input.cantidad}`
  })
  return id
}

/**
 * Entrega de medicamento a un paciente. Es una salida con el paciente anotado,
 * que es lo que permite despues saber a quien se le dio que.
 */
export function entregar(datos: {
  medicamentoId: number
  cantidad: number
  pacienteId: number
  consultaId?: number | null
  motivo?: string | null
}): number {
  return registrar({
    medicamentoId: datos.medicamentoId,
    tipo: 'salida',
    cantidad: datos.cantidad,
    pacienteId: datos.pacienteId,
    consultaId: datos.consultaId ?? null,
    motivo: datos.motivo ?? 'Entrega al paciente'
  })
}
