import { db } from '../db/conexion'
import { ahoraIso } from '@shared/lib/fecha'
import type { AtencionEmpresa, Empresa, EmpresaInput, ReporteEmpresa } from '@shared/types'

interface FilaEmpresa {
  id: number
  codigo: string
  nombre: string
  contacto: string | null
  telefono: string | null
  correo: string | null
  notas: string | null
  activa: number
  creada_en: string
  total_pacientes: number
}

function aEmpresa(f: FilaEmpresa): Empresa {
  return {
    id: f.id,
    codigo: f.codigo,
    nombre: f.nombre,
    contacto: f.contacto,
    telefono: f.telefono,
    correo: f.correo,
    notas: f.notas,
    activa: f.activa === 1,
    creadaEn: f.creada_en,
    totalPacientes: f.total_pacientes
  }
}

const SELECT_EMPRESA = `
  SELECT e.*,
         (SELECT COUNT(*) FROM paciente p
           WHERE p.empresa_id = e.id AND p.activo = 1) AS total_pacientes
    FROM empresa e`

export function listar(soloActivas = false): Empresa[] {
  const filas = db()
    .prepare(`${SELECT_EMPRESA} ${soloActivas ? 'WHERE e.activa = 1' : ''} ORDER BY e.nombre`)
    .all() as FilaEmpresa[]
  return filas.map(aEmpresa)
}

export function obtener(id: number): Empresa | null {
  const fila = db().prepare(`${SELECT_EMPRESA} WHERE e.id = ?`).get(id) as FilaEmpresa | undefined
  return fila ? aEmpresa(fila) : null
}

/** El codigo identifica a la empresa en los registros de la clinica: no se repite. */
function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase()
}

function exigirCodigoLibre(codigo: string, excluirId?: number): void {
  const fila = db()
    .prepare('SELECT id FROM empresa WHERE upper(codigo) = ? AND id != ?')
    .get(normalizarCodigo(codigo), excluirId ?? -1) as { id: number } | undefined
  if (fila) throw new Error(`Ya existe una empresa con el código ${normalizarCodigo(codigo)}`)
}

export function crear(input: EmpresaInput): number {
  exigirCodigoLibre(input.codigo)
  const resultado = db()
    .prepare(
      `INSERT INTO empresa (codigo, nombre, contacto, telefono, correo, notas, activa, creada_en)
       VALUES (@codigo, @nombre, @contacto, @telefono, @correo, @notas, 1, @creadaEn)`
    )
    .run({
      codigo: normalizarCodigo(input.codigo),
      nombre: input.nombre.trim(),
      contacto: input.contacto ?? null,
      telefono: input.telefono ?? null,
      correo: input.correo ?? null,
      notas: input.notas ?? null,
      creadaEn: ahoraIso()
    })
  return Number(resultado.lastInsertRowid)
}

export function actualizar(id: number, input: EmpresaInput): void {
  exigirCodigoLibre(input.codigo, id)
  db()
    .prepare(
      `UPDATE empresa SET codigo = @codigo, nombre = @nombre, contacto = @contacto,
              telefono = @telefono, correo = @correo, notas = @notas
        WHERE id = @id`
    )
    .run({
      id,
      codigo: normalizarCodigo(input.codigo),
      nombre: input.nombre.trim(),
      contacto: input.contacto ?? null,
      telefono: input.telefono ?? null,
      correo: input.correo ?? null,
      notas: input.notas ?? null
    })
}

/**
 * Desactivar no borra: los pacientes siguen ligados a su empresa y los reportes
 * de periodos anteriores se mantienen completos.
 */
export function alternar(id: number, activa: boolean): void {
  db().prepare('UPDATE empresa SET activa = ? WHERE id = ?').run(activa ? 1 : 0, id)
}

/**
 * Atenciones de los empleados de una empresa en un periodo. Es lo que la
 * clinica le entrega a la empresa para facturarle.
 */
export function reporte(empresaId: number, desde: string, hasta: string): ReporteEmpresa {
  const empresa = obtener(empresaId)
  if (!empresa) throw new Error('La empresa no existe')

  const filas = db()
    .prepare(
      `SELECT c.id AS consulta_id, c.fecha, c.motivo,
              p.id AS paciente_id, p.numero_expediente, p.codigo_empleado,
              p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido,
              u.nombre AS nombre_doctor,
              (SELECT d.descripcion FROM consulta_diagnostico d
                WHERE d.consulta_id = c.id
                ORDER BY d.es_principal DESC, d.id LIMIT 1) AS diagnostico
         FROM consulta c
         JOIN paciente p ON p.id = c.paciente_id
         LEFT JOIN usuario u ON u.id = c.usuario_id
        WHERE p.empresa_id = ?
          AND c.estado = 'activa'
          AND c.fecha BETWEEN ? AND ?
        ORDER BY c.fecha DESC, p.primer_apellido`
    )
    .all(empresaId, desde, hasta) as {
    consulta_id: number
    fecha: string
    motivo: string
    paciente_id: number
    numero_expediente: string
    codigo_empleado: string | null
    primer_nombre: string
    segundo_nombre: string | null
    primer_apellido: string
    segundo_apellido: string | null
    nombre_doctor: string | null
    diagnostico: string | null
  }[]

  const atenciones: AtencionEmpresa[] = filas.map((f) => ({
    consultaId: f.consulta_id,
    fecha: f.fecha,
    pacienteId: f.paciente_id,
    nombreCompleto: [f.primer_nombre, f.segundo_nombre, f.primer_apellido, f.segundo_apellido]
      .filter(Boolean)
      .join(' '),
    numeroExpediente: f.numero_expediente,
    codigoEmpleado: f.codigo_empleado,
    motivo: f.motivo,
    diagnosticoPrincipal: f.diagnostico,
    nombreDoctor: f.nombre_doctor
  }))

  return {
    empresa,
    desde,
    hasta,
    atenciones,
    totalAtenciones: atenciones.length,
    totalPacientes: new Set(atenciones.map((a) => a.pacienteId)).size
  }
}
