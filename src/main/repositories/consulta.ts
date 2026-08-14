import { db, enTransaccion } from '../db/conexion'
import { ahoraIso, esMismoDia, hoyIso } from '@shared/lib/fecha'
import { calcularImc } from '@shared/lib/vitales'
import type {
  Adenda,
  Consulta,
  ConsultaCompleta,
  ConsultaInput,
  ConsultaResumen,
  DiagnosticoConsulta,
  FiltroHistorial,
  MedicamentoRecetado,
  SignosVitales
} from '@shared/types'

interface FilaConsulta {
  id: number
  paciente_id: number
  fecha: string
  motivo: string
  sintomas: string | null
  exploracion: string | null
  tratamiento: string | null
  observaciones: string | null
  recomendaciones: string | null
  proxima_cita_fecha: string | null
  sin_proxima_cita: number
  estado: 'activa' | 'anulada'
  motivo_anulacion: string | null
  creada_en: string
  actualizada_en: string
}

function aConsulta(f: FilaConsulta): Consulta {
  return {
    id: f.id,
    pacienteId: f.paciente_id,
    fecha: f.fecha,
    motivo: f.motivo,
    sintomas: f.sintomas,
    exploracion: f.exploracion,
    tratamiento: f.tratamiento,
    observaciones: f.observaciones,
    recomendaciones: f.recomendaciones,
    proximaCitaFecha: f.proxima_cita_fecha,
    sinProximaCita: f.sin_proxima_cita === 1,
    estado: f.estado,
    motivoAnulacion: f.motivo_anulacion,
    creadaEn: f.creada_en,
    actualizadaEn: f.actualizada_en
  }
}

/**
 * Regla de integridad clinica: una consulta solo se corrige el mismo dia en que
 * se creo. Despues queda cerrada y cualquier agregado es una adenda fechada.
 */
export function esEditable(consulta: Consulta): boolean {
  return consulta.estado === 'activa' && esMismoDia(consulta.creadaEn, ahoraIso())
}

function guardarSignos(consultaId: number, signos: SignosVitales): void {
  const imc = signos.imc ?? calcularImc(signos.peso, signos.altura)
  db()
    .prepare(
      `INSERT INTO signos_vitales (
         consulta_id, peso, altura, imc, presion_sistolica, presion_diastolica,
         temperatura, frecuencia_cardiaca, frecuencia_respiratoria,
         saturacion_oxigeno, glucosa
       ) VALUES (
         @consultaId, @peso, @altura, @imc, @presionSistolica, @presionDiastolica,
         @temperatura, @frecuenciaCardiaca, @frecuenciaRespiratoria,
         @saturacionOxigeno, @glucosa
       )
       ON CONFLICT(consulta_id) DO UPDATE SET
         peso = excluded.peso, altura = excluded.altura, imc = excluded.imc,
         presion_sistolica = excluded.presion_sistolica,
         presion_diastolica = excluded.presion_diastolica,
         temperatura = excluded.temperatura,
         frecuencia_cardiaca = excluded.frecuencia_cardiaca,
         frecuencia_respiratoria = excluded.frecuencia_respiratoria,
         saturacion_oxigeno = excluded.saturacion_oxigeno,
         glucosa = excluded.glucosa`
    )
    .run({ consultaId, ...signos, imc })
}

function guardarDiagnosticos(consultaId: number, diagnosticos: DiagnosticoConsulta[]): void {
  db().prepare('DELETE FROM consulta_diagnostico WHERE consulta_id = ?').run(consultaId)
  const insertar = db().prepare(
    `INSERT INTO consulta_diagnostico (consulta_id, codigo_cie10, descripcion, es_principal, nota)
     VALUES (?, ?, ?, ?, ?)`
  )
  for (const d of diagnosticos) {
    insertar.run(consultaId, d.codigoCie10, d.descripcion, d.esPrincipal ? 1 : 0, d.nota ?? null)
  }
}

