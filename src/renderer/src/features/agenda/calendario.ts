import { hoyIso } from '@shared/lib/fecha'

export type Vista = 'mes' | 'semana' | 'dia'

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]

export function aFecha(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}

export function aIso(fecha: Date): string {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function sumarDias(iso: string, dias: number): string {
  const fecha = aFecha(iso)
  fecha.setDate(fecha.getDate() + dias)
  return aIso(fecha)
}

export function sumarMeses(iso: string, meses: number): string {
  const fecha = aFecha(iso)
  const diaOriginal = fecha.getDate()
  fecha.setDate(1)
  fecha.setMonth(fecha.getMonth() + meses)
  // Evita que el 31 de enero + 1 mes salte a marzo.
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate()
  fecha.setDate(Math.min(diaOriginal, ultimoDia))
  return aIso(fecha)
}

/** Lunes de la semana a la que pertenece la fecha. */
export function inicioDeSemana(iso: string): string {
  const fecha = aFecha(iso)
  const dia = fecha.getDay()
  const desplazamiento = dia === 0 ? -6 : 1 - dia
  fecha.setDate(fecha.getDate() + desplazamiento)
  return aIso(fecha)
}

/** Las seis semanas que se dibujan en la vista de mes, empezando en lunes. */
export function celdasDelMes(iso: string): string[] {
  const fecha = aFecha(iso)
  const primero = aIso(new Date(fecha.getFullYear(), fecha.getMonth(), 1))
  const inicio = inicioDeSemana(primero)
  return Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i))
}

export function diasDeSemana(iso: string): string[] {
  const inicio = inicioDeSemana(iso)
  return Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i))
}

export function esMismoMes(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 7) === isoB.slice(0, 7)
}

export function esHoy(iso: string): boolean {
  return iso === hoyIso()
}

export function tituloPeriodo(iso: string, vista: Vista): string {
  const fecha = aFecha(iso)
  if (vista === 'mes') return `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`
  if (vista === 'dia') {
    return `${fecha.getDate()} de ${MESES[fecha.getMonth()].toLowerCase()} de ${fecha.getFullYear()}`
  }
  const dias = diasDeSemana(iso)
  const inicio = aFecha(dias[0])
  const fin = aFecha(dias[6])
  const mesInicio = MESES[inicio.getMonth()].toLowerCase()
  const mesFin = MESES[fin.getMonth()].toLowerCase()
  return inicio.getMonth() === fin.getMonth()
    ? `${inicio.getDate()} – ${fin.getDate()} de ${mesFin} de ${fin.getFullYear()}`
    : `${inicio.getDate()} de ${mesInicio} – ${fin.getDate()} de ${mesFin} de ${fin.getFullYear()}`
}

export function rangoVisible(iso: string, vista: Vista): { desde: string; hasta: string } {
  if (vista === 'dia') return { desde: iso, hasta: iso }
  if (vista === 'semana') {
    const dias = diasDeSemana(iso)
    return { desde: dias[0], hasta: dias[6] }
  }
  const celdas = celdasDelMes(iso)
  return { desde: celdas[0], hasta: celdas[celdas.length - 1] }
}

export function formatearHora(hora: string | null): string {
  return hora ?? 'Sin hora'
}

export function horaFin(hora: string, duracionMinutos: number): string {
  const [h, m] = hora.split(':').map(Number)
  const total = h * 60 + m + duracionMinutos
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}
