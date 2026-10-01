import { BrowserWindow, dialog, shell } from 'electron'
import { copyFileSync, existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { nombreCarpetaSeguro, subcarpetaPaciente } from '../db/rutas'
import { nombreListado } from '@shared/lib/paciente'
import { hoyIso } from '@shared/lib/fecha'
import { auditar } from '../audit/auditoria'
import { exigirPermiso, sesionActual } from '../security/sesion'
import { configuracion } from '../repositories/sistema'
import * as repo from '../repositories/expediente'
import * as pacientesRepo from '../repositories/paciente'
import { htmlIncapacidad, htmlReferencia } from '../pdf/documentos'
import { generarPdf, registrar } from './documentos'
import type {
  Adjunto,
  AdjuntoInput,
  CategoriaExamen,
  Incapacidad,
  IncapacidadInput,
  MedicacionCronica,
  MedicacionCronicaInput,
  Referencia,
  ReferenciaInput
} from '@shared/types'

/**
 * Estudios y documentos del expediente: los archivos que el paciente trae
 * (laboratorios, radiografias), las constancias de incapacidad, las referencias
 * a especialista y la medicacion permanente.
 */

/** Nada de ejecutables ni scripts: al expediente solo entran documentos e imagenes. */
const EXTENSIONES_PERMITIDAS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.tif',
  '.tiff',
  '.doc',
  '.docx',
  '.txt'
])

/** 40 MB por archivo: una placa digitalizada cabe de sobra y la base no se dispara. */
const TAMANO_MAXIMO = 40 * 1024 * 1024

function usuarioId(): number | null {
  return sesionActual()?.usuarioId ?? null
}

// ===== Adjuntos =====

/**
 * Deja al usuario elegir los archivos. Devuelve solo las rutas: la copia al
 * expediente ocurre al guardar, cuando ya se sabe a que paciente pertenecen.
 */
export async function elegirArchivos(): Promise<
  { ruta: string; nombre: string; tamanoBytes: number }[]
> {
  exigirPermiso('expediente.adjuntar')
  const ventana = BrowserWindow.getFocusedWindow()
  const opciones: Electron.OpenDialogOptions = {
    title: 'Seleccione los resultados o imágenes que desea agregar al expediente',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Documentos e imágenes', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'doc', 'docx', 'txt'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ]
  }
  const seleccion = ventana
    ? await dialog.showOpenDialog(ventana, opciones)
    : await dialog.showOpenDialog(opciones)
  if (seleccion.canceled) return []

  return seleccion.filePaths.map((ruta) => ({
    ruta,
    nombre: basename(ruta),
    tamanoBytes: existsSync(ruta) ? statSync(ruta).size : 0
  }))
}

/**
 * Copia el archivo dentro de la carpeta del paciente y lo registra. Se copia y
 * no se enlaza a proposito: el expediente no puede depender de un archivo que
 * el usuario mueva o borre, y los respaldos deben llevarselo.
 */
export function agregarAdjunto(input: AdjuntoInput, rutaOrigen: string): number {
  exigirPermiso('expediente.adjuntar')

  if (!existsSync(rutaOrigen)) throw new Error('El archivo seleccionado ya no existe')

  const extension = extname(rutaOrigen).toLowerCase()
  if (!EXTENSIONES_PERMITIDAS.has(extension)) {
    throw new Error(
      `No se pueden adjuntar archivos ${extension || 'sin extensión'}. Use PDF, imágenes o documentos de texto.`
    )
  }

  const tamanoBytes = statSync(rutaOrigen).size
  if (tamanoBytes > TAMANO_MAXIMO) {
    throw new Error('El archivo supera los 40 MB. Reduzca su tamaño antes de adjuntarlo.')
  }

  const paciente = pacientesRepo.obtener(input.pacienteId)
  if (!paciente) throw new Error('El paciente no existe')

  const carpeta = subcarpetaPaciente(
    paciente.numeroExpediente,
    nombreListado(paciente),
    'Examenes'
  )
  const fecha = input.fechaEstudio ?? hoyIso()
  // El identificador corto evita que dos estudios con el mismo titulo y fecha
  // se sobrescriban entre si.
  const destino = join(
    carpeta,
    `${fecha} ${nombreCarpetaSeguro(input.titulo)} ${randomUUID().slice(0, 8)}${extension}`
  )
  copyFileSync(rutaOrigen, destino)

  const id = repo.crearAdjunto(
    input,
    {
      ruta: destino,
      nombreOriginal: basename(rutaOrigen),
      extension,
      tamanoBytes
    },
    usuarioId()
  )

  auditar({
    accion: 'adjunto.agregado',
    entidad: 'paciente',
    entidadId: input.pacienteId,
    detalle: `${input.categoria} · ${input.titulo} · ${basename(rutaOrigen)}`
  })
  return id
}

export function adjuntosDePaciente(pacienteId: number): Adjunto[] {
  exigirPermiso('pacientes.ver_clinico')
  return repo.adjuntosDePaciente(pacienteId)
}

