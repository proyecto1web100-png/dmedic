import { db, enTransaccion } from '../db/conexion'
import { ahoraIso, hoyIso } from '@shared/lib/fecha'
import type {
  Adjunto,
  AdjuntoInput,
  CategoriaExamen,
  EstadoDocumento,
  Incapacidad,
  IncapacidadInput,
  MedicacionCronica,
  MedicacionCronicaInput,
  Referencia,
  ReferenciaInput
} from '@shared/types'

/**
 * Extensiones que la propia ventana sabe mostrar. El resto (PDF, Word) se abre
 * con el programa que Windows tenga asociado.
 */
const EXTENSIONES_IMAGEN = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'])

export function esExtensionDeImagen(extension: string | null): boolean {
  return extension ? EXTENSIONES_IMAGEN.has(extension.toLowerCase()) : false
}

/**
 * Correlativo anual por tipo de documento: INC-2026-0001, REF-2026-0001. Se
 * calcula dentro de la misma transaccion que inserta, de modo que dos
 * documentos creados a la vez no puedan recibir el mismo folio.
 */
function siguienteFolio(tabla: 'incapacidad' | 'referencia', prefijo: string): string {
  const ano = new Date().getFullYear()
  const inicio = `${prefijo}-${ano}-`
  const fila = db()
    .prepare(`SELECT folio FROM ${tabla} WHERE folio LIKE ? ORDER BY folio DESC LIMIT 1`)
    .get(`${inicio}%`) as { folio: string } | undefined

  const ultimo = fila ? Number.parseInt(fila.folio.slice(inicio.length), 10) : 0
  return `${inicio}${String(ultimo + 1).padStart(4, '0')}`
}

// ===== Adjuntos =====

interface FilaAdjunto {
  id: number
  paciente_id: number
  consulta_id: number | null
  categoria: CategoriaExamen
  titulo: string
  descripcion: string | null
  fecha_estudio: string | null
  archivo_path: string
  nombre_original: string
  extension: string | null
  tamano_bytes: number
  creado_en: string
  usuario_nombre: string | null
}

function aAdjunto(f: FilaAdjunto): Adjunto {
  return {
    id: f.id,
    pacienteId: f.paciente_id,
    consultaId: f.consulta_id,
    categoria: f.categoria,
    titulo: f.titulo,
    descripcion: f.descripcion,
    fechaEstudio: f.fecha_estudio,
    ruta: f.archivo_path,
    nombreOriginal: f.nombre_original,
    extension: f.extension,
    tamanoBytes: f.tamano_bytes,
    esImagen: esExtensionDeImagen(f.extension),
    creadoEn: f.creado_en,
    usuarioNombre: f.usuario_nombre
  }
}

const SELECT_ADJUNTO = `
  SELECT a.*, u.nombre AS usuario_nombre
    FROM adjunto a
    LEFT JOIN usuario u ON u.id = a.usuario_id`

export function crearAdjunto(
  input: AdjuntoInput,
  archivo: { ruta: string; nombreOriginal: string; extension: string | null; tamanoBytes: number },
  usuarioId: number | null
): number {
  const resultado = db()
    .prepare(
      `INSERT INTO adjunto (
         paciente_id, consulta_id, categoria, titulo, descripcion, fecha_estudio,
         archivo_path, nombre_original, extension, tamano_bytes, usuario_id, creado_en
       ) VALUES (
         @pacienteId, @consultaId, @categoria, @titulo, @descripcion, @fechaEstudio,
         @ruta, @nombreOriginal, @extension, @tamanoBytes, @usuarioId, @creadoEn
       )`
    )
    .run({
      pacienteId: input.pacienteId,
      consultaId: input.consultaId ?? null,
      categoria: input.categoria,
      titulo: input.titulo,
      descripcion: input.descripcion ?? null,
      fechaEstudio: input.fechaEstudio ?? null,
      ruta: archivo.ruta,
      nombreOriginal: archivo.nombreOriginal,
      extension: archivo.extension,
      tamanoBytes: archivo.tamanoBytes,
      usuarioId,
      creadoEn: ahoraIso()
    })
  return Number(resultado.lastInsertRowid)
}

