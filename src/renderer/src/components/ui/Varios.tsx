import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'

export function Insignia({
  children,
  tono = 'neutro'
}: {
  children: ReactNode
  tono?: 'neutro' | 'marca' | 'alerta' | 'critico' | 'exito'
}): React.JSX.Element {
  const tonos = {
    neutro:
      'bg-[color-mix(in_srgb,var(--tinta-tenue)_14%,transparent)] text-[var(--tinta-suave)]',
    marca: 'bg-marca-100 text-marca-800 oscuro:bg-marca-900 oscuro:text-marca-200',
    alerta: 'bg-amber-100 text-amber-800 oscuro:bg-amber-950 oscuro:text-amber-300',
    critico: 'bg-red-100 text-red-800 oscuro:bg-red-950 oscuro:text-red-300',
    exito: 'bg-emerald-100 text-emerald-800 oscuro:bg-emerald-950 oscuro:text-emerald-300'
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${tonos[tono]}`}
    >
      {children}
    </span>
  )
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-center gap-2.5 py-14 text-[var(--tinta-tenue)]">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">{texto}</span>
    </div>
  )
}

export function Vacio({
  titulo,
  descripcion,
  accion,
  icono
}: {
  titulo: string
  descripcion?: string
  accion?: ReactNode
  icono?: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="mb-1 text-[var(--tinta-tenue)]">{icono ?? <Inbox size={30} />}</div>
      <p className="font-medium text-[var(--tinta)]">{titulo}</p>
      {descripcion && (
        <p className="max-w-sm text-[0.875rem] text-[var(--tinta-suave)]">{descripcion}</p>
      )}
      {accion && <div className="mt-3">{accion}</div>}
    </div>
  )
}

export function Aviso({
  tono = 'alerta',
  children
}: {
  tono?: 'alerta' | 'critico' | 'info'
  children: ReactNode
}): React.JSX.Element {
  const tonos = {
    alerta:
      'border-amber-300 bg-amber-50 text-amber-900 oscuro:border-amber-800 oscuro:bg-amber-950/50 oscuro:text-amber-200',
    critico:
      'border-red-300 bg-red-50 text-red-900 oscuro:border-red-800 oscuro:bg-red-950/50 oscuro:text-red-200',
    info: 'border-marca-300 bg-marca-50 text-marca-900 oscuro:border-marca-700 oscuro:bg-marca-900/40 oscuro:text-marca-100'
  }
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[0.875rem] leading-relaxed ${tonos[tono]}`}
      role={tono === 'critico' ? 'alert' : undefined}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function Seccion({
  titulo,
  accion,
  children,
  className = ''
}: {
  titulo: string
  accion?: ReactNode
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <section className={className}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
          {titulo}
        </h3>
        {accion}
      </div>
      {children}
    </section>
  )
}

export function DatoLinea({
  etiqueta,
  valor
}: {
  etiqueta: string
  valor: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-[0.8125rem] text-[var(--tinta-tenue)]">{etiqueta}</span>
      <span className="min-w-0 text-right text-[0.875rem] font-medium text-[var(--tinta)]">
        {valor}
      </span>
    </div>
  )
}
