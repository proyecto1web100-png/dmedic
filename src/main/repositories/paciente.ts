import { db, enTransaccion } from '../db/conexion'
import { calcularEdad, nombreCompleto, nombreListado } from '@shared/lib/paciente'
import { ahoraIso } from '@shared/lib/fecha'
import type {
  Alergia,
  Antecedente,
  ContactoEmergencia,
  ExpedienteResumen,
  MedicacionActual,
  Paciente,
  PacienteConResumen,
  PacienteInput,
  ProblemaCronico
} from '@shared/types'

interface FilaPaciente {
  id: number
  numero_expediente: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  fecha_nacimiento: string
  sexo: 'M' | 'F'
  numero_identidad: string | null
  telefono: string | null
  correo: string | null
  direccion: string | null
  tipo_sangre: string | null
  aseguradora: string | null
  referido_por: string | null
  notas: string | null
  responsable_id: number | null
  responsable_parentesco: string | null
  activo: number
  creado_en: string
  actualizado_en: string
}

function aPaciente(f: FilaPaciente): Paciente {
  return {
    id: f.id,
    numeroExpediente: f.numero_expediente,
    primerNombre: f.primer_nombre,
    segundoNombre: f.segundo_nombre,
    primerApellido: f.primer_apellido,
    segundoApellido: f.segundo_apellido,
    fechaNacimiento: f.fecha_nacimiento,
    sexo: f.sexo,
    numeroIdentidad: f.numero_identidad,
    telefono: f.telefono,
    correo: f.correo,
    direccion: f.direccion,
    tipoSangre: f.tipo_sangre,
    aseguradora: f.aseguradora,
    referidoPor: f.referido_por,
    notas: f.notas,
    responsableId: f.responsable_id,
    responsableParentesco: f.responsable_parentesco,
    activo: f.activo === 1,
    creadoEn: f.creado_en,
    actualizadoEn: f.actualizado_en
  }
}

function conResumen(p: Paciente, ultima: string | null, total: number): PacienteConResumen {
  return {
    ...p,
    nombreCompleto: nombreCompleto(p),
    edad: calcularEdad(p.fechaNacimiento),
    ultimaConsultaEn: ultima,
    totalConsultas: total
  }
}

/** EXP-2026-0001. El contador se reinicia cada año. */
function siguienteNumeroExpediente(): string {
  const ano = new Date().getFullYear()
  const prefijo = `EXP-${ano}-`
  const fila = db()
    .prepare(
      `SELECT numero_expediente FROM paciente
       WHERE numero_expediente LIKE ?
       ORDER BY numero_expediente DESC LIMIT 1`
    )
    .get(`${prefijo}%`) as { numero_expediente: string } | undefined

  const ultimo = fila ? Number.parseInt(fila.numero_expediente.slice(prefijo.length), 10) : 0
  return `${prefijo}${String(ultimo + 1).padStart(4, '0')}`
}

function textoBusqueda(input: PacienteInput, numeroExpediente: string): string {
  return [
    numeroExpediente,
    input.primerNombre,
    input.segundoNombre,
    input.primerApellido,
    input.segundoApellido,
    input.numeroIdentidad,
    input.telefono
  ]
    .filter(Boolean)
    .join(' ')
}

function reindexar(id: number, texto: string): void {
  db().prepare('DELETE FROM paciente_fts WHERE rowid = ?').run(id)
  db().prepare('INSERT INTO paciente_fts (rowid, texto) VALUES (?, ?)').run(id, texto)
}

