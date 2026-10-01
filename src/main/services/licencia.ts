import { createHmac, createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { hostname, userInfo } from 'node:os'
import { join } from 'node:path'
import { directorioDatos } from '../db/rutas'
import type { EstadoLicencia } from '@shared/types'

/**
 * Periodo de prueba y activacion por equipo.
 *
 * El mismo instalador sirve para todas las computadoras: al primer arranque
 * empieza una prueba de 24 horas y, cuando se agota, la aplicacion deja de
 * responder hasta que se escribe el codigo de activacion que corresponde a ese
 * equipo. El codigo se calcula a partir del identificador del equipo, asi que
 * uno entregado a una clinica no sirve en otra.
 */

/**
 * Semilla con la que se firman los codigos de activacion. La inyecta
 * electron-vite al compilar desde publicador/semilla.txt, que esta fuera de
 * git: este repositorio es publico. Cambiarla invalida todos los codigos
 * entregados hasta ahora, incluidos los ya usados.
 */
declare const __SEMILLA_ACTIVACION__: string
const SEMILLA_ACTIVACION = __SEMILLA_ACTIVACION__

const DURACION_PRUEBA_MS = 24 * 60 * 60 * 1000

/**
 * Prorrogas que se pueden conceder sin activar el programa del todo: sirven
 * para dejar que la clinica siga evaluando unos dias mas. Cada duracion tiene
 * su propio codigo, distinto del de activacion definitiva.
 */
export const DURACIONES_PRORROGA = [7, 15, 30] as const

/** Margen de tolerancia antes de considerar que el reloj se movio hacia atras. */
const TOLERANCIA_RELOJ_MS = 10 * 60 * 1000

/** Cada cuanto se refresca la marca de vida en disco. */
const INTERVALO_MARCA_MS = 5 * 60 * 1000

/**
 * Clave del registro donde vive la copia del estado. El banco de pruebas la
 * redirige con DMEDIC_CLAVE_REGISTRO para no tocar la activacion real del
 * equipo donde se ejecuta; en la aplicacion instalada siempre es la de abajo.
 */
const CLAVE_REGISTRO = process.env.DMEDIC_CLAVE_REGISTRO || 'HKCU\\Software\\DMedic'
const VALOR_REGISTRO = 'Instalacion'

interface EstadoGuardado {
  /** Primer arranque de la aplicacion en este equipo. */
  inicio: string
  /** Ultima vez que se vio la aplicacion abierta, para detectar relojes movidos. */
  ultimoVisto: string
  /** Codigo aceptado. Mientras sea valido para este equipo, no hay bloqueo. */
  codigo: string | null
  /** Codigo de prorroga ya usado. Guardarlo impide reutilizarlo para sumar dias. */
  prorrogaCodigo: string | null
  /** Momento en que se concedio la prorroga y cuantos dias concedio. */
  prorrogaDesde: string | null
  prorrogaDias: number
  /** Se atraso el reloj para alargar la prueba: la prueba se da por terminada. */
  manipulado: boolean
}

let memoria: EstadoGuardado | null = null

/**
 * Descarta el estado que se tiene en memoria para volver a leerlo del disco y
 * del registro. La aplicacion no lo necesita —es la unica que escribe ahi—,
 * pero el banco de pruebas si, para poder simular varios equipos seguidos.
 */
export function olvidarEstadoEnMemoria(): void {
  memoria = null
}

// ===== Identificador del equipo =====

/**
 * Windows guarda un identificador propio de la instalacion del sistema que
 * sobrevive a reinstalar la aplicacion y a borrar sus datos. Es lo que ata un
 * codigo de activacion a una computadora concreta.
 */
function huellaDelEquipo(): string {
  try {
    const salida = execFileSync(
      'reg',
      ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid', '/reg:64'],
      { encoding: 'utf8', windowsHide: true, timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }
    )
    const guid = salida.match(/MachineGuid\s+REG_SZ\s+(\S+)/i)
    if (guid) return guid[1].toLowerCase()
  } catch {
    // Sin registro disponible se usa un dato mas debil, pero estable en la
    // practica: la aplicacion nunca debe quedar sin forma de activarse.
  }
  return `${hostname()}::${userInfo().username}`.toLowerCase()
}

/** Lo que se le lee por telefono o se manda por WhatsApp: 3 grupos de 4. */
export function idEquipo(): string {
  const resumen = createHash('sha256').update(huellaDelEquipo()).digest('hex').toUpperCase()
  return `${resumen.slice(0, 4)}-${resumen.slice(4, 8)}-${resumen.slice(8, 12)}`
}

/**
 * Codigo que desbloquea este equipo y solo este: 4 grupos de 4.
 *
 * Con `dias` en 0 el codigo activa el programa para siempre. Con 7, 15 o 30
 * concede esa cantidad de dias de prueba adicionales y nada mas; cada duracion
 * produce un codigo distinto, y ninguno sirve en otra computadora.
 */
export function codigoPara(id: string, dias = 0): string {
  const base = id.trim().toUpperCase()
  const mensaje = dias > 0 ? `${base}::${dias}d` : base
  const firma = createHmac('sha256', SEMILLA_ACTIVACION).update(mensaje).digest('hex').toUpperCase()
  return (firma.match(/.{4}/g) as string[]).slice(0, 4).join('-')
}

function normalizar(codigo: string): string {
  return codigo.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
}

function codigoEsValido(codigo: string | null): boolean {
  if (!codigo) return false
  return normalizar(codigo) === normalizar(codigoPara(idEquipo()))
}

/** Dias que concede el codigo, o 0 si no es un codigo de prorroga de este equipo. */
function diasDeProrroga(codigo: string): number {
  const escrito = normalizar(codigo)
  const id = idEquipo()
  for (const dias of DURACIONES_PRORROGA) {
    if (escrito === normalizar(codigoPara(id, dias))) return dias
  }
  return 0
}

// ===== Persistencia =====

function rutaEstado(): string {
  return join(directorioDatos(), 'licencia.json')
}

function leerArchivo(): Partial<EstadoGuardado> | null {
  try {
    if (!existsSync(rutaEstado())) return null
    return JSON.parse(readFileSync(rutaEstado(), 'utf8')) as Partial<EstadoGuardado>
  } catch {
    return null
  }
}

/**
 * Copia del estado en el registro de Windows. Borrar la carpeta de datos de la
 * aplicacion no reinicia la prueba, y tampoco obliga a volver a activar un
 * equipo que ya se activo.
 */
function leerRegistro(): Partial<EstadoGuardado> | null {
  try {
    const salida = execFileSync(
      'reg',
      ['query', CLAVE_REGISTRO, '/v', VALOR_REGISTRO],
      // Al primer arranque la clave no existe todavia y "reg" escribe en stderr:
      // no es un fallo, asi que no debe ensuciar el registro de la aplicacion.
      { encoding: 'utf8', windowsHide: true, timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }
    )
    const valor = salida.match(new RegExp(`${VALOR_REGISTRO}\\s+REG_SZ\\s+(\\S+)`, 'i'))
    if (!valor) return null
    return JSON.parse(Buffer.from(valor[1], 'base64').toString('utf8')) as Partial<EstadoGuardado>
  } catch {
    return null
  }
}

function escribirRegistro(estado: EstadoGuardado): void {
  try {
    const valor = Buffer.from(JSON.stringify(estado), 'utf8').toString('base64')
    execFileSync('reg', ['add', CLAVE_REGISTRO, '/v', VALOR_REGISTRO, '/t', 'REG_SZ', '/d', valor, '/f'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore']
    })
  } catch {
    // El archivo sigue siendo la fuente principal: no poder escribir en el
    // registro no puede impedir que la aplicacion funcione.
  }
}

function guardar(estado: EstadoGuardado): void {
  memoria = estado
  try {
    writeFileSync(rutaEstado(), JSON.stringify(estado, null, 2), 'utf8')
  } catch (error) {
    console.error('No se pudo guardar el estado de licencia:', error)
  }
  escribirRegistro(estado)
}

/** Combina archivo y registro quedandose siempre con lo mas restrictivo. */
function cargar(): EstadoGuardado {
  if (memoria) return memoria

  const ahora = new Date()
  const fuentes = [leerArchivo(), leerRegistro()].filter(Boolean) as Partial<EstadoGuardado>[]

  const inicios = fuentes
    .map((f) => f.inicio)
    .filter((v): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v)))
  const vistos = fuentes
    .map((f) => f.ultimoVisto)
    .filter((v): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v)))

  const estado: EstadoGuardado = {
    // El arranque mas antiguo manda: reinstalar no regala otras 24 horas.
    inicio: inicios.length ? inicios.sort()[0] : ahora.toISOString(),
    // Y la marca mas reciente tambien: borrar un archivo no borra el rastro.
    ultimoVisto: vistos.length ? vistos.sort().at(-1) as string : ahora.toISOString(),
    codigo: fuentes.map((f) => f.codigo).find((c) => typeof c === 'string') ?? null,
    prorrogaCodigo: fuentes.map((f) => f.prorrogaCodigo).find((c) => typeof c === 'string') ?? null,
    // De haber dos, vale la prorroga que empezo antes: reinstalar no la reinicia.
    prorrogaDesde:
      fuentes
        .map((f) => f.prorrogaDesde)
        .filter((v): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v)))
        .sort()[0] ?? null,
    prorrogaDias: Math.max(0, ...fuentes.map((f) => (typeof f.prorrogaDias === 'number' ? f.prorrogaDias : 0))),
    manipulado: fuentes.some((f) => f.manipulado === true)
  }

  memoria = estado
  if (fuentes.length < 2) guardar(estado)
  return estado
}