export function adjuntosDePaciente(pacienteId: number): Adjunto[] {
  const filas = db()
    .prepare(
      `${SELECT_ADJUNTO}
       WHERE a.paciente_id = ?
       ORDER BY COALESCE(a.fecha_estudio, a.creado_en) DESC, a.id DESC`
    )
    .all(pacienteId) as FilaAdjunto[]
  return filas.map(aAdjunto)
}

export function adjuntosDeConsulta(consultaId: number): Adjunto[] {
  const filas = db()
    .prepare(`${SELECT_ADJUNTO} WHERE a.consulta_id = ? ORDER BY a.creado_en DESC`)
    .all(consultaId) as FilaAdjunto[]
  return filas.map(aAdjunto)
}

export function obtenerAdjunto(id: number): Adjunto | null {
  const fila = db().prepare(`${SELECT_ADJUNTO} WHERE a.id = ?`).get(id) as FilaAdjunto | undefined
  return fila ? aAdjunto(fila) : null
}

/** Solo se corrige lo que el doctor escribio: el archivo en si nunca se sustituye. */
export function actualizarAdjunto(
  id: number,
  datos: {
    titulo: string
    descripcion: string | null
    categoria: CategoriaExamen
    fechaEstudio: string | null
  }
): void {
  db()
    .prepare(
      `UPDATE adjunto SET titulo = @titulo, descripcion = @descripcion,
              categoria = @categoria, fecha_estudio = @fechaEstudio
        WHERE id = @id`
    )
    .run({ id, ...datos })
}

export function eliminarAdjunto(id: number): void {
  db().prepare('DELETE FROM adjunto WHERE id = ?').run(id)
}

// ===== Incapacidades =====

interface FilaIncapacidad {
  id: number
  paciente_id: number
  consulta_id: number | null
  folio: string
  fecha_emision: string
  desde: string
  hasta: string
  dias: number
  motivo: string
  codigo_cie10: string | null
  diagnostico: string | null
  observaciones: string | null
  estado: EstadoDocumento
  motivo_anulacion: string | null
  archivo_path: string | null
  creada_en: string
  nombre_doctor: string | null
  numero_colegiacion: string | null
}

function aIncapacidad(f: FilaIncapacidad): Incapacidad {
  return {
    id: f.id,
    pacienteId: f.paciente_id,
    consultaId: f.consulta_id,
    folio: f.folio,
    fechaEmision: f.fecha_emision,
    desde: f.desde,
    hasta: f.hasta,
    dias: f.dias,
    motivo: f.motivo,
    codigoCie10: f.codigo_cie10,
    diagnostico: f.diagnostico,
    observaciones: f.observaciones,
    estado: f.estado,
    motivoAnulacion: f.motivo_anulacion,
    archivoPath: f.archivo_path,
    creadaEn: f.creada_en,
    nombreDoctor: f.nombre_doctor,
    numeroColegiacion: f.numero_colegiacion
  }
}

const SELECT_INCAPACIDAD = `
  SELECT i.*, u.nombre AS nombre_doctor, u.numero_colegiacion
    FROM incapacidad i
    LEFT JOIN usuario u ON u.id = i.usuario_id`

/** El ultimo dia se calcula aqui y no en la ventana: es lo que da valor legal. */
export function ultimoDia(desde: string, dias: number): string {
  const fecha = new Date(`${desde}T12:00:00`)
  fecha.setDate(fecha.getDate() + dias - 1)
  return hoyIso(fecha)
}

export function crearIncapacidad(input: IncapacidadInput, usuarioId: number | null): number {
  return enTransaccion(() => {
    const folio = siguienteFolio('incapacidad', 'INC')
    const resultado = db()
      .prepare(
        `INSERT INTO incapacidad (
           paciente_id, consulta_id, folio, fecha_emision, desde, hasta, dias,
           motivo, codigo_cie10, diagnostico, observaciones, usuario_id, creada_en
         ) VALUES (
           @pacienteId, @consultaId, @folio, @fechaEmision, @desde, @hasta, @dias,
           @motivo, @codigoCie10, @diagnostico, @observaciones, @usuarioId, @creadaEn
         )`
      )
      .run({
        pacienteId: input.pacienteId,
        consultaId: input.consultaId ?? null,
        folio,
        fechaEmision: hoyIso(),
        desde: input.desde,
        hasta: ultimoDia(input.desde, input.dias),
        dias: input.dias,
        motivo: input.motivo,
        codigoCie10: input.codigoCie10 ?? null,
        diagnostico: input.diagnostico ?? null,
        observaciones: input.observaciones ?? null,
        usuarioId,
        creadaEn: ahoraIso()
      })
    return Number(resultado.lastInsertRowid)
  })
}