export function crear(input: PacienteInput): number {
  return enTransaccion(() => {
    const ahora = ahoraIso()
    const numeroExpediente = siguienteNumeroExpediente()

    const resultado = db()
      .prepare(
        `INSERT INTO paciente (
           numero_expediente, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
           fecha_nacimiento, sexo, numero_identidad, telefono, correo, direccion,
           tipo_sangre, aseguradora, referido_por, notas,
           responsable_id, responsable_parentesco, activo, creado_en, actualizado_en
         ) VALUES (
           @numeroExpediente, @primerNombre, @segundoNombre, @primerApellido, @segundoApellido,
           @fechaNacimiento, @sexo, @numeroIdentidad, @telefono, @correo, @direccion,
           @tipoSangre, @aseguradora, @referidoPor, @notas,
           @responsableId, @responsableParentesco, 1, @ahora, @ahora
         )`
      )
      .run({
        numeroExpediente,
        primerNombre: input.primerNombre,
        segundoNombre: input.segundoNombre ?? null,
        primerApellido: input.primerApellido,
        segundoApellido: input.segundoApellido ?? null,
        fechaNacimiento: input.fechaNacimiento,
        sexo: input.sexo,
        numeroIdentidad: input.numeroIdentidad ?? null,
        telefono: input.telefono ?? null,
        correo: input.correo ?? null,
        direccion: input.direccion ?? null,
        tipoSangre: input.tipoSangre ?? null,
        aseguradora: input.aseguradora ?? null,
        referidoPor: input.referidoPor ?? null,
        notas: input.notas ?? null,
        responsableId: input.responsableId ?? null,
        responsableParentesco: input.responsableParentesco ?? null,
        ahora
      })

    const id = Number(resultado.lastInsertRowid)
    reindexar(id, textoBusqueda(input, numeroExpediente))
    guardarContactos(id, input.contactos ?? [])
    return id
  })
}

export function actualizar(id: number, input: PacienteInput): void {
  enTransaccion(() => {
    const existente = obtener(id)
    if (!existente) throw new Error('El paciente no existe')

    db()
      .prepare(
        `UPDATE paciente SET
           primer_nombre = @primerNombre, segundo_nombre = @segundoNombre,
           primer_apellido = @primerApellido, segundo_apellido = @segundoApellido,
           fecha_nacimiento = @fechaNacimiento, sexo = @sexo,
           numero_identidad = @numeroIdentidad, telefono = @telefono, correo = @correo,
           direccion = @direccion, tipo_sangre = @tipoSangre, aseguradora = @aseguradora,
           referido_por = @referidoPor, notas = @notas,
           responsable_id = @responsableId, responsable_parentesco = @responsableParentesco,
           actualizado_en = @ahora
         WHERE id = @id`
      )
      .run({
        id,
        primerNombre: input.primerNombre,
        segundoNombre: input.segundoNombre ?? null,
        primerApellido: input.primerApellido,
        segundoApellido: input.segundoApellido ?? null,
        fechaNacimiento: input.fechaNacimiento,
        sexo: input.sexo,
        numeroIdentidad: input.numeroIdentidad ?? null,
        telefono: input.telefono ?? null,
        correo: input.correo ?? null,
        direccion: input.direccion ?? null,
        tipoSangre: input.tipoSangre ?? null,
        aseguradora: input.aseguradora ?? null,
        referidoPor: input.referidoPor ?? null,
        notas: input.notas ?? null,
        responsableId: input.responsableId ?? null,
        responsableParentesco: input.responsableParentesco ?? null,
        ahora: ahoraIso()
      })

    reindexar(id, textoBusqueda(input, existente.numeroExpediente))
    if (input.contactos) guardarContactos(id, input.contactos)
  })
}

function guardarContactos(pacienteId: number, contactos: ContactoEmergencia[]): void {
  db().prepare('DELETE FROM contacto_emergencia WHERE paciente_id = ?').run(pacienteId)
  const insertar = db().prepare(
    `INSERT INTO contacto_emergencia (paciente_id, nombre, telefono, parentesco)
     VALUES (?, ?, ?, ?)`
  )
  for (const c of contactos.slice(0, 3)) {
    insertar.run(pacienteId, c.nombre, c.telefono, c.parentesco ?? null)
  }
}

