import { db, enTransaccion } from '../db/conexion'
import { ahoraIso, hoyIso } from '@shared/lib/fecha'
import type { MovimientoInput, MovimientoInventario, TipoMovimiento } from '@shared/types'

/** Dias de aviso antes de que un lote venza. */
const DIAS_POR_VENCER = 60

export function estaVencido(vencimiento: string | null): boolean {
  return vencimiento !== null && vencimiento < hoyIso()
}

export function estaPorVencer(vencimiento: string | null): boolean {
  if (!vencimiento || estaVencido(vencimiento)) return false
  const limite = new Date()
  limite.setDate(limite.getDate() + DIAS_POR_VENCER)
  return vencimiento <= hoyIso(limite)
}

interface FilaMovimiento {
  id: number
  medicamento_id: number
  medicamento_nombre: string
  tipo: TipoMovimiento
  cantidad: number
  existencia_resultante: number
  lote: string | null
  vencimiento: string | null
  motivo: string | null
  paciente_id: number | null
  paciente_nombre: string | null
  usuario_nombre: string | null
  fecha: string
}

function aMovimiento(f: FilaMovimiento): MovimientoInventario {
  return {
    id: f.id,
    medicamentoId: f.medicamento_id,
    medicamentoNombre: f.medicamento_nombre,
    tipo: f.tipo,
    cantidad: f.cantidad,
    existenciaResultante: f.existencia_resultante,
    lote: f.lote,
    vencimiento: f.vencimiento,
    motivo: f.motivo,
    pacienteId: f.paciente_id,
    pacienteNombre: f.paciente_nombre,
    usuarioNombre: f.usuario_nombre,
    fecha: f.fecha
  }
}

const SELECT_MOVIMIENTO = `
  SELECT m.*,
         med.nombre AS medicamento_nombre,
         u.nombre AS usuario_nombre,
         CASE WHEN p.id IS NULL THEN NULL
              ELSE p.primer_nombre || ' ' || p.primer_apellido END AS paciente_nombre
    FROM movimiento_inventario m
    JOIN medicamento med ON med.id = m.medicamento_id
    LEFT JOIN usuario u ON u.id = m.usuario_id
    LEFT JOIN paciente p ON p.id = m.paciente_id`

/**
 * Registra el movimiento y deja la existencia al dia en la misma transaccion:
 * la cantidad guardada en el medicamento y la suma de sus movimientos no pueden
 * discrepar ni aunque el programa se cierre a la mitad.
 */
export function registrar(input: MovimientoInput, usuarioId: number | null): number {
  return enTransaccion(() => {
    const medicamento = db()
      .prepare('SELECT id, nombre, existencia, controla_inventario FROM medicamento WHERE id = ?')
      .get(input.medicamentoId) as
      | { id: number; nombre: string; existencia: number; controla_inventario: number }
      | undefined
    if (!medicamento) throw new Error('El medicamento no existe')
    if (medicamento.controla_inventario !== 1) {
      throw new Error(`${medicamento.nombre} no lleva control de existencias`)
    }
    if (input.cantidad < 0) throw new Error('La cantidad no puede ser negativa')

    let resultante: number
    if (input.tipo === 'entrada') resultante = medicamento.existencia + input.cantidad
    else if (input.tipo === 'salida') resultante = medicamento.existencia - input.cantidad
    // Un ajuste no suma ni resta: fija la existencia que se conto fisicamente.
    else resultante = input.cantidad

    if (resultante < 0) {
      throw new Error(
        `No hay suficiente ${medicamento.nombre}: quedan ${medicamento.existencia} y se intentan sacar ${input.cantidad}`
      )
    }

    const registro = db()
      .prepare(
        `INSERT INTO movimiento_inventario (
           medicamento_id, tipo, cantidad, existencia_resultante, lote, vencimiento,
           motivo, paciente_id, consulta_id, usuario_id, fecha
         ) VALUES (
           @medicamentoId, @tipo, @cantidad, @resultante, @lote, @vencimiento,
           @motivo, @pacienteId, @consultaId, @usuarioId, @fecha
         )`
      )
      .run({
        medicamentoId: input.medicamentoId,
        tipo: input.tipo,
        cantidad: input.cantidad,
        resultante,
        lote: input.lote ?? null,
        vencimiento: input.vencimiento ?? null,
        motivo: input.motivo ?? null,
        pacienteId: input.pacienteId ?? null,
        consultaId: input.consultaId ?? null,
        usuarioId,
        fecha: ahoraIso()
      })

    db().prepare('UPDATE medicamento SET existencia = ? WHERE id = ?').run(resultante, medicamento.id)

    // Una entrada con vencimiento pasa a ser el vencimiento de referencia del
    // medicamento cuando es mas proximo que el que ya estaba anotado.
    if (input.tipo === 'entrada' && input.vencimiento) {
      db()
        .prepare(
          `UPDATE medicamento SET vencimiento = ?
            WHERE id = ? AND (vencimiento IS NULL OR vencimiento > ?)`
        )
        .run(input.vencimiento, medicamento.id, input.vencimiento)
    }

    return Number(registro.lastInsertRowid)
  })
}

export function movimientosDeMedicamento(medicamentoId: number, limite = 100): MovimientoInventario[] {
  const filas = db()
    .prepare(`${SELECT_MOVIMIENTO} WHERE m.medicamento_id = ? ORDER BY m.fecha DESC LIMIT ?`)
    .all(medicamentoId, limite) as FilaMovimiento[]
  return filas.map(aMovimiento)
}

export function ultimosMovimientos(limite = 100): MovimientoInventario[] {
  const filas = db()
    .prepare(`${SELECT_MOVIMIENTO} ORDER BY m.fecha DESC LIMIT ?`)
    .all(limite) as FilaMovimiento[]
  return filas.map(aMovimiento)
}
