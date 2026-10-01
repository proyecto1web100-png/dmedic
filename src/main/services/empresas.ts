import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { asegurarDirectorio, directorioDatos, nombreCarpetaSeguro } from '../db/rutas'
import { auditar } from '../audit/auditoria'
import { exigirPermiso } from '../security/sesion'
import { configuracion } from '../repositories/sistema'
import * as repo from '../repositories/empresa'
import * as pacientesRepo from '../repositories/paciente'
import { htmlReporteEmpresa } from '../pdf/documentos'
import { generarPdf, marcaHora } from './documentos'
import type {
  Empresa,
  EmpresaInput,
  PacienteConResumen,
  ReporteEmpresa
} from '@shared/types'

/**
 * Empresas con convenio. Agrupar a los pacientes por empresa permite listarlos
 * y entregarle a cada empresa el detalle de las atenciones de sus empleados.
 */

export function listar(soloActivas = false): Empresa[] {
  exigirPermiso('empresas.gestionar')
  return repo.listar(soloActivas)
}

export function crear(input: EmpresaInput): number {
  exigirPermiso('empresas.gestionar')
  if (!input.codigo.trim()) throw new Error('Escriba el código de la empresa')
  if (!input.nombre.trim()) throw new Error('Escriba el nombre de la empresa')

  const id = repo.crear(input)
  auditar({
    accion: 'empresa.creada',
    entidad: 'empresa',
    entidadId: id,
    detalle: `${input.codigo.trim().toUpperCase()} · ${input.nombre.trim()}`
  })
  return id
}

export function actualizar(id: number, input: EmpresaInput): void {
  exigirPermiso('empresas.gestionar')
  if (!input.codigo.trim()) throw new Error('Escriba el código de la empresa')
  if (!input.nombre.trim()) throw new Error('Escriba el nombre de la empresa')

  repo.actualizar(id, input)
  auditar({
    accion: 'empresa.editada',
    entidad: 'empresa',
    entidadId: id,
    detalle: `${input.codigo.trim().toUpperCase()} · ${input.nombre.trim()}`
  })
}

export function alternar(id: number, activa: boolean): void {
  exigirPermiso('empresas.gestionar')
  repo.alternar(id, activa)
  auditar({
    accion: activa ? 'empresa.reactivada' : 'empresa.desactivada',
    entidad: 'empresa',
    entidadId: id
  })
}

export function pacientesDe(empresaId: number): PacienteConResumen[] {
  exigirPermiso('empresas.gestionar')
  return pacientesRepo.porEmpresa(empresaId)
}

export function reporte(empresaId: number, desde: string, hasta: string): ReporteEmpresa {
  // El detalle de atenciones incluye diagnostico: solo lo ve quien puede ver
  // informacion clinica, aunque administrar la empresa sea trabajo de oficina.
  exigirPermiso('pacientes.ver_clinico')
  if (hasta < desde) throw new Error('La fecha final no puede ser anterior a la inicial')
  return repo.reporte(empresaId, desde, hasta)
}

/** El PDF que la clinica le entrega a la empresa para facturarle el periodo. */
export async function imprimirReporte(
  empresaId: number,
  desde: string,
  hasta: string
): Promise<{ ruta: string }> {
  exigirPermiso('pacientes.ver_clinico')
  const datos = reporte(empresaId, desde, hasta)

  const pdf = await generarPdf(htmlReporteEmpresa(configuracion(), datos), 'carta')
  const carpeta = asegurarDirectorio(join(directorioDatos(), 'reportes'))
  const ruta = join(
    carpeta,
    `${desde} Empresa ${nombreCarpetaSeguro(datos.empresa.codigo)} ${marcaHora()}.pdf`
  )
  writeFileSync(ruta, pdf)

  auditar({
    accion: 'documento.impreso',
    entidad: 'empresa',
    entidadId: empresaId,
    detalle: `reporte ${datos.empresa.codigo} ${desde}–${hasta} · ${ruta}`
  })
  return { ruta }
}