/** Los medicamentos de la consulta son, literalmente, la receta de esa consulta. */
function guardarReceta(consultaId: number, medicamentos: MedicamentoRecetado[], fecha: string): void {
  const existente = db()
    .prepare('SELECT id FROM receta WHERE consulta_id = ?')
    .get(consultaId) as { id: number } | undefined

  if (medicamentos.length === 0) {
    if (existente) db().prepare('DELETE FROM receta WHERE id = ?').run(existente.id)
    return
  }

  let recetaId: number
  if (existente) {
    recetaId = existente.id
    db().prepare('DELETE FROM receta_item WHERE receta_id = ?').run(recetaId)
  } else {
    const resultado = db()
      .prepare('INSERT INTO receta (consulta_id, fecha) VALUES (?, ?)')
      .run(consultaId, fecha)
    recetaId = Number(resultado.lastInsertRowid)
  }

  const insertar = db().prepare(
    `INSERT INTO receta_item (
       receta_id, medicamento_id, nombre, concentracion, forma,
       dosis, frecuencia, duracion, via, indicaciones, orden
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  medicamentos.forEach((m, indice) => {
    insertar.run(
      recetaId,
      m.medicamentoId ?? null,
      m.nombre,
      m.concentracion ?? null,
      m.forma ?? null,
      m.dosis,
      m.frecuencia,
      m.duracion ?? null,
      m.via ?? null,
      m.indicaciones ?? null,
      indice
    )
  })
}

export function crear(input: ConsultaInput): number {
  return enTransaccion(() => {
    const ahora = ahoraIso()
    const fecha = hoyIso()

    const resultado = db()
      .prepare(
        `INSERT INTO consulta (
           paciente_id, fecha, motivo, sintomas, exploracion, tratamiento,
           observaciones, recomendaciones, proxima_cita_fecha, sin_proxima_cita,
           estado, creada_en, actualizada_en
         ) VALUES (
           @pacienteId, @fecha, @motivo, @sintomas, @exploracion, @tratamiento,
           @observaciones, @recomendaciones, @proximaCitaFecha, @sinProximaCita,
           'activa', @ahora, @ahora
         )`
      )
      .run({
        pacienteId: input.pacienteId,
        fecha,
        motivo: input.motivo,
        sintomas: input.sintomas ?? null,
        exploracion: input.exploracion ?? null,
        tratamiento: input.tratamiento ?? null,
        observaciones: input.observaciones ?? null,
        recomendaciones: input.recomendaciones ?? null,
        proximaCitaFecha: input.sinProximaCita ? null : (input.proximaCitaFecha ?? null),
        sinProximaCita: input.sinProximaCita ? 1 : 0,
        ahora
      })

    const id = Number(resultado.lastInsertRowid)
    guardarSignos(id, input.signos)
    guardarDiagnosticos(id, input.diagnosticos)
    guardarReceta(id, input.medicamentos, fecha)
    return id
  })
}

export class ErrorConsultaCerrada extends Error {
  readonly codigo = 'CONSULTA_CERRADA'
  constructor() {
    super(
      'Esta consulta ya no puede editarse porque no fue creada hoy. Agregue una adenda para dejar constancia del cambio.'
    )
  }
}

export function actualizar(id: number, input: ConsultaInput): void {
  enTransaccion(() => {
    const actual = obtener(id)
    if (!actual) throw new Error('La consulta no existe')
    if (!esEditable(actual)) throw new ErrorConsultaCerrada()

    db()
      .prepare(
        `UPDATE consulta SET
           motivo = @motivo, sintomas = @sintomas, exploracion = @exploracion,
           tratamiento = @tratamiento, observaciones = @observaciones,
           recomendaciones = @recomendaciones, proxima_cita_fecha = @proximaCitaFecha,
           sin_proxima_cita = @sinProximaCita, actualizada_en = @ahora
         WHERE id = @id`
      )
      .run({
        id,
        motivo: input.motivo,
        sintomas: input.sintomas ?? null,
        exploracion: input.exploracion ?? null,
        tratamiento: input.tratamiento ?? null,
        observaciones: input.observaciones ?? null,
        recomendaciones: input.recomendaciones ?? null,
        proximaCitaFecha: input.sinProximaCita ? null : (input.proximaCitaFecha ?? null),
        sinProximaCita: input.sinProximaCita ? 1 : 0,
        ahora: ahoraIso()
      })

    guardarSignos(id, input.signos)
    guardarDiagnosticos(id, input.diagnosticos)
    guardarReceta(id, input.medicamentos, actual.fecha)
  })
}

export function obtener(id: number): Consulta | null {
  const fila = db().prepare('SELECT * FROM consulta WHERE id = ?').get(id) as
    | FilaConsulta
    | undefined
  return fila ? aConsulta(fila) : null
}

const SIGNOS_VACIOS: SignosVitales = {
  peso: null,
  altura: null,
  imc: null,
  presionSistolica: null,
  presionDiastolica: null,
  temperatura: null,
  frecuenciaCardiaca: null,
  frecuenciaRespiratoria: null,
  saturacionOxigeno: null,
  glucosa: null
}

interface FilaSignos {
  peso: number | null
  altura: number | null
  imc: number | null
  presion_sistolica: number | null
  presion_diastolica: number | null
  temperatura: number | null
  frecuencia_cardiaca: number | null
  frecuencia_respiratoria: number | null
  saturacion_oxigeno: number | null
  glucosa: number | null
}

export function signos(consultaId: number): SignosVitales {
  const f = db()
    .prepare('SELECT * FROM signos_vitales WHERE consulta_id = ?')
    .get(consultaId) as FilaSignos | undefined
  if (!f) return { ...SIGNOS_VACIOS }
  return {
    peso: f.peso,
    altura: f.altura,
    imc: f.imc,
    presionSistolica: f.presion_sistolica,
    presionDiastolica: f.presion_diastolica,
    temperatura: f.temperatura,
    frecuenciaCardiaca: f.frecuencia_cardiaca,
    frecuenciaRespiratoria: f.frecuencia_respiratoria,
    saturacionOxigeno: f.saturacion_oxigeno,
    glucosa: f.glucosa
  }
}

interface FilaDiagnostico {
  id: number
  codigo_cie10: string
  descripcion: string
  es_principal: number
  nota: string | null
}

export function diagnosticos(consultaId: number): DiagnosticoConsulta[] {
  const filas = db()
    .prepare(
      'SELECT * FROM consulta_diagnostico WHERE consulta_id = ? ORDER BY es_principal DESC, id'
    )
    .all(consultaId) as FilaDiagnostico[]
  return filas.map((f) => ({
    id: f.id,
    codigoCie10: f.codigo_cie10,
    descripcion: f.descripcion,
    esPrincipal: f.es_principal === 1,
    nota: f.nota
  }))
}

interface FilaRecetaItem {
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

export function medicamentos(consultaId: number): MedicamentoRecetado[] {
  const filas = db()
    .prepare(
      `SELECT ri.* FROM receta_item ri
         JOIN receta r ON r.id = ri.receta_id
        WHERE r.consulta_id = ?
        ORDER BY ri.orden`
    )
    .all(consultaId) as FilaRecetaItem[]
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

interface FilaAdenda {
  id: number
  consulta_id: number
  texto: string
  creada_en: string
}

export function adendas(consultaId: number): Adenda[] {
  const filas = db()
    .prepare('SELECT * FROM adenda_consulta WHERE consulta_id = ? ORDER BY creada_en')
    .all(consultaId) as FilaAdenda[]
  return filas.map((f) => ({
    id: f.id,
    consultaId: f.consulta_id,
    texto: f.texto,
    creadaEn: f.creada_en
  }))
}

export function agregarAdenda(consultaId: number, texto: string): number {
  const resultado = db()
    .prepare('INSERT INTO adenda_consulta (consulta_id, texto, creada_en) VALUES (?, ?, ?)')
    .run(consultaId, texto, ahoraIso())
  return Number(resultado.lastInsertRowid)
}

export function obtenerCompleta(id: number): ConsultaCompleta | null {
  const consulta = obtener(id)
  if (!consulta) return null
  return {
    ...consulta,
    signos: signos(id),
    diagnosticos: diagnosticos(id),
    medicamentos: medicamentos(id),
    adendas: adendas(id),
    editable: esEditable(consulta)
  }
}

/** Una consulta nunca se elimina: se anula dejando constancia del motivo. */
export function anular(id: number, motivo: string): void {
  db()
    .prepare(
      `UPDATE consulta SET estado = 'anulada', motivo_anulacion = ?, actualizada_en = ?
       WHERE id = ? AND estado = 'activa'`
    )
    .run(motivo, ahoraIso(), id)
}

interface FilaResumen {
  id: number
  fecha: string
  motivo: string
  estado: 'activa' | 'anulada'
  diagnostico_principal: string | null
  total_medicamentos: number
}

export function historial(pacienteId: number, filtro: FiltroHistorial = {}): ConsultaResumen[] {
  const condiciones: string[] = ['c.paciente_id = @pacienteId']
  const parametros: Record<string, unknown> = { pacienteId }

  if (filtro.desde) {
    condiciones.push('c.fecha >= @desde')
    parametros.desde = filtro.desde
  }
  if (filtro.hasta) {
    condiciones.push('c.fecha <= @hasta')
    parametros.hasta = filtro.hasta
  }
  if (filtro.codigoCie10) {
    condiciones.push(
      'EXISTS (SELECT 1 FROM consulta_diagnostico d WHERE d.consulta_id = c.id AND d.codigo_cie10 = @codigo)'
    )
    parametros.codigo = filtro.codigoCie10
  }
  if (filtro.texto && filtro.texto.trim().length > 0) {
    condiciones.push(`(
      c.motivo LIKE @texto OR c.sintomas LIKE @texto OR c.exploracion LIKE @texto
      OR c.tratamiento LIKE @texto OR c.observaciones LIKE @texto
      OR c.recomendaciones LIKE @texto
      OR EXISTS (SELECT 1 FROM consulta_diagnostico d
                  WHERE d.consulta_id = c.id AND d.descripcion LIKE @texto)
    )`)
    parametros.texto = `%${filtro.texto.trim()}%`
  }

  const filas = db()
    .prepare(
      `SELECT c.id, c.fecha, c.motivo, c.estado,
              (SELECT d.descripcion FROM consulta_diagnostico d
                WHERE d.consulta_id = c.id
                ORDER BY d.es_principal DESC, d.id LIMIT 1) AS diagnostico_principal,
              (SELECT COUNT(*) FROM receta_item ri
                 JOIN receta r ON r.id = ri.receta_id
                WHERE r.consulta_id = c.id) AS total_medicamentos
         FROM consulta c
        WHERE ${condiciones.join(' AND ')}
        ORDER BY c.fecha DESC, c.id DESC`
    )
    .all(parametros) as FilaResumen[]

  return filas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    motivo: f.motivo,
    estado: f.estado,
    diagnosticoPrincipal: f.diagnostico_principal,
    totalMedicamentos: f.total_medicamentos
  }))
}

export function ultimaConsulta(pacienteId: number): ConsultaCompleta | null {
  const fila = db()
    .prepare(
      `SELECT id FROM consulta
        WHERE paciente_id = ? AND estado = 'activa'
        ORDER BY fecha DESC, id DESC LIMIT 1`
    )
    .get(pacienteId) as { id: number } | undefined
  return fila ? obtenerCompleta(fila.id) : null
}

export function contarDelDia(fecha: string): number {
  const fila = db()
    .prepare(`SELECT COUNT(*) AS total FROM consulta WHERE fecha = ? AND estado = 'activa'`)
    .get(fecha) as { total: number }
  return fila.total
}

interface FilaAtendido {
  paciente_id: number
  numero_expediente: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  fecha: string
  motivo: string
}

export function ultimosAtendidos(limite = 8): FilaAtendido[] {
  return db()
    .prepare(
      `SELECT c.paciente_id, p.numero_expediente, p.primer_nombre, p.segundo_nombre,
              p.primer_apellido, p.segundo_apellido, c.fecha, c.motivo
         FROM consulta c
         JOIN paciente p ON p.id = c.paciente_id
        WHERE c.estado = 'activa'
        ORDER BY c.fecha DESC, c.id DESC
        LIMIT ?`
    )
    .all(limite) as FilaAtendido[]
}