export function incapacidadesDePaciente(pacienteId: number): Incapacidad[] {
  const filas = db()
    .prepare(`${SELECT_INCAPACIDAD} WHERE i.paciente_id = ? ORDER BY i.desde DESC, i.id DESC`)
    .all(pacienteId) as FilaIncapacidad[]
  return filas.map(aIncapacidad)
}

export function obtenerIncapacidad(id: number): Incapacidad | null {
  const fila = db().prepare(`${SELECT_INCAPACIDAD} WHERE i.id = ?`).get(id) as
    | FilaIncapacidad
    | undefined
  return fila ? aIncapacidad(fila) : null
}

export function anularIncapacidad(id: number, motivo: string): void {
  db()
    .prepare(
      `UPDATE incapacidad SET estado = 'anulada', motivo_anulacion = ?
        WHERE id = ? AND estado = 'vigente'`
    )
    .run(motivo, id)
}

export function guardarArchivoIncapacidad(id: number, ruta: string): void {
  db().prepare('UPDATE incapacidad SET archivo_path = ? WHERE id = ?').run(ruta, id)
}

// ===== Referencias =====

interface FilaReferencia {
  id: number
  paciente_id: number
  consulta_id: number | null
  folio: string
  fecha: string
  dirigida_a: string
  especialidad: string | null
  institucion: string | null
  motivo: string
  resumen_clinico: string | null
  hallazgos: string | null
  codigo_cie10: string | null
  diagnostico: string | null
  urgente: number
  estado: EstadoDocumento
  motivo_anulacion: string | null
  archivo_path: string | null
  creada_en: string
  nombre_doctor: string | null
  numero_colegiacion: string | null
}

function aReferencia(f: FilaReferencia): Referencia {
  return {
    id: f.id,
    pacienteId: f.paciente_id,
    consultaId: f.consulta_id,
    folio: f.folio,
    fecha: f.fecha,
    dirigidaA: f.dirigida_a,
    especialidad: f.especialidad,
    institucion: f.institucion,
    motivo: f.motivo,
    resumenClinico: f.resumen_clinico,
    hallazgos: f.hallazgos,
    codigoCie10: f.codigo_cie10,
    diagnostico: f.diagnostico,
    urgente: f.urgente === 1,
    estado: f.estado,
    motivoAnulacion: f.motivo_anulacion,
    archivoPath: f.archivo_path,
    creadaEn: f.creada_en,
    nombreDoctor: f.nombre_doctor,
    numeroColegiacion: f.numero_colegiacion
  }
}

const SELECT_REFERENCIA = `
  SELECT r.*, u.nombre AS nombre_doctor, u.numero_colegiacion
    FROM referencia r
    LEFT JOIN usuario u ON u.id = r.usuario_id`

export function crearReferencia(input: ReferenciaInput, usuarioId: number | null): number {
  return enTransaccion(() => {
    const folio = siguienteFolio('referencia', 'REF')
    const resultado = db()
      .prepare(
        `INSERT INTO referencia (
           paciente_id, consulta_id, folio, fecha, dirigida_a, especialidad, institucion,
           motivo, resumen_clinico, hallazgos, codigo_cie10, diagnostico, urgente,
           usuario_id, creada_en
         ) VALUES (
           @pacienteId, @consultaId, @folio, @fecha, @dirigidaA, @especialidad, @institucion,
           @motivo, @resumenClinico, @hallazgos, @codigoCie10, @diagnostico, @urgente,
           @usuarioId, @creadaEn
         )`
      )
      .run({
        pacienteId: input.pacienteId,
        consultaId: input.consultaId ?? null,
        folio,
        fecha: hoyIso(),
        dirigidaA: input.dirigidaA,
        especialidad: input.especialidad ?? null,
        institucion: input.institucion ?? null,
        motivo: input.motivo,
        resumenClinico: input.resumenClinico ?? null,
        hallazgos: input.hallazgos ?? null,
        codigoCie10: input.codigoCie10 ?? null,
        diagnostico: input.diagnostico ?? null,
        urgente: input.urgente ? 1 : 0,
        usuarioId,
        creadaEn: ahoraIso()
      })
    return Number(resultado.lastInsertRowid)
  })
}