export function obtener(id: number): Paciente | null {
  const fila = db().prepare('SELECT * FROM paciente WHERE id = ?').get(id) as
    | FilaPaciente
    | undefined
  return fila ? aPaciente(fila) : null
}

export function obtenerPorIdentidad(identidad: string): Paciente | null {
  const fila = db().prepare('SELECT * FROM paciente WHERE numero_identidad = ?').get(identidad) as
    | FilaPaciente
    | undefined
  return fila ? aPaciente(fila) : null
}

/** Mismo nombre y misma fecha de nacimiento: casi siempre es un alta repetida. */
export function posiblesDuplicados(
  primerNombre: string,
  primerApellido: string,
  fechaNacimiento: string,
  excluirId?: number
): PacienteConResumen[] {
  const filas = db()
    .prepare(
      `SELECT * FROM paciente
       WHERE lower(primer_nombre) = lower(?)
         AND lower(primer_apellido) = lower(?)
         AND fecha_nacimiento = ?
         AND id != ?`
    )
    .all(primerNombre, primerApellido, fechaNacimiento, excluirId ?? -1) as FilaPaciente[]
  return filas.map((f) => conResumen(aPaciente(f), null, 0))
}

interface FilaBusqueda extends FilaPaciente {
  ultima_consulta: string | null
  total_consultas: number
}

const SELECT_CON_RESUMEN = `
  SELECT p.*,
         (SELECT MAX(c.fecha) FROM consulta c
           WHERE c.paciente_id = p.id AND c.estado = 'activa') AS ultima_consulta,
         (SELECT COUNT(*) FROM consulta c
           WHERE c.paciente_id = p.id AND c.estado = 'activa') AS total_consultas
  FROM paciente p`

