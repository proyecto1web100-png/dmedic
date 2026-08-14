const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
]

/** Fecha local en formato ISO corto, sin desplazamiento por zona horaria. */
export function hoyIso(referencia = new Date()): string {
  const y = referencia.getFullYear()
  const m = String(referencia.getMonth() + 1).padStart(2, '0')
  const d = String(referencia.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function ahoraIso(): string {
  return new Date().toISOString()
}

export function formatearFecha(iso: string | null): string {
  if (!iso) return '—'
  const fecha = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  const d = String(fecha.getDate()).padStart(2, '0')
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${fecha.getFullYear()}`
}

export function formatearFechaLarga(iso: string | null): string {
  if (!iso) return '—'
  const fecha = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`
}

export function formatearFechaHora(iso: string | null): string {
  if (!iso) return '—'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  const hh = String(fecha.getHours()).padStart(2, '0')
  const mm = String(fecha.getMinutes()).padStart(2, '0')
  return `${formatearFecha(iso)} ${hh}:${mm}`
}

export function esMismoDia(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10)
}