export function referenciasDePaciente(pacienteId: number): Referencia[] {
  const filas = db()
    .prepare(`${SELECT_REFERENCIA} WHERE r.paciente_id = ? ORDER BY r.fecha DESC, r.id DESC`)
    .all(pacienteId) as FilaReferencia[]
  return filas.map(aReferencia)
}

export function obtenerReferencia(id: number): Referencia | null {
  const fila = db().prepare(`${SELECT_REFERENCIA} WHERE r.id = ?`).get(id) as
    | FilaReferencia
    | undefined
  return fila ? aReferencia(fila) : null
}

export function anularReferencia(id: number, motivo: string): void {
  db()
    .prepare(
      `UPDATE referencia SET estado = 'anulada', motivo_anulacion = ?
        WHERE id = ? AND estado = 'vigente'`
    )
    .run(motivo, id)
}

export function guardarArchivoReferencia(id: number, ruta: string): void {
  db().prepare('UPDATE referencia SET archivo_path = ? WHERE id = ?').run(ruta, id)
}

// ===== Medicacion permanente =====

interface FilaCronica {
  id: number
  paciente_id: number
  medicamento_id: number | null
  nombre: string
  concentracion: string | null
  forma: string | null
  dosis: string
  frecuencia: string
  via: string | null
  indicaciones: string | null
  motivo: string | null
  desde: string | null
  activa: number
  registrada_en: string
}

function aCronica(f: FilaCronica): MedicacionCronica {
  return {
    id: f.id,
    pacienteId: f.paciente_id,
    medicamentoId: f.medicamento_id,
    nombre: f.nombre,
    concentracion: f.concentracion,
    forma: f.forma,
    dosis: f.dosis,
    frecuencia: f.frecuencia,
    via: f.via,
    indicaciones: f.indicaciones,
    motivo: f.motivo,
    desde: f.desde,
    activa: f.activa === 1,
    registradaEn: f.registrada_en
  }
}

export function medicacionCronica(pacienteId: number, soloActivas = true): MedicacionCronica[] {
  const filas = db()
    .prepare(
      `SELECT * FROM medicacion_cronica
        WHERE paciente_id = ? ${soloActivas ? 'AND activa = 1' : ''}
        ORDER BY activa DESC, nombre`
    )
    .all(pacienteId) as FilaCronica[]
  return filas.map(aCronica)
}

export function crearMedicacionCronica(input: MedicacionCronicaInput): number {
  const resultado = db()
    .prepare(
      `INSERT INTO medicacion_cronica (
         paciente_id, medicamento_id, nombre, concentracion, forma, dosis, frecuencia,
         via, indicaciones, motivo, desde, activa, registrada_en
       ) VALUES (
         @pacienteId, @medicamentoId, @nombre, @concentracion, @forma, @dosis, @frecuencia,
         @via, @indicaciones, @motivo, @desde, 1, @registradaEn
       )`
    )
    .run({
      pacienteId: input.pacienteId,
      medicamentoId: input.medicamentoId ?? null,
      nombre: input.nombre,
      concentracion: input.concentracion ?? null,
      forma: input.forma ?? null,
      dosis: input.dosis,
      frecuencia: input.frecuencia,
      via: input.via ?? null,
      indicaciones: input.indicaciones ?? null,
      motivo: input.motivo ?? null,
      desde: input.desde ?? null,
      registradaEn: ahoraIso()
    })
  return Number(resultado.lastInsertRowid)
}

/**
 * Suspender no borra: el expediente debe poder mostrar que el paciente tomo ese
 * medicamento durante un tiempo y cuando se le retiro.
 */
export function suspenderMedicacionCronica(id: number, activa: boolean): void {
  db().prepare('UPDATE medicacion_cronica SET activa = ? WHERE id = ?').run(activa ? 1 : 0, id)
}

export function eliminarMedicacionCronica(id: number): void {
  db().prepare('DELETE FROM medicacion_cronica WHERE id = ?').run(id)
}
