import type { Paciente } from '../types/paciente'

type PartesNombre = Pick<
  Paciente,
  'primerNombre' | 'segundoNombre' | 'primerApellido' | 'segundoApellido'
>

export function nombreCompleto(p: PartesNombre): string {
  return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido]
    .filter(Boolean)
    .join(' ')
}

/** Formato de listado: apellidos primero, para ordenar y localizar rapido. */
export function nombreListado(p: PartesNombre): string {
  const apellidos = [p.primerApellido, p.segundoApellido].filter(Boolean).join(' ')
  const nombres = [p.primerNombre, p.segundoNombre].filter(Boolean).join(' ')
  return `${apellidos}, ${nombres}`
}

export function calcularEdad(fechaNacimiento: string, referencia = new Date()): number {
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`)
  let edad = referencia.getFullYear() - nacimiento.getFullYear()
  const mes = referencia.getMonth() - nacimiento.getMonth()
  if (mes < 0 || (mes === 0 && referencia.getDate() < nacimiento.getDate())) edad--
  return Math.max(0, edad)
}

/** Para menores de 2 anos la edad en anos no dice nada util. */
export function edadLegible(fechaNacimiento: string, referencia = new Date()): string {
  const anos = calcularEdad(fechaNacimiento, referencia)
  if (anos >= 2) return `${anos} años`

  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`)
  const meses =
    (referencia.getFullYear() - nacimiento.getFullYear()) * 12 +
    (referencia.getMonth() - nacimiento.getMonth()) -
    (referencia.getDate() < nacimiento.getDate() ? 1 : 0)

  if (meses >= 1) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`

  const dias = Math.max(
    0,
    Math.floor((referencia.getTime() - nacimiento.getTime()) / 86_400_000)
  )
  return `${dias} ${dias === 1 ? 'día' : 'días'}`
}

export function esMenorDeEdad(fechaNacimiento: string, referencia = new Date()): boolean {
  return calcularEdad(fechaNacimiento, referencia) < 18
}

export function formatearIdentidad(identidad: string | null): string {
  if (!identidad) return '—'
  const d = identidad.replace(/\D/g, '')
  if (d.length !== 13) return identidad
  return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`
}