export function buscar(
  texto: string,
  opciones: { limite?: number; incluirInactivos?: boolean } = {}
): PacienteConResumen[] {
  const limite = opciones.limite ?? 40
  const filtroActivo = opciones.incluirInactivos ? '' : 'AND p.activo = 1'
  const termino = texto.trim()

  if (termino.length === 0) {
    const filas = db()
      .prepare(
        `${SELECT_CON_RESUMEN}
         WHERE 1 = 1 ${filtroActivo}
         ORDER BY p.primer_apellido, p.primer_nombre
         LIMIT ?`
      )
      .all(limite) as FilaBusqueda[]
    return filas.map((f) => conResumen(aPaciente(f), f.ultima_consulta, f.total_consultas))
  }

  // Prefijo en cada palabra: escribir "jua per" encuentra "Juan Perez".
  const consultaFts = termino
    .split(/\s+/)
    .map((palabra) => palabra.replace(/["*]/g, ''))
    .filter((palabra) => palabra.length > 0)
    .map((palabra) => `"${palabra}"*`)
    .join(' AND ')

  if (consultaFts.length === 0) return []

  const filas = db()
    .prepare(
      `${SELECT_CON_RESUMEN}
       JOIN paciente_fts f ON f.rowid = p.id
       WHERE paciente_fts MATCH ? ${filtroActivo}
       ORDER BY rank
       LIMIT ?`
    )
    .all(consultaFts, limite) as FilaBusqueda[]

  return filas.map((f) => conResumen(aPaciente(f), f.ultima_consulta, f.total_consultas))
}

export function contarActivos(): number {
  const fila = db()
    .prepare('SELECT COUNT(*) AS total FROM paciente WHERE activo = 1')
    .get() as { total: number }
  return fila.total
}

export function contarNuevosDesde(fechaIso: string): number {
  const fila = db()
    .prepare('SELECT COUNT(*) AS total FROM paciente WHERE creado_en >= ?')
    .get(fechaIso) as { total: number }
  return fila.total
}

export function archivar(id: number): void {
  db()
    .prepare('UPDATE paciente SET activo = 0, actualizado_en = ? WHERE id = ?')
    .run(ahoraIso(), id)
}

export function reactivar(id: number): void {
  db()
    .prepare('UPDATE paciente SET activo = 1, actualizado_en = ? WHERE id = ?')
    .run(ahoraIso(), id)
}

/**
 * Borrado definitivo. Arrastra consultas, recetas y documentos del paciente.
 * Solo debe invocarse tras una confirmacion explicita del usuario.
 */
export function eliminarDefinitivo(id: number): void {
  enTransaccion(() => {
    const consultas = db()
      .prepare('SELECT id FROM consulta WHERE paciente_id = ?')
      .all(id) as { id: number }[]
    for (const consulta of consultas) {
      db().prepare('DELETE FROM consulta WHERE id = ?').run(consulta.id)
    }
    db().prepare('DELETE FROM documento_generado WHERE paciente_id = ?').run(id)
    db().prepare('UPDATE paciente SET responsable_id = NULL WHERE responsable_id = ?').run(id)
    db().prepare('DELETE FROM paciente WHERE id = ?').run(id)
    db().prepare('DELETE FROM paciente_fts WHERE rowid = ?').run(id)
  })
}

// ===== Datos clinicos permanentes del paciente =====

interface FilaAlergia {
  id: number
  paciente_id: number
  sustancia: string
  reaccion: string | null
  gravedad: Alergia['gravedad']
  activa: number
  registrada_en: string
}

export function alergias(pacienteId: number): Alergia[] {
  const filas = db()
    .prepare('SELECT * FROM alergia WHERE paciente_id = ? ORDER BY activa DESC, gravedad, sustancia')
    .all(pacienteId) as FilaAlergia[]
  return filas.map((f) => ({
    id: f.id,
    pacienteId: f.paciente_id,
    sustancia: f.sustancia,
    reaccion: f.reaccion,
    gravedad: f.gravedad,
    activa: f.activa === 1,
    registradaEn: f.registrada_en
  }))
}

export function agregarAlergia(
  pacienteId: number,
  datos: { sustancia: string; reaccion: string | null; gravedad: Alergia['gravedad'] }
): number {
  const resultado = db()
    .prepare(
      `INSERT INTO alergia (paciente_id, sustancia, reaccion, gravedad, activa, registrada_en)
       VALUES (?, ?, ?, ?, 1, ?)`
    )
    .run(pacienteId, datos.sustancia, datos.reaccion, datos.gravedad, ahoraIso())
  return Number(resultado.lastInsertRowid)
}

export function alternarAlergia(id: number, activa: boolean): void {
  db().prepare('UPDATE alergia SET activa = ? WHERE id = ?').run(activa ? 1 : 0, id)
}

export function eliminarAlergia(id: number): void {
  db().prepare('DELETE FROM alergia WHERE id = ?').run(id)
}

interface FilaAntecedente {
  id: number
  paciente_id: number
  tipo: Antecedente['tipo']
  descripcion: string
  registrado_en: string
  vigente: number
}

export function antecedentes(pacienteId: number): Antecedente[] {
  const filas = db()
    .prepare(
      'SELECT * FROM antecedente WHERE paciente_id = ? ORDER BY tipo, registrado_en DESC'
    )
    .all(pacienteId) as FilaAntecedente[]
  return filas.map((f) => ({
    id: f.id,
    pacienteId: f.paciente_id,
    tipo: f.tipo,
    descripcion: f.descripcion,
    registradoEn: f.registrado_en,
    vigente: f.vigente === 1
  }))
}

export function agregarAntecedente(
  pacienteId: number,
  datos: { tipo: Antecedente['tipo']; descripcion: string }
): number {
  const resultado = db()
    .prepare(
      `INSERT INTO antecedente (paciente_id, tipo, descripcion, registrado_en, vigente)
       VALUES (?, ?, ?, ?, 1)`
    )
    .run(pacienteId, datos.tipo, datos.descripcion, ahoraIso())
  return Number(resultado.lastInsertRowid)
}

export function eliminarAntecedente(id: number): void {
  db().prepare('DELETE FROM antecedente WHERE id = ?').run(id)
}

interface FilaCronico {
  id: number
  paciente_id: number
  codigo_cie10: string | null
  descripcion: string
  desde: string | null
  activo: number
}

export function cronicos(pacienteId: number): ProblemaCronico[] {
  const filas = db()
    .prepare('SELECT * FROM problema_cronico WHERE paciente_id = ? ORDER BY activo DESC, descripcion')
    .all(pacienteId) as FilaCronico[]
  return filas.map((f) => ({
    id: f.id,
    pacienteId: f.paciente_id,
    codigoCie10: f.codigo_cie10,
    descripcion: f.descripcion,
    desde: f.desde,
    activo: f.activo === 1
  }))
}

export function agregarCronico(
  pacienteId: number,
  datos: { codigoCie10: string | null; descripcion: string; desde: string | null }
): number {
  const resultado = db()
    .prepare(
      `INSERT INTO problema_cronico (paciente_id, codigo_cie10, descripcion, desde, activo)
       VALUES (?, ?, ?, ?, 1)`
    )
    .run(pacienteId, datos.codigoCie10, datos.descripcion, datos.desde)
  return Number(resultado.lastInsertRowid)
}

export function alternarCronico(id: number, activo: boolean): void {
  db().prepare('UPDATE problema_cronico SET activo = ? WHERE id = ?').run(activo ? 1 : 0, id)
}

export function eliminarCronico(id: number): void {
  db().prepare('DELETE FROM problema_cronico WHERE id = ?').run(id)
}

interface FilaContacto {
  id: number
  nombre: string
  telefono: string
  parentesco: string | null
}

export function contactos(pacienteId: number): ContactoEmergencia[] {
  const filas = db()
    .prepare('SELECT * FROM contacto_emergencia WHERE paciente_id = ? ORDER BY id')
    .all(pacienteId) as FilaContacto[]
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    telefono: f.telefono,
    parentesco: f.parentesco
  }))
}

