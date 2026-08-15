import {
  generarCodigoRecuperacion,
  hashearSecreto,
  normalizarCodigo,
  verificarSecreto
} from '../security/hash'
import {
  cerrarSesion,
  exigirPermiso,
  exigirSesion,
  iniciarSesion,
  permisosDeLaSesion,
  sesionActual
} from '../security/sesion'
import { auditar } from '../audit/auditoria'
import * as sistema from '../repositories/sistema'
import { guardarConfiguracion } from '../repositories/sistema'
import type { EstadoAuth, Rol, Sesion, Usuario, UsuarioInput, UsuarioParaAcceso } from '@shared/types'

/**
 * Bloqueo progresivo tras 5 fallos: 1, 2, 4, 8 y 15 minutos como tope.
 * Es por usuario: bloquear a un doctor no deja fuera a los demas.
 */
const INTENTOS_ANTES_DE_BLOQUEAR = 5
const MINUTOS_DE_BLOQUEO = [1, 2, 4, 8, 15]
const LARGO_MINIMO_PASSWORD = 8

function minutosDeBloqueo(intentosFallidos: number): number {
  const excedente = intentosFallidos - INTENTOS_ANTES_DE_BLOQUEAR
  if (excedente < 0) return 0
  return MINUTOS_DE_BLOQUEO[Math.min(excedente, MINUTOS_DE_BLOQUEO.length - 1)]
}

function bloqueoVigente(bloqueadoHasta: string | null): boolean {
  return bloqueadoHasta !== null && new Date(bloqueadoHasta).getTime() > Date.now()
}

function aSesion(usuario: sistema.FilaUsuario): Sesion {
  return {
    usuarioId: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
    esAdministrador: usuario.es_administrador === 1,
    debeCambiarPassword: usuario.debe_cambiar_password === 1
  }
}

function usuariosParaAcceso(): UsuarioParaAcceso[] {
  return sistema
    .listarUsuarios(true)
    .map((u) => {
      const fila = sistema.usuarioPorId(u.id)
      return {
        id: u.id,
        nombre: u.nombre,
        rol: u.rol,
        bloqueadoHasta:
          fila && bloqueoVigente(fila.bloqueado_hasta) ? fila.bloqueado_hasta : null
      }
    })
}

export function estado(): EstadoAuth {
  const instalado = sistema.existeAlgunUsuario()
  const sesion = sesionActual()
  return {
    instalado,
    autenticado: sesion !== null,
    sesion,
    permisos: permisosDeLaSesion(),
    usuarios: instalado ? usuariosParaAcceso() : []
  }
}

export interface ResultadoInstalacion {
  codigoRecuperacion: string
}

/**
 * Alta inicial. El primer usuario siempre es doctor y administrador: alguien
 * tiene que poder crear al resto del equipo.
 */