export function adjuntosDeConsulta(consultaId: number): Adjunto[] {
  exigirPermiso('pacientes.ver_clinico')
  return repo.adjuntosDeConsulta(consultaId)
}

export function actualizarAdjunto(
  id: number,
  datos: {
    titulo: string
    descripcion: string | null
    categoria: CategoriaExamen
    fechaEstudio: string | null
  }
): void {
  exigirPermiso('expediente.adjuntar')
  repo.actualizarAdjunto(id, datos)
  auditar({ accion: 'adjunto.editado', entidad: 'adjunto', entidadId: id, detalle: datos.titulo })
}

/** Borra el registro y tambien la copia en disco: no deja archivos huerfanos. */
export function eliminarAdjunto(id: number): void {
  exigirPermiso('expediente.adjuntar')
  const adjunto = repo.obtenerAdjunto(id)
  if (!adjunto) throw new Error('El archivo no existe')

  repo.eliminarAdjunto(id)
  try {
    if (existsSync(adjunto.ruta)) unlinkSync(adjunto.ruta)
  } catch (error) {
    console.error('No se pudo borrar el archivo del adjunto:', error)
  }

  auditar({
    accion: 'adjunto.eliminado',
    entidad: 'paciente',
    entidadId: adjunto.pacienteId,
    detalle: `${adjunto.titulo} · ${adjunto.nombreOriginal}`
  })
}

export async function abrirAdjunto(id: number): Promise<void> {
  exigirPermiso('pacientes.ver_clinico')
  const adjunto = repo.obtenerAdjunto(id)
  if (!adjunto) throw new Error('El archivo no existe')
  const error = await shell.openPath(adjunto.ruta)
  if (error) throw new Error(`No se pudo abrir el archivo: ${error}`)
}

/**
 * Contenido de una imagen adjunta para mostrarla dentro del programa. Se
 * devuelve como data URL porque la ventana no tiene acceso al disco.
 */
export function contenidoDeImagen(id: number): string {
  exigirPermiso('pacientes.ver_clinico')
  const adjunto = repo.obtenerAdjunto(id)
  if (!adjunto) throw new Error('El archivo no existe')
  if (!adjunto.esImagen) throw new Error('El archivo no es una imagen')
  if (!existsSync(adjunto.ruta)) throw new Error('El archivo ya no está en su carpeta')

  const tipos: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp'
  }
  const tipo = tipos[adjunto.extension ?? ''] ?? 'application/octet-stream'
  return `data:${tipo};base64,${readFileSync(adjunto.ruta).toString('base64')}`
}

// ===== Incapacidades =====

export async function crearIncapacidad(input: IncapacidadInput): Promise<Incapacidad> {
  exigirPermiso('documentos.incapacidad')

  if (input.dias < 1 || input.dias > 365) {
    throw new Error('Los días de incapacidad deben estar entre 1 y 365')
  }
  if (!input.motivo.trim()) throw new Error('Escriba el motivo de la incapacidad')

  const id = repo.crearIncapacidad(input, usuarioId())
  const incapacidad = repo.obtenerIncapacidad(id)
  if (!incapacidad) throw new Error('No se pudo crear la incapacidad')

  auditar({
    accion: 'incapacidad.creada',
    entidad: 'paciente',
    entidadId: input.pacienteId,
    detalle: `${incapacidad.folio} · ${incapacidad.dias} días desde ${incapacidad.desde}`
  })

  await generarPdfIncapacidad(incapacidad)
  return repo.obtenerIncapacidad(id) as Incapacidad
}

async function generarPdfIncapacidad(incapacidad: Incapacidad): Promise<string> {
  const expediente = pacientesRepo.expedienteResumen(incapacidad.pacienteId)
  if (!expediente) throw new Error('El paciente no existe')

  const pdf = await generarPdf(htmlIncapacidad(configuracion(), expediente, incapacidad), 'carta')
  const carpeta = subcarpetaPaciente(
    expediente.paciente.numeroExpediente,
    nombreListado(expediente.paciente),
    'Documentos'
  )
  const ruta = join(carpeta, `${incapacidad.fechaEmision} Incapacidad ${incapacidad.folio}.pdf`)
  writeFileSync(ruta, pdf)

  repo.guardarArchivoIncapacidad(incapacidad.id, ruta)
  registrar(incapacidad.pacienteId, incapacidad.consultaId, 'incapacidad', ruta)
  return ruta
}

export function incapacidadesDePaciente(pacienteId: number): Incapacidad[] {
  exigirPermiso('pacientes.ver_clinico')
  return repo.incapacidadesDePaciente(pacienteId)
}

/** Reimprime la constancia tal como quedo guardada, sin volver a numerarla. */
export async function imprimirIncapacidad(id: number): Promise<string> {
  exigirPermiso('documentos.incapacidad')
  const incapacidad = repo.obtenerIncapacidad(id)
  if (!incapacidad) throw new Error('La incapacidad no existe')
  return generarPdfIncapacidad(incapacidad)
}