/** Medicamentos de la ultima consulta activa: lo que el paciente esta tomando ahora. */
export function medicacionActual(pacienteId: number): MedicacionActual[] {
  const filas = db()
    .prepare(
      `SELECT ri.nombre, ri.concentracion, ri.dosis, ri.frecuencia, ri.duracion, c.fecha AS desde
         FROM receta_item ri
         JOIN receta r  ON r.id = ri.receta_id
         JOIN consulta c ON c.id = r.consulta_id
        WHERE c.paciente_id = ?
          AND c.estado = 'activa'
          AND c.id = (SELECT id FROM consulta
                       WHERE paciente_id = ? AND estado = 'activa'
                       ORDER BY fecha DESC, id DESC LIMIT 1)
        ORDER BY ri.orden`
    )
    .all(pacienteId, pacienteId) as MedicacionActual[]

  return filas
}

export function expedienteResumen(pacienteId: number): ExpedienteResumen | null {
  const fila = db()
    .prepare(`${SELECT_CON_RESUMEN} WHERE p.id = ?`)
    .get(pacienteId) as FilaBusqueda | undefined
  if (!fila) return null

  const paciente = aPaciente(fila)
  let responsable: ExpedienteResumen['responsable'] = null
  if (paciente.responsableId) {
    const r = obtener(paciente.responsableId)
    if (r) {
      responsable = {
        id: r.id,
        nombreCompleto: nombreCompleto(r),
        numeroIdentidad: r.numeroIdentidad
      }
    }
  }

  return {
    paciente: conResumen(paciente, fila.ultima_consulta, fila.total_consultas),
    contactos: contactos(pacienteId),
    alergias: alergias(pacienteId),
    antecedentes: antecedentes(pacienteId),
    cronicos: cronicos(pacienteId),
    medicacionActual: medicacionActual(pacienteId),
    responsable
  }
}

export function rutaCarpeta(paciente: Paciente): { expediente: string; listado: string } {
  return { expediente: paciente.numeroExpediente, listado: nombreListado(paciente) }
}