/**
 * Marca de vida. Si el reloj del equipo aparece antes de la ultima vez que se
 * vio la aplicacion, se atraso a proposito y la prueba se da por consumida.
 */
function latir(): EstadoGuardado {
  const estado = cargar()
  const ahora = Date.now()
  const visto = Date.parse(estado.ultimoVisto)

  if (!estado.manipulado && ahora < visto - TOLERANCIA_RELOJ_MS) {
    guardar({ ...estado, manipulado: true, ultimoVisto: new Date(ahora).toISOString() })
    return memoria as EstadoGuardado
  }

  // La marca solo se reescribe cada tanto: la pantalla pregunta cada minuto y
  // no tiene sentido tocar disco y registro en cada consulta.
  if (ahora > visto + INTERVALO_MARCA_MS) {
    guardar({ ...estado, ultimoVisto: new Date(ahora).toISOString() })
    return memoria as EstadoGuardado
  }
  return estado
}

// ===== Consulta =====

/**
 * Momento en que se agota la prueba. Una prorroga concedida sustituye a las 24
 * horas iniciales; nunca las acorta, porque siempre se concede hacia adelante.
 */
function finDePrueba(guardado: EstadoGuardado): number {
  if (guardado.prorrogaDesde && guardado.prorrogaDias > 0) {
    return Date.parse(guardado.prorrogaDesde) + guardado.prorrogaDias * DURACION_PRUEBA_MS
  }
  return Date.parse(guardado.inicio) + DURACION_PRUEBA_MS
}