export async function anularIncapacidad(id: number, motivo: string): Promise<void> {
  exigirPermiso('documentos.incapacidad')
  if (!motivo.trim()) throw new Error('Escriba el motivo de la anulación')

  repo.anularIncapacidad(id, motivo.trim())
  const incapacidad = repo.obtenerIncapacidad(id)
  if (incapacidad) {
    auditar({
      accion: 'incapacidad.anulada',
      entidad: 'paciente',
      entidadId: incapacidad.pacienteId,
      detalle: `${incapacidad.folio} · ${motivo.trim()}`
    })
    // La copia impresa se regenera con el sello de anulada, para que la que
    // quede archivada no se confunda con una vigente.
    await generarPdfIncapacidad(incapacidad)
  }
}

// ===== Referencias =====

export async function crearReferencia(input: ReferenciaInput): Promise<Referencia> {
  exigirPermiso('documentos.referencia')

  if (!input.dirigidaA.trim()) throw new Error('Escriba a quién va dirigida la referencia')
  if (!input.motivo.trim()) throw new Error('Escriba el motivo de la referencia')

  const id = repo.crearReferencia(input, usuarioId())
  const referencia = repo.obtenerReferencia(id)
  if (!referencia) throw new Error('No se pudo crear la referencia')

  auditar({
    accion: 'referencia.creada',
    entidad: 'paciente',
    entidadId: input.pacienteId,
    detalle: `${referencia.folio} · ${referencia.dirigidaA}`
  })

  await generarPdfReferencia(referencia)
  return repo.obtenerReferencia(id) as Referencia
}

async function generarPdfReferencia(referencia: Referencia): Promise<string> {
  const expediente = pacientesRepo.expedienteResumen(referencia.pacienteId)
  if (!expediente) throw new Error('El paciente no existe')

  const pdf = await generarPdf(htmlReferencia(configuracion(), expediente, referencia), 'carta')
  const carpeta = subcarpetaPaciente(
    expediente.paciente.numeroExpediente,
    nombreListado(expediente.paciente),
    'Documentos'
  )
  const ruta = join(carpeta, `${referencia.fecha} Referencia ${referencia.folio}.pdf`)
  writeFileSync(ruta, pdf)

  repo.guardarArchivoReferencia(referencia.id, ruta)
  registrar(referencia.pacienteId, referencia.consultaId, 'referencia', ruta)
  return ruta
}

export function referenciasDePaciente(pacienteId: number): Referencia[] {
  exigirPermiso('pacientes.ver_clinico')
  return repo.referenciasDePaciente(pacienteId)
}

export async function imprimirReferencia(id: number): Promise<string> {
  exigirPermiso('documentos.referencia')
  const referencia = repo.obtenerReferencia(id)
  if (!referencia) throw new Error('La referencia no existe')
  return generarPdfReferencia(referencia)
}

export async function anularReferencia(id: number, motivo: string): Promise<void> {
  exigirPermiso('documentos.referencia')
  if (!motivo.trim()) throw new Error('Escriba el motivo de la anulación')

  repo.anularReferencia(id, motivo.trim())
  const referencia = repo.obtenerReferencia(id)
  if (referencia) {
    auditar({
      accion: 'referencia.anulada',
      entidad: 'paciente',
      entidadId: referencia.pacienteId,
      detalle: `${referencia.folio} · ${motivo.trim()}`
    })
    await generarPdfReferencia(referencia)
  }
}

// ===== Medicacion permanente =====

export function medicacionCronica(pacienteId: number): MedicacionCronica[] {
  exigirPermiso('pacientes.ver_clinico')
  return repo.medicacionCronica(pacienteId, false)
}

export function agregarMedicacionCronica(input: MedicacionCronicaInput): number {
  exigirPermiso('pacientes.editar_clinico')
  if (!input.nombre.trim()) throw new Error('Escriba el nombre del medicamento')
  if (!input.dosis.trim() || !input.frecuencia.trim()) {
    throw new Error('La dosis y la frecuencia son obligatorias')
  }

  const id = repo.crearMedicacionCronica(input)
  auditar({
    accion: 'medicacion_cronica.agregada',
    entidad: 'paciente',
    entidadId: input.pacienteId,
    detalle: `${input.nombre} ${input.concentracion ?? ''} · ${input.dosis} ${input.frecuencia}`.trim()
  })
  return id
}

export function suspenderMedicacionCronica(id: number, activa: boolean): void {
  exigirPermiso('pacientes.editar_clinico')
  repo.suspenderMedicacionCronica(id, activa)
  auditar({
    accion: activa ? 'medicacion_cronica.reactivada' : 'medicacion_cronica.suspendida',
    entidad: 'medicacion_cronica',
    entidadId: id
  })
}

export function eliminarMedicacionCronica(id: number): void {
  exigirPermiso('pacientes.editar_clinico')
  repo.eliminarMedicacionCronica(id)
  auditar({ accion: 'medicacion_cronica.eliminada', entidad: 'medicacion_cronica', entidadId: id })
}
