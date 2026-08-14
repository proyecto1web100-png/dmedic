import { BrowserWindow, shell } from 'electron'
import { unlinkSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { db } from '../db/conexion'
import { asegurarDirectorio, subcarpetaPaciente } from '../db/rutas'
import { nombreListado } from '@shared/lib/paciente'
import { ahoraIso, hoyIso } from '@shared/lib/fecha'
import { htmlReceta, htmlResumenConsulta } from '../pdf/plantillas'
import { auditar } from '../audit/auditoria'
import * as consultasRepo from '../repositories/consulta'
import * as pacientesRepo from '../repositories/paciente'
import { configuracion } from '../repositories/sistema'

export type TipoDocumento = 'receta' | 'resumen_consulta'

/** Media carta: el recetario habitual de consultorio. */
const MEDIA_CARTA = { width: 139_700, height: 215_900 }
/** Carta completa para documentos largos. */
const CARTA = { width: 215_900, height: 279_400 }

/**
 * Render aislado: una ventana oculta, sin Node, sin acceso a la red, que solo
 * existe el tiempo de convertir el HTML en PDF.
 *
 * El HTML se pasa por un archivo temporal y no por una URL "data:": Chromium
 * limita la longitud de esas URL y un expediente largo la excede.
 */
async function generarPdf(
  html: string,
  tamano: { width: number; height: number },
  margen: number
): Promise<Buffer> {
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
    return await ventana.webContents.printToPDF({
      pageSize: tamano,
      printBackground: true,
      margins: { top: margen, bottom: margen, left: margen, right: margen }
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
  tipo: TipoDocumento
}

/**
 * Genera el PDF y lo archiva en la carpeta del propio paciente, de modo que el
 * expediente en disco quede organizado sin que nadie tenga que ordenarlo a mano.
 */
export async function generarDocumento(
  consultaId: number,
  tipo: TipoDocumento
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

  const html =
    tipo === 'receta'
      ? htmlReceta(config, expediente, consulta)
      : htmlResumenConsulta(config, expediente, consulta)

  const pdf =
    tipo === 'receta'
      ? await generarPdf(html, MEDIA_CARTA, 0.35)
      : await generarPdf(html, CARTA, 0.5)

  const carpeta = subcarpetaPaciente(
    paciente.numeroExpediente,
    nombreListado(paciente),
    tipo === 'receta' ? 'Recetas' : 'Consultas'
  )

  const etiqueta = tipo === 'receta' ? 'Receta' : 'Consulta'
  // La hora en el nombre evita que dos documentos del mismo dia se pisen.
  const hora = new Date().toTimeString().slice(0, 8).replace(/:/g, '')
  const ruta = join(carpeta, `${consulta.fecha} ${etiqueta} ${hora}.pdf`)

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
