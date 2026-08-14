import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'
type Tamano = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-marca-600 text-white hover:bg-marca-700 active:bg-marca-800 shadow-sm disabled:bg-marca-600',
  secundario:
    'bg-[var(--superficie)] text-[var(--tinta)] border border-[var(--borde)] hover:border-marca-400 hover:text-marca-700 oscuro:hover:text-marca-300',
  fantasma: 'text-[var(--tinta-suave)] hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_12%,transparent)] hover:text-[var(--tinta)]',
  peligro: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm'
}

const TAMANOS: Record<Tamano, string> = {
  sm: 'h-8 px-3 text-[0.8125rem] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-[0.9375rem] gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-lg'
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamano?: Tamano
  cargando?: boolean
  iconoIzquierda?: ReactNode
}

export const Boton = forwardRef<HTMLButtonElement, Props>(function Boton(
  {
    variante = 'secundario',
    tamano = 'md',
    cargando = false,
    iconoIzquierda,
    className = '',
    children,
    disabled,
    type = 'button',
    ...resto
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      className={`inline-flex shrink-0 items-center justify-center font-medium transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-500 focus-visible:ring-offset-2
        focus-visible:ring-offset-[var(--lienzo)] disabled:cursor-not-allowed disabled:opacity-55
        ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`}
      {...resto}
    >
      {cargando ? (
        <Loader2 size={tamano === 'sm' ? 14 : 16} className="animate-spin" />
      ) : (
        iconoIzquierda
      )}
      {children}
    </button>
  )
})
