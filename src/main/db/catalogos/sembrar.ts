import type { Database } from 'better-sqlite3'
import { CIE10_BASE } from './cie10'
import { MEDICAMENTOS_BASE } from './medicamentos'

/**
 * Carga los catalogos de referencia. Es idempotente: solo inserta lo que falta,
 * por lo que nunca pisa las ediciones que el doctor haya hecho.
 */
export function sembrarCatalogos(db: Database): void {
  const insertarCie10 = db.prepare(
    `INSERT INTO cie10 (codigo, descripcion, categoria)
     VALUES (@codigo, @descripcion, @categoria)
     ON CONFLICT(codigo) DO NOTHING`
  )

  const insertarMedicamento = db.prepare(
    `INSERT INTO medicamento (nombre, forma, concentracion, via, activo)
     VALUES (@nombre, @forma, @concentracion, @via, 1)
     ON CONFLICT(nombre, concentracion, forma) DO NOTHING`
  )

  db.transaction(() => {
    for (const fila of CIE10_BASE) insertarCie10.run(fila)
    // Los medicamentos solo se siembran la primera vez: si el doctor borra uno,
    // no debe reaparecer en el siguiente arranque.
    const yaSembrado = db
      .prepare('SELECT COUNT(*) AS total FROM medicamento')
      .get() as { total: number }
    if (yaSembrado.total === 0) {
      for (const fila of MEDICAMENTOS_BASE) insertarMedicamento.run(fila)
    }
  })()
}
