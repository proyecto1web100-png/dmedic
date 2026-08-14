import { db, enTransaccion } from '../db/conexion'
import type {
  Cie10,
  Medicamento,
  MedicamentoInput,
  PlantillaItem,
  PlantillaTratamiento
} from '@shared/types'

// ===== CIE-10 =====

export function buscarCie10(texto: string, limite = 30): Cie10[] {
  const termino = texto.trim()
  if (termino.length === 0) {
    return db()
      .prepare('SELECT codigo, descripcion, categoria FROM cie10 ORDER BY codigo LIMIT ?')
      .all(limite) as Cie10[]
  }
  const patron = `%${termino}%`
  // El codigo exacto pesa mas que una coincidencia en el texto de la descripcion.
  return db()
    .prepare(
      `SELECT codigo, descripcion, categoria FROM cie10
        WHERE codigo LIKE ? OR descripcion LIKE ?
        ORDER BY CASE WHEN codigo LIKE ? THEN 0 ELSE 1 END, codigo
        LIMIT ?`
    )
    .all(patron, patron, `${termino}%`, limite) as Cie10[]
}

export function obtenerCie10(codigo: string): Cie10 | null {
  const fila = db()
    .prepare('SELECT codigo, descripcion, categoria FROM cie10 WHERE codigo = ?')
    .get(codigo) as Cie10 | undefined
  return fila ?? null
}

// ===== Medicamentos =====

interface FilaMedicamento {
  id: number
  nombre: string
  forma: string | null
  concentracion: string | null
  via: string | null
  activo: number
}

function aMedicamento(f: FilaMedicamento): Medicamento {
  return {
    id: f.id,
    nombre: f.nombre,
    forma: f.forma,
    concentracion: f.concentracion,
    via: f.via,
    activo: f.activo === 1
  }
}

export function buscarMedicamentos(texto: string, limite = 25): Medicamento[] {
  const termino = texto.trim()
  const filas =
    termino.length === 0
      ? (db()
          .prepare('SELECT * FROM medicamento WHERE activo = 1 ORDER BY nombre LIMIT ?')
          .all(limite) as FilaMedicamento[])
      : (db()
          .prepare(
            `SELECT * FROM medicamento
              WHERE activo = 1 AND nombre LIKE ?
              ORDER BY CASE WHEN nombre LIKE ? THEN 0 ELSE 1 END, nombre
              LIMIT ?`
          )
          .all(`%${termino}%`, `${termino}%`, limite) as FilaMedicamento[])
  return filas.map(aMedicamento)
}

export function listarMedicamentos(): Medicamento[] {
  const filas = db()
    .prepare('SELECT * FROM medicamento ORDER BY nombre, concentracion')
    .all() as FilaMedicamento[]
  return filas.map(aMedicamento)
}

export function crearMedicamento(input: MedicamentoInput): number {
  const resultado = db()
    .prepare(
      `INSERT INTO medicamento (nombre, forma, concentracion, via, activo)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(nombre, concentracion, forma) DO UPDATE SET activo = 1, via = excluded.via`
    )
    .run(input.nombre, input.forma ?? null, input.concentracion ?? null, input.via ?? null)

  if (resultado.lastInsertRowid) return Number(resultado.lastInsertRowid)

  const existente = db()
    .prepare(
      `SELECT id FROM medicamento
        WHERE nombre = ? AND IFNULL(concentracion,'') = IFNULL(?,'') AND IFNULL(forma,'') = IFNULL(?,'')`
    )
    .get(input.nombre, input.concentracion ?? null, input.forma ?? null) as
    | { id: number }
    | undefined
  if (!existente) throw new Error('No se pudo guardar el medicamento')
  return existente.id
}

export function actualizarMedicamento(id: number, input: MedicamentoInput): void {
  db()
    .prepare(
      'UPDATE medicamento SET nombre = ?, forma = ?, concentracion = ?, via = ? WHERE id = ?'
    )
    .run(input.nombre, input.forma ?? null, input.concentracion ?? null, input.via ?? null, id)
}

