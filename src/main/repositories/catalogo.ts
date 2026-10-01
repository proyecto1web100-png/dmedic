import { db, enTransaccion } from '../db/conexion'
import { estaPorVencer, estaVencido } from './inventario'
import type {
  Cie10,
  Examen,
  ExamenInput,
  Medicamento,
  MedicamentoInput,
  PlantillaExamen,
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
  controla_inventario: number
  existencia: number
  minimo: number
  unidad: string | null
  vencimiento: string | null
}

function aMedicamento(f: FilaMedicamento): Medicamento {
  const controla = f.controla_inventario === 1
  return {
    id: f.id,
    nombre: f.nombre,
    forma: f.forma,
    concentracion: f.concentracion,
    via: f.via,
    activo: f.activo === 1,
    controlaInventario: controla,
    existencia: f.existencia,
    minimo: f.minimo,
    unidad: f.unidad,
    vencimiento: f.vencimiento,
    // Sin control de existencias no hay nada que avisar: un medicamento que la
    // clinica no entrega nunca esta "bajo" ni "vencido".
    bajoMinimo: controla && f.minimo > 0 && f.existencia <= f.minimo,
    vencido: controla && estaVencido(f.vencimiento),
    porVencer: controla && estaPorVencer(f.vencimiento)
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
  db()
    .prepare(
      `INSERT INTO medicamento (nombre, forma, concentracion, via, activo,
                                controla_inventario, minimo, unidad)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)
       ON CONFLICT(nombre, concentracion, forma) DO UPDATE SET
         activo = 1, via = excluded.via,
         controla_inventario = excluded.controla_inventario,
         minimo = excluded.minimo, unidad = excluded.unidad`
    )
    .run(
      input.nombre,
      input.forma ?? null,
      input.concentracion ?? null,
      input.via ?? null,
      input.controlaInventario ? 1 : 0,
      input.minimo ?? 0,
      input.unidad ?? null
    )

  // El id se resuelve siempre por la clave unica y nunca por lastInsertRowid:
  // cuando el ON CONFLICT actualiza en vez de insertar, SQLite deja ahi el
  // rowid de una insercion anterior de la misma conexion, que apunta a otro
  // medicamento por completo.
  const guardado = db()
    .prepare(
      `SELECT id FROM medicamento
        WHERE nombre = ? AND IFNULL(concentracion,'') = IFNULL(?,'') AND IFNULL(forma,'') = IFNULL(?,'')`
    )
    .get(input.nombre, input.concentracion ?? null, input.forma ?? null) as
    | { id: number }
    | undefined
  if (!guardado) throw new Error('No se pudo guardar el medicamento')
  return guardado.id
}

export function actualizarMedicamento(id: number, input: MedicamentoInput): void {
  // La existencia no se toca aqui: solo cambia por movimientos de inventario,
  // que dejan constancia de quien la movio y por que.
  db()
    .prepare(
      `UPDATE medicamento SET nombre = ?, forma = ?, concentracion = ?, via = ?,
              controla_inventario = ?, minimo = ?, unidad = ?
        WHERE id = ?`
    )
    .run(
      input.nombre,
      input.forma ?? null,
      input.concentracion ?? null,
      input.via ?? null,
      input.controlaInventario ? 1 : 0,
      input.minimo ?? 0,
      input.unidad ?? null,
      id
    )
}

/** Medicamentos con control de existencias, para la pantalla de inventario. */
export function inventario(): Medicamento[] {
  const filas = db()
    .prepare(
      `SELECT * FROM medicamento
        WHERE controla_inventario = 1 AND activo = 1
        ORDER BY nombre, concentracion`
    )
    .all() as FilaMedicamento[]
  return filas.map(aMedicamento)
}

/**
 * Se desactiva en lugar de borrar: las recetas ya emitidas conservan la
 * referencia y el historial no puede quedar con huecos.
 */
export function desactivarMedicamento(id: number): void {
  db().prepare('UPDATE medicamento SET activo = 0 WHERE id = ?').run(id)
}

// ===== Examenes y procedimientos =====

interface FilaExamen {
  id: number
  nombre: string
  categoria: Examen['categoria']
  preparacion: string | null
  activo: number
}

function aExamen(f: FilaExamen): Examen {
  return {
    id: f.id,
    nombre: f.nombre,
    categoria: f.categoria,
    preparacion: f.preparacion,
    activo: f.activo === 1
  }
}

export function buscarExamenes(texto: string, limite = 25): Examen[] {
  const termino = texto.trim()
  const filas =
    termino.length === 0
      ? (db()
          .prepare('SELECT * FROM examen WHERE activo = 1 ORDER BY categoria, nombre LIMIT ?')
          .all(limite) as FilaExamen[])
      : (db()
          .prepare(
            `SELECT * FROM examen
              WHERE activo = 1 AND nombre LIKE ?
              ORDER BY CASE WHEN nombre LIKE ? THEN 0 ELSE 1 END, nombre
              LIMIT ?`
          )
          .all(`%${termino}%`, `${termino}%`, limite) as FilaExamen[])
  return filas.map(aExamen)
}

export function listarExamenes(): Examen[] {
  const filas = db()
    .prepare('SELECT * FROM examen ORDER BY categoria, nombre')
    .all() as FilaExamen[]
  return filas.map(aExamen)
}

export function crearExamen(input: ExamenInput): number {
  const nombre = input.nombre.trim()
  if (nombre.length < 3) throw new Error('El nombre del examen debe tener al menos 3 caracteres')

  db()
    .prepare(
      `INSERT INTO examen (nombre, categoria, preparacion, activo)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(nombre, categoria) DO UPDATE SET activo = 1, preparacion = excluded.preparacion`
    )
    .run(nombre, input.categoria, input.preparacion?.trim() || null)

  // Igual que con los medicamentos: tras un ON CONFLICT que actualiza,
  // lastInsertRowid apunta a otra fila. El id se busca por la clave unica.
  const guardado = db()
    .prepare('SELECT id FROM examen WHERE nombre = ? AND categoria = ?')
    .get(nombre, input.categoria) as { id: number } | undefined
  if (!guardado) throw new Error('No se pudo guardar el examen')
  return guardado.id
}

export function actualizarExamen(id: number, input: ExamenInput): void {
  const nombre = input.nombre.trim()
  if (nombre.length < 3) throw new Error('El nombre del examen debe tener al menos 3 caracteres')
  db()
    .prepare('UPDATE examen SET nombre = ?, categoria = ?, preparacion = ? WHERE id = ?')
    .run(nombre, input.categoria, input.preparacion?.trim() || null, id)
}

/**
 * Se desactiva en lugar de borrar: las consultas ya registradas conservan la
 * referencia y el historial no puede quedar con huecos.
 */
export function desactivarExamen(id: number): void {
  db().prepare('UPDATE examen SET activo = 0 WHERE id = ?').run(id)
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

interface FilaPlantillaExamen {
  id: number
  examen_id: number | null
  nombre: string
  categoria: PlantillaExamen['categoria']
  indicaciones: string | null
  urgente: number
}

function examenesDePlantilla(plantillaId: number): PlantillaExamen[] {
  const filas = db()
    .prepare('SELECT * FROM plantilla_tratamiento_examen WHERE plantilla_id = ? ORDER BY orden')
    .all(plantillaId) as FilaPlantillaExamen[]
  return filas.map((f) => ({
    id: f.id,
    examenId: f.examen_id,
    nombre: f.nombre,
    categoria: f.categoria,
    indicaciones: f.indicaciones,
    urgente: f.urgente === 1
  }))
}

function aPlantilla(f: FilaPlantilla): PlantillaTratamiento {
  return {
    id: f.id,
    codigoCie10: f.codigo_cie10,
    nombre: f.nombre,
    tratamiento: f.tratamiento,
    recomendaciones: f.recomendaciones,
    items: itemsDePlantilla(f.id),
    examenes: examenesDePlantilla(f.id)
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
      db().prepare('DELETE FROM plantilla_tratamiento_examen WHERE plantilla_id = ?').run(id)
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

    const insertarExamen = db().prepare(
      `INSERT INTO plantilla_tratamiento_examen (
         plantilla_id, examen_id, nombre, categoria, indicaciones, urgente, orden
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    // Los protocolos guardados antes de esta funcion llegan sin examenes.
    const examenes = datos.examenes ?? []
    examenes.forEach((examen, indice) => {
      insertarExamen.run(
        id,
        examen.examenId ?? null,
        examen.nombre,
        examen.categoria,
        examen.indicaciones ?? null,
        examen.urgente ? 1 : 0,
        indice
      )
    })
    return id
  })
}

export function eliminarPlantilla(id: number): void {
  db().prepare('DELETE FROM plantilla_tratamiento WHERE id = ?').run(id)
}