export async function instalar(datos: {
  nombreDoctor: string
  nombreClinica: string
  password: string
}): Promise<ResultadoInstalacion> {
  if (sistema.existeAlgunUsuario()) throw new Error('El sistema ya fue configurado')
  if (datos.password.length < LARGO_MINIMO_PASSWORD) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`)
  }

  const codigoRecuperacion = generarCodigoRecuperacion()
  const [passwordHash, recuperacionHash] = await Promise.all([
    hashearSecreto(datos.password),
    hashearSecreto(normalizarCodigo(codigoRecuperacion))
  ])

  const id = sistema.crearUsuario({
    nombre: datos.nombreDoctor,
    passwordHash,
    recuperacionHash,
    rol: 'doctor',
    esAdministrador: true,
    debeCambiarPassword: false
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

  const usuario = sistema.usuarioPorId(id)
  if (usuario) iniciarSesion(aSesion(usuario))
  auditar({ accion: 'sesion.inicio', entidad: 'usuario', entidadId: id, detalle: 'instalación' })

  return { codigoRecuperacion }
}

export class ErrorBloqueado extends Error {
  readonly codigo = 'BLOQUEADO'
  constructor(readonly hasta: string) {
    const minutos = Math.max(
      1,
      Math.ceil((new Date(hasta).getTime() - Date.now()) / 60_000)
    )
    super(
      `Demasiados intentos fallidos. Vuelva a intentar en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.`
    )
  }
}

export async function entrar(usuarioId: number, password: string): Promise<void> {
  const usuario = sistema.usuarioPorId(usuarioId)
  if (!usuario) throw new Error('El usuario no existe')
  if (usuario.activo !== 1) throw new Error('Este usuario está desactivado')

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
      detalle: `${usuario.nombre} · intento ${intentos}`
    })
    if (bloqueadoHasta) throw new ErrorBloqueado(bloqueadoHasta)
    throw new Error('Contraseña incorrecta')
  }

  sistema.limpiarIntentos(usuario.id)
  iniciarSesion(aSesion(usuario))
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
  const sesion = exigirSesion()
  const usuario = sistema.usuarioPorId(sesion.usuarioId)
  if (!usuario) throw new Error('El usuario no existe')
  if (nueva.length < LARGO_MINIMO_PASSWORD) {
    throw new Error(`La nueva contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`)
  }

  const correcta = await verificarSecreto(usuario.password_hash, actual)
  if (!correcta) throw new Error('La contraseña actual no es correcta')

  sistema.establecerPassword(usuario.id, await hashearSecreto(nueva), false)
  // La sesión activa deja de exigir el cambio inmediatamente.
  iniciarSesion({ ...sesion, debeCambiarPassword: false })
  auditar({ accion: 'sesion.password_cambiada', entidad: 'usuario', entidadId: usuario.id })
}

/**
 * Unica via de recuperacion sin servidor, y pertenece al administrador: es
 * quien puede devolver el acceso al resto del equipo.
 */
export async function recuperarConCodigo(
  codigo: string,
  nuevaPassword: string
): Promise<ResultadoInstalacion> {
  const usuario = sistema.usuarioPrincipal()
  if (!usuario) throw new Error('El sistema aún no ha sido configurado')
  if (!usuario.recuperacion_hash) {
    throw new Error('No hay un código de recuperación disponible')
  }
  if (nuevaPassword.length < LARGO_MINIMO_PASSWORD) {
    throw new Error(`La nueva contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`)
  }

  const valido = await verificarSecreto(usuario.recuperacion_hash, normalizarCodigo(codigo))
  if (!valido) throw new Error('El código de recuperación no es válido')

  const nuevoCodigo = generarCodigoRecuperacion()
  const [passwordHash, recuperacionHash] = await Promise.all([
    hashearSecreto(nuevaPassword),
    hashearSecreto(normalizarCodigo(nuevoCodigo))
  ])

  sistema.establecerPassword(usuario.id, passwordHash, false)
  sistema.reemplazarCodigoRecuperacion(usuario.id, recuperacionHash)
  auditar({
    accion: 'sesion.password_cambiada',
    entidad: 'usuario',
    entidadId: usuario.id,
    detalle: 'recuperación con código'
  })

  return { codigoRecuperacion: nuevoCodigo }
}

// ===== Gestion del equipo (solo administrador) =====

export function listarUsuarios(): Usuario[] {
  exigirPermiso('usuarios.gestionar')
  return sistema.listarUsuarios()
}

function validarNombre(nombre: string, excluirId?: number): string {
  const limpio = nombre.trim()
  if (limpio.length < 3) throw new Error('El nombre debe tener al menos 3 caracteres')
  const existente = sistema.usuarioPorNombre(limpio)
  if (existente && existente.id !== excluirId) {
    throw new Error('Ya existe un usuario con ese nombre')
  }
  return limpio
}

export async function crearUsuario(
  datos: UsuarioInput & { password: string }
): Promise<number> {
  exigirPermiso('usuarios.gestionar')
  const nombre = validarNombre(datos.nombre)
  if (datos.password.length < LARGO_MINIMO_PASSWORD) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`)
  }

  const id = sistema.crearUsuario({
    nombre,
    passwordHash: await hashearSecreto(datos.password),
    recuperacionHash: null,
    rol: datos.rol,
    esAdministrador: datos.esAdministrador ?? false,
    // La contraseña la eligió el administrador: el usuario debe reemplazarla.
    debeCambiarPassword: true
  })

  auditar({
    accion: 'usuario.creado',
    entidad: 'usuario',
    entidadId: id,
    detalle: `${nombre} · ${datos.rol}`
  })
  return id
}

export function actualizarUsuario(id: number, datos: UsuarioInput): void {
  exigirPermiso('usuarios.gestionar')
  const usuario = sistema.usuarioPorId(id)
  if (!usuario) throw new Error('El usuario no existe')

  const nombre = validarNombre(datos.nombre, id)
  const esAdministrador = datos.esAdministrador ?? false

  // Nunca puede quedar el sistema sin nadie capaz de administrar usuarios.
  if (!esAdministrador && sistema.contarAdministradoresActivos(id) === 0) {
    throw new Error('Debe existir al menos un administrador activo')
  }

  sistema.actualizarUsuario(id, { nombre, rol: datos.rol, esAdministrador })
  auditar({
    accion: 'usuario.editado',
    entidad: 'usuario',
    entidadId: id,
    detalle: `${nombre} · ${datos.rol}${esAdministrador ? ' · administrador' : ''}`
  })
}

export function alternarUsuario(id: number, activo: boolean): void {
  const sesion = exigirPermiso('usuarios.gestionar')
  if (id === sesion.usuarioId && !activo) {
    throw new Error('No puede desactivar su propio usuario')
  }
  const usuario = sistema.usuarioPorId(id)
  if (!usuario) throw new Error('El usuario no existe')
  if (!activo && usuario.es_administrador === 1 && sistema.contarAdministradoresActivos(id) === 0) {
    throw new Error('Debe existir al menos un administrador activo')
  }

  sistema.alternarUsuario(id, activo)
  auditar({
    accion: activo ? 'usuario.reactivado' : 'usuario.desactivado',
    entidad: 'usuario',
    entidadId: id,
    detalle: usuario.nombre
  })
}

/** El administrador asigna una contraseña temporal que el usuario debe cambiar. */
export async function reiniciarPassword(id: number, passwordTemporal: string): Promise<void> {
  exigirPermiso('usuarios.gestionar')
  const usuario = sistema.usuarioPorId(id)
  if (!usuario) throw new Error('El usuario no existe')
  if (passwordTemporal.length < LARGO_MINIMO_PASSWORD) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`)
  }

  sistema.establecerPassword(id, await hashearSecreto(passwordTemporal), true)
  auditar({
    accion: 'usuario.password_reiniciada',
    entidad: 'usuario',
    entidadId: id,
    detalle: usuario.nombre
  })
}

export function rolDe(usuarioId: number): Rol | null {
  return sistema.usuarioPorId(usuarioId)?.rol ?? null
}