export function estado(): EstadoLicencia {
  const guardado = latir()

  if (codigoEsValido(guardado.codigo)) {
    return {
      activado: true,
      bloqueado: false,
      restanteMs: 0,
      expiraEn: null,
      idEquipo: idEquipo(),
      diasProrroga: 0
    }
  }

  const fin = finDePrueba(guardado)
  const restante = guardado.manipulado ? 0 : Math.max(0, fin - Date.now())

  return {
    activado: false,
    bloqueado: restante <= 0,
    restanteMs: restante,
    expiraEn: new Date(fin).toISOString(),
    idEquipo: idEquipo(),
    diasProrroga: guardado.prorrogaDias
  }
}

/** Atajo sin efectos de escritura, para las comprobaciones de cada canal IPC. */
export function estaBloqueado(): boolean {
  const guardado = cargar()
  if (codigoEsValido(guardado.codigo)) return false
  if (guardado.manipulado) return true
  return Date.now() >= finDePrueba(guardado)
}

export function estaActivado(): boolean {
  return codigoEsValido(cargar().codigo)
}

function rechazar(mensaje: string, codigoError: string): never {
  const error = new Error(mensaje) as Error & { codigo?: string }
  error.codigo = codigoError
  throw error
}

export function activar(codigo: string): EstadoLicencia {
  const guardado = cargar()

  // Activacion definitiva: el equipo queda desbloqueado para siempre.
  if (codigoEsValido(codigo)) {
    guardar({ ...guardado, codigo: normalizar(codigo), manipulado: false })
    return estado()
  }

  // Prorroga: concede dias de prueba adicionales, sin activar el programa.
  const dias = diasDeProrroga(codigo)
  if (dias > 0) {
    if (guardado.prorrogaCodigo === normalizar(codigo)) {
      rechazar(
        `Ese código de ${dias} días ya se usó en esta computadora. Solicite uno nuevo.`,
        'PRORROGA_USADA'
      )
    }
    guardar({
      ...guardado,
      prorrogaCodigo: normalizar(codigo),
      prorrogaDesde: new Date().toISOString(),
      prorrogaDias: dias,
      manipulado: false
    })
    return estado()
  }

  return rechazar(
    'El código no corresponde a esta computadora. Verifique que sea el que se generó con el ID de equipo que aparece en pantalla.',
    'CODIGO_INVALIDO'
  )
}
