import {
  generarCodigoRecuperacion,
  hashearSecreto,
  normalizarCodigo,
  verificarSecreto
} from '../security/hash'
import { cerrarSesion, iniciarSesion, sesionActual } from '../security/sesion'
import { auditar } from '../audit/auditoria'
import * as sistema from '../repositories/sistema'
import { guardarConfiguracion } from '../repositories/sistema'
import type { EstadoAuth } from '@shared/types'

/**
 * Bloqueo progresivo tras 5 fallos: 1, 2, 4, 8 y 15 minutos como tope.
 * Frena la fuerza bruta sin dejar al doctor fuera del sistema de forma indefinida.
 */
const INTENTOS_ANTES_DE_BLOQUEAR = 5
const MINUTOS_DE_BLOQUEO = [1, 2, 4, 8, 15]

function minutosDeBloqueo(intentosFallidos: number): number {
  const excedente = intentosFallidos - INTENTOS_ANTES_DE_BLOQUEAR
  if (excedente < 0) return 0
  return MINUTOS_DE_BLOQUEO[Math.min(excedente, MINUTOS_DE_BLOQUEO.length - 1)]
}

function bloqueoVigente(bloqueadoHasta: string | null): boolean {
  return bloqueadoHasta !== null && new Date(bloqueadoHasta).getTime() > Date.now()
}

export function estado(): EstadoAuth {
  const usuario = sistema.usuarioPrincipal()
  const sesion = sesionActual()
  return {
    instalado: usuario !== null,
    autenticado: sesion !== null,
    sesion,
    bloqueadoHasta:
      usuario && bloqueoVigente(usuario.bloqueado_hasta) ? usuario.bloqueado_hasta : null
  }
}

export interface ResultadoInstalacion {
  codigoRecuperacion: string
}

/**
 * Alta inicial del doctor. El codigo de recuperacion se devuelve UNA sola vez:
 * al ser una aplicacion sin servidor ni correo, no existe forma de reemitirlo.
 */
export async function instalar(datos: {
  nombreDoctor: string
  nombreClinica: string
  password: string
}): Promise<ResultadoInstalacion> {
  if (sistema.usuarioPrincipal()) {
    throw new Error('El sistema ya fue configurado')
  }
  if (datos.password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres')
  }

  const codigoRecuperacion = generarCodigoRecuperacion()
  const [passwordHash, recuperacionHash] = await Promise.all([
    hashearSecreto(datos.password),
    hashearSecreto(normalizarCodigo(codigoRecuperacion))
  ])

  const id = sistema.crearUsuario({
    nombre: datos.nombreDoctor,
    passwordHash,
    recuperacionHash
  })

  guardarConfiguracion({
    nombreClinica: datos.nombreClinica,
    direccion: null,
    telefono: null,
    logoDataUrl: null,
    nombreDoctor: datos.nombreDoctor,
    especialidad: 'Medicina General',
    tema: 'claro',
    tamanoFuente: 'normal'
  })

  iniciarSesion({ usuarioId: id, nombre: datos.nombreDoctor })
  auditar({ accion: 'sesion.inicio', entidad: 'usuario', entidadId: id, detalle: 'instalación' })

  return { codigoRecuperacion }
}

export class ErrorBloqueado extends Error {
  readonly codigo = 'BLOQUEADO'
  constructor(readonly hasta: string) {
    const segundos = Math.max(1, Math.ceil((new Date(hasta).getTime() - Date.now()) / 1000))
    const minutos = Math.ceil(segundos / 60)
    super(
      `Demasiados intentos fallidos. Vuelva a intentar en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`
    )
  }
}

export async function entrar(password: string): Promise<void> {
  const usuario = sistema.usuarioPrincipal()
  if (!usuario) throw new Error('El sistema aún no ha sido configurado')

  if (bloqueoVigente(usuario.bloqueado_hasta)) {
    throw new ErrorBloqueado(usuario.bloqueado_hasta as string)
  }

  const correcta = await verificarSecreto(usuario.password_hash, password)

  if (!correcta) {
    const intentos = usuario.intentos_fallidos + 1
    const minutos = minutosDeBloqueo(intentos)
    const bloqueadoHasta =
      minutos > 0 ? new Date(Date.now() + minutos * 60_000).toISOString() : null
    sistema.registrarIntentoFallido(usuario.id, bloqueadoHasta)
    auditar({
      accion: 'sesion.inicio_fallido',
      entidad: 'usuario',
      entidadId: usuario.id,
      detalle: `intento ${intentos}`
    })
    if (bloqueadoHasta) throw new ErrorBloqueado(bloqueadoHasta)
    throw new Error('Contraseña incorrecta')
  }

  sistema.limpiarIntentos(usuario.id)
  iniciarSesion({ usuarioId: usuario.id, nombre: usuario.nombre })
  auditar({ accion: 'sesion.inicio', entidad: 'usuario', entidadId: usuario.id })
}

export function salir(): void {
  const sesion = sesionActual()
  if (sesion) {
    auditar({ accion: 'sesion.cierre', entidad: 'usuario', entidadId: sesion.usuarioId })
  }
  cerrarSesion()
}

export async function cambiarPassword(actual: string, nueva: string): Promise<void> {
  const usuario = sistema.usuarioPrincipal()
  if (!usuario) throw new Error('El sistema aún no ha sido configurado')
  if (nueva.length < 8) throw new Error('La nueva contraseña debe tener al menos 8 caracteres')

  const correcta = await verificarSecreto(usuario.password_hash, actual)
  if (!correcta) throw new Error('La contraseña actual no es correcta')

  sistema.actualizarPassword(usuario.id, await hashearSecreto(nueva))
  auditar({ accion: 'sesion.password_cambiada', entidad: 'usuario', entidadId: usuario.id })
}

/**
 * Unica via de recuperacion posible sin servidor: el codigo emitido al instalar.
 * Es de un solo uso; despues de gastarlo se emite uno nuevo.
 */
export async function recuperarConCodigo(
  codigo: string,
  nuevaPassword: string
): Promise<ResultadoInstalacion> {
  const usuario = sistema.usuarioPrincipal()
  if (!usuario) throw new Error('El sistema aún no ha sido configurado')
  if (!usuario.recuperacion_hash || usuario.recuperacion_usada === 1) {
    throw new Error('No hay un código de recuperación disponible')
  }
  if (nuevaPassword.length < 8) {
    throw new Error('La nueva contraseña debe tener al menos 8 caracteres')
  }

  const valido = await verificarSecreto(usuario.recuperacion_hash, normalizarCodigo(codigo))
  if (!valido) throw new Error('El código de recuperación no es válido')

  const nuevoCodigo = generarCodigoRecuperacion()
  const [passwordHash, recuperacionHash] = await Promise.all([
    hashearSecreto(nuevaPassword),
    hashearSecreto(normalizarCodigo(nuevoCodigo))
  ])

  sistema.actualizarPassword(usuario.id, passwordHash)
  sistema.reemplazarCodigoRecuperacion(usuario.id, recuperacionHash)
  auditar({
    accion: 'sesion.password_cambiada',
    entidad: 'usuario',
    entidadId: usuario.id,
    detalle: 'recuperación con código'
  })

  return { codigoRecuperacion: nuevoCodigo }
}
