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

export function listarCie10(soloPersonalizados = false): Cie10[] {
  return db()
    .prepare(
      `SELECT codigo, descripcion, categoria FROM cie10
        ${soloPersonalizados ? 'WHERE es_personalizado = 1' : ''}
        ORDER BY codigo`
    )
    .all() as Cie10[]
}

/**
 * Diagnostico propio de la clinica. Se marca como personalizado para que la
 * siembra de catalogos nunca lo pise y se pueda distinguir del CIE-10 oficial.
 */
export function crearCie10(datos: Cie10): string {
  const codigo = datos.codigo.trim().toUpperCase()
  if (codigo.length < 2) throw new Error('El código debe tener al menos 2 caracteres')
  if (datos.descripcion.trim().length < 3) {
    throw new Error('La descripción debe tener al menos 3 caracteres')
  }
  if (obtenerCie10(codigo)) throw new Error(`Ya existe un diagnóstico con el código ${codigo}`)

  db()
    .prepare(
      `INSERT INTO cie10 (codigo, descripcion, categoria, es_personalizado)
       VALUES (?, ?, ?, 1)`
    )
    .run(codigo, datos.descripcion.trim(), datos.categoria?.trim() || 'Personalizado')
  return codigo
}

export function actualizarCie10(codigo: string, datos: Omit<Cie10, 'codigo'>): void {
  const fila = db()
    .prepare('SELECT es_personalizado FROM cie10 WHERE codigo = ?')
    .get(codigo) as { es_personalizado: number } | undefined
  if (!fila) throw new Error('El diagnóstico no existe')
  if (fila.es_personalizado !== 1) {
    throw new Error('Los códigos del catálogo CIE-10 oficial no se pueden modificar')
  }

  db()
    .prepare('UPDATE cie10 SET descripcion = ?, categoria = ? WHERE codigo = ?')
    .run(datos.descripcion.trim(), datos.categoria?.trim() || 'Personalizado', codigo)
}

export function eliminarCie10(codigo: string): void {
  const enUso = db()
    .prepare('SELECT COUNT(*) AS total FROM consulta_diagnostico WHERE codigo_cie10 = ?')
    .get(codigo) as { total: number }
  if (enUso.total > 0) {
    throw new Error(
      `No se puede eliminar: hay ${enUso.total} ${enUso.total === 1 ? 'consulta que lo usa' : 'consultas que lo usan'}.`
    )
  }
  const fila = db()
    .prepare('SELECT es_personalizado FROM cie10 WHERE codigo = ?')
    .get(codigo) as { es_personalizado: number } | undefined
  if (fila?.es_personalizado !== 1) {
    throw new Error('Solo se pueden eliminar los diagnósticos creados en la clínica')
  }
  db().prepare('DELETE FROM cie10 WHERE codigo = ?').run(codigo)
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
