import { BrowserWindow, shell } from 'electron'
import { unlinkSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { db } from '../db/conexion'
import {
  asegurarDirectorio,
  directorioDatos,
  nombreCarpetaSeguro,
  subcarpetaPaciente
} from '../db/rutas'
import { nombreListado } from '@shared/lib/paciente'
import { ahoraIso, hoyIso } from '@shared/lib/fecha'
import {
  htmlExpediente,
  htmlReceta,
  htmlReporteCitas,
  htmlResumenConsulta
} from '../pdf/plantillas'
import { auditar } from '../audit/auditoria'
import * as consultasRepo from '../repositories/consulta'
import * as pacientesRepo from '../repositories/paciente'
import * as citas from './citas'
import { configuracion } from '../repositories/sistema'
import type { PeriodoReporte } from '@shared/types'

export type TipoDocumento = 'receta' | 'resumen_consulta' | 'expediente'

/**
 * printToPDF mide en PULGADAS, no en micras ni en pixeles. Con micras la pagina
 * sale miles de veces mas grande y el documento resulta inservible al imprimir.
 */
const TAMANOS: Record<'carta' | 'media_carta', Electron.PrintToPDFOptions['pageSize']> = {
  /** Carta: 8.5 x 11 pulgadas. Se usa el nombre estandar, que Chromium reconoce. */
  carta: 'Letter',
  /** Media carta: 5.5 x 8.5 pulgadas, el recetario habitual de consultorio. */
  media_carta: { width: 5.5, height: 8.5 }
}

/**
 * Render aislado: una ventana oculta, sin Node, sin acceso a la red, que solo
 * existe el tiempo de convertir el HTML en PDF.
 *
 * El HTML se pasa por un archivo temporal y no por una URL "data:": Chromium
 * limita la longitud de esas URL y un expediente largo la excede.
 */
async function generarPdf(html: string, tamano: 'carta' | 'media_carta'): Promise<Buffer> {
  const rutaTemporal = join(
    asegurarDirectorio(join(tmpdir(), 'dmedic-render')),
    `${randomUUID()}.html`
  )
  writeFileSync(rutaTemporal, html, 'utf8')

  const ventana = new BrowserWindow({
    show: false,
    webPreferences: {
      javascript: false,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  try {
    await ventana.loadFile(rutaTemporal)
    // Los márgenes van a cero: la maquetación los define en milímetros dentro
    // del HTML, que es la única forma de controlar el resultado con precisión.
    return await ventana.webContents.printToPDF({
      pageSize: TAMANOS[tamano],
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: false
    })
  } finally {
    ventana.destroy()
    try {
      unlinkSync(rutaTemporal)
    } catch {
      // Un temporal que no se pudo borrar no debe impedir entregar el documento.
    }
  }
}

function registrar(
  pacienteId: number,
  consultaId: number | null,
  tipo: TipoDocumento,
  ruta: string
): void {
  db()
    .prepare(
      `INSERT INTO documento_generado (paciente_id, consulta_id, tipo, archivo_path, creado_en)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(pacienteId, consultaId, tipo, ruta, ahoraIso())
}

export interface DocumentoGenerado {
  ruta: string
  tipo: TipoDocumento | 'reporte_citas'
}

/**
 * Genera el PDF y lo archiva en la carpeta del propio paciente, de modo que el
 * expediente en disco quede organizado sin que nadie tenga que ordenarlo a mano.
 */
/** Marca de hora para que dos documentos del mismo día nunca se pisen. */
function marcaHora(): string {
  return new Date().toTimeString().slice(0, 8).replace(/:/g, '')
}

export async function generarDocumento(
  consultaId: number,
  tipo: 'receta' | 'resumen_consulta'
): Promise<DocumentoGenerado> {
  const consulta = consultasRepo.obtenerCompleta(consultaId)
  if (!consulta) throw new Error('La consulta no existe')

  const expediente = pacientesRepo.expedienteResumen(consulta.pacienteId)
  if (!expediente) throw new Error('El paciente no existe')

  if (tipo === 'receta' && consulta.medicamentos.length === 0) {
    throw new Error('Esta consulta no tiene medicamentos, no hay receta que imprimir')
  }

  const config = configuracion()
  const paciente = expediente.paciente

  const tamano = tipo === 'receta' ? config.tamanoReceta : 'carta'
  const html =
    tipo === 'receta'
      ? htmlReceta(config, expediente, consulta, tamano)
      : htmlResumenConsulta(config, expediente, consulta)

  const pdf = await generarPdf(html, tamano)

  const carpeta = subcarpetaPaciente(
    paciente.numeroExpediente,
    nombreListado(paciente),
    tipo === 'receta' ? 'Recetas' : 'Consultas'
  )
  const etiqueta = tipo === 'receta' ? 'Receta' : 'Consulta'
  const ruta = join(carpeta, `${consulta.fecha} ${etiqueta} ${marcaHora()}.pdf`)

  writeFileSync(ruta, pdf)
  registrar(paciente.id, consultaId, tipo, ruta)
  auditar({
    accion: 'documento.impreso',
    entidad: 'consulta',
    entidadId: consultaId,
    detalle: `${tipo} · ${ruta}`
  })

  return { ruta, tipo }
}

/** Expediente completo del paciente: datos, alergias, antecedentes e historial. */
export async function generarExpediente(pacienteId: number): Promise<DocumentoGenerado> {
  const expediente = pacientesRepo.expedienteResumen(pacienteId)
  if (!expediente) throw new Error('El paciente no existe')

  const resumenes = consultasRepo.historial(pacienteId)
  const consultas = resumenes
    .map((r) => consultasRepo.obtenerCompleta(r.id))
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const config = configuracion()
  const paciente = expediente.paciente

  const pdf = await generarPdf(htmlExpediente(config, expediente, consultas), 'carta')

  const carpeta = subcarpetaPaciente(
    paciente.numeroExpediente,
    nombreListado(paciente),
    'Documentos'
  )
  const ruta = join(carpeta, `${hoyIso()} Expediente ${marcaHora()}.pdf`)

  writeFileSync(ruta, pdf)
  registrar(paciente.id, null, 'expediente', ruta)
  auditar({
    accion: 'documento.impreso',
    entidad: 'paciente',
    entidadId: pacienteId,
    detalle: `expediente completo · ${ruta}`
  })

  return { ruta, tipo: 'expediente' }
}

/**
 * Reporte de agenda. Se guarda en una carpeta propia, no en la de un paciente,
 * porque agrupa a varios.
 */
export async function generarReporteCitas(
  periodo: PeriodoReporte,
  referencia: string,
  doctorId: number | null
): Promise<DocumentoGenerado> {
  const reporte = citas.reporte(periodo, referencia, doctorId)
  const config = configuracion()

  const pdf = await generarPdf(htmlReporteCitas(config, reporte), 'carta')

  const carpeta = asegurarDirectorio(join(directorioDatos(), 'reportes'))
  const sufijo = reporte.nombreDoctor ? ` ${nombreCarpetaSeguro(reporte.nombreDoctor)}` : ''
  const ruta = join(carpeta, `${reporte.desde} Agenda ${periodo}${sufijo} ${marcaHora()}.pdf`)

  writeFileSync(ruta, pdf)
  auditar({
    accion: 'documento.impreso',
    entidad: 'agenda',
    detalle: `reporte ${periodo} ${reporte.desde}–${reporte.hasta} · ${ruta}`
  })

  return { ruta, tipo: 'reporte_citas' }
}

export async function abrirDocumento(ruta: string): Promise<void> {
  const error = await shell.openPath(ruta)
  if (error) throw new Error(`No se pudo abrir el documento: ${error}`)
}

export function revelarEnCarpeta(ruta: string): void {
  shell.showItemInFolder(ruta)
}

export function documentosDePaciente(
  pacienteId: number
): { id: number; tipo: string; ruta: string; creadoEn: string }[] {
  const filas = db()
    .prepare(
      `SELECT id, tipo, archivo_path, creado_en FROM documento_generado
        WHERE paciente_id = ? ORDER BY creado_en DESC LIMIT 100`
    )
    .all(pacienteId) as {
    id: number
    tipo: string
    archivo_path: string
    creado_en: string
  }[]
  return filas.map((f) => ({
    id: f.id,
    tipo: f.tipo,
    ruta: f.archivo_path,
    creadoEn: f.creado_en
  }))
}

export function fechaHoy(): string {
  return hoyIso()
}
