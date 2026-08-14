import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Boton } from './Boton'

interface Props {
  abierto: boolean
  titulo: string
  descripcion?: string
  ancho?: 'sm' | 'md' | 'lg' | 'xl'
  onCerrar: () => void
  children: ReactNode
  pie?: ReactNode
}

const ANCHOS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl'
}

export function Modal({
  abierto,
  titulo,
  descripcion,
  ancho = 'md',
  onCerrar,
  children,
  pie
}: Props): React.JSX.Element | null {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const alPulsar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsar)
    // El foco entra al diálogo para que el teclado no siga navegando el fondo.
    panel.current?.focus()
    return () => document.removeEventListener('keydown', alPulsar)
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="absolute inset-0 bg-[rgb(10_18_22/0.45)] backdrop-blur-[2px]"
        onClick={onCerrar}
      />
      <div
        ref={panel}
        tabIndex={-1}
        className={`superficie relative flex max-h-[86vh] w-full ${ANCHOS[ancho]} flex-col outline-none`}
      >
        <header className="flex items-start gap-4 border-b border-[var(--borde)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.0625rem] font-semibold text-[var(--tinta)]">{titulo}</h2>
            {descripcion && (
              <p className="mt-0.5 text-[0.84375rem] text-[var(--tinta-suave)]">{descripcion}</p>
            )}
          </div>
          <Boton
            variante="fantasma"
            tamano="sm"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mr-1 -mt-0.5"
          >
            <X size={17} />
          </Boton>
        </header>

        <div className="desplazable flex-1 px-5 py-4">{children}</div>

        {pie && (
          <footer className="flex items-center justify-end gap-2 border-t border-[var(--borde)] px-5 py-3.5">
            {pie}
          </footer>
        )}
      </div>
    </div>
  )
}