/**
 * Se desactiva en lugar de borrar: las recetas ya emitidas conservan la
 * referencia y el historial no puede quedar con huecos.
 */
export function desactivarMedicamento(id: number): void {
  db().prepare('UPDATE medicamento SET activo = 0 WHERE id = ?').run(id)
}

// ===== Plantillas de tratamiento (protocolos del doctor) =====

interface FilaPlantilla {
  id: number
  codigo_cie10: string
  nombre: string
  tratamiento: string | null
  recomendaciones: string | null
}

interface FilaPlantillaItem {
  id: number
  medicamento_id: number | null
  nombre: string
  concentracion: string | null
  forma: string | null
  dosis: string
  frecuencia: string
  duracion: string | null
  via: string | null
  indicaciones: string | null
}

function itemsDePlantilla(plantillaId: number): PlantillaItem[] {
  const filas = db()
    .prepare('SELECT * FROM plantilla_tratamiento_item WHERE plantilla_id = ? ORDER BY id')
    .all(plantillaId) as FilaPlantillaItem[]
  return filas.map((f) => ({
    id: f.id,
    medicamentoId: f.medicamento_id,
    nombre: f.nombre,
    concentracion: f.concentracion,
    forma: f.forma,
    dosis: f.dosis,
    frecuencia: f.frecuencia,
    duracion: f.duracion,
    via: f.via,
    indicaciones: f.indicaciones
  }))
}

function aPlantilla(f: FilaPlantilla): PlantillaTratamiento {
  return {
    id: f.id,
    codigoCie10: f.codigo_cie10,
    nombre: f.nombre,
    tratamiento: f.tratamiento,
    recomendaciones: f.recomendaciones,
    items: itemsDePlantilla(f.id)
  }
}

/** Protocolos que el propio doctor guardo para ese diagnostico. Nunca sugerencias del sistema. */
export function plantillasPorCie10(codigo: string): PlantillaTratamiento[] {
  const filas = db()
    .prepare('SELECT * FROM plantilla_tratamiento WHERE codigo_cie10 = ? ORDER BY nombre')
    .all(codigo) as FilaPlantilla[]
  return filas.map(aPlantilla)
}

export function listarPlantillas(): PlantillaTratamiento[] {
  const filas = db()
    .prepare('SELECT * FROM plantilla_tratamiento ORDER BY codigo_cie10, nombre')
    .all() as FilaPlantilla[]
  return filas.map(aPlantilla)
}

export function guardarPlantilla(
  datos: Omit<PlantillaTratamiento, 'id'> & { id?: number }
): number {
  return enTransaccion(() => {
    let id = datos.id
    if (id) {
      db()
        .prepare(
          `UPDATE plantilla_tratamiento
              SET codigo_cie10 = ?, nombre = ?, tratamiento = ?, recomendaciones = ?
            WHERE id = ?`
        )
        .run(datos.codigoCie10, datos.nombre, datos.tratamiento, datos.recomendaciones, id)
      db().prepare('DELETE FROM plantilla_tratamiento_item WHERE plantilla_id = ?').run(id)
    } else {
      const resultado = db()
        .prepare(
          `INSERT INTO plantilla_tratamiento (codigo_cie10, nombre, tratamiento, recomendaciones)
           VALUES (?, ?, ?, ?)`
        )
        .run(datos.codigoCie10, datos.nombre, datos.tratamiento, datos.recomendaciones)
      id = Number(resultado.lastInsertRowid)
    }

    const insertar = db().prepare(
      `INSERT INTO plantilla_tratamiento_item (
         plantilla_id, medicamento_id, nombre, concentracion, forma,
         dosis, frecuencia, duracion, via, indicaciones
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const item of datos.items) {
      insertar.run(
        id,
        item.medicamentoId ?? null,
        item.nombre,
        item.concentracion ?? null,
        item.forma ?? null,
        item.dosis,
        item.frecuencia,
        item.duracion ?? null,
        item.via ?? null,
        item.indicaciones ?? null
      )
    }
    return id
  })
}

export function eliminarPlantilla(id: number): void {
  db().prepare('DELETE FROM plantilla_tratamiento WHERE id = ?').run(id)
}
