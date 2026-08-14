import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

type Tono = 'exito' | 'error' | 'info'

interface Notificacion {
  id: number
  tono: Tono
  texto: string
}

interface Contexto {
  exito: (texto: string) => void
  error: (texto: string) => void
  info: (texto: string) => void
}

const ContextoNotificaciones = createContext<Contexto | null>(null)

const DURACION_MS = 5000

export function ProveedorNotificaciones({ children }: { children: ReactNode }): React.JSX.Element {
  const [lista, setLista] = useState<Notificacion[]>([])

  const descartar = useCallback((id: number) => {
    setLista((actual) => actual.filter((n) => n.id !== id))
  }, [])

  const agregar = useCallback(
    (tono: Tono, texto: string) => {
      const id = Date.now() + Math.random()
      setLista((actual) => [...actual, { id, tono, texto }])
      // Los errores no se ocultan solos: el usuario debe poder leerlos con calma.
      if (tono !== 'error') {
        window.setTimeout(() => descartar(id), DURACION_MS)
      }
    },
    [descartar]
  )

  const valor = useMemo<Contexto>(
    () => ({
      exito: (texto) => agregar('exito', texto),
      error: (texto) => agregar('error', texto),
      info: (texto) => agregar('info', texto)
    }),
    [agregar]
  )

  const iconos = {
    exito: <CheckCircle2 size={17} className="text-emerald-600 oscuro:text-emerald-400" />,
    error: <XCircle size={17} className="text-red-600 oscuro:text-red-400" />,
    info: <Info size={17} className="text-marca-600 oscuro:text-marca-400" />
  }

  return (
    <ContextoNotificaciones.Provider value={valor}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2"
        aria-live="polite"
      >
        {lista.map((n) => (
          <div
            key={n.id}
            className="superficie pointer-events-auto flex items-start gap-2.5 px-3.5 py-3"
          >
            <span className="mt-px shrink-0">{iconos[n.tono]}</span>
            <p className="min-w-0 flex-1 text-[0.875rem] leading-relaxed text-[var(--tinta)]">
              {n.texto}
            </p>
            <button
              onClick={() => descartar(n.id)}
              aria-label="Descartar"
              className="-mr-1 -mt-0.5 shrink-0 rounded p-1 text-[var(--tinta-tenue)] transition-colors hover:text-[var(--tinta)]"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ContextoNotificaciones.Provider>
  )
}

export function useNotificar(): Contexto {
  const contexto = useContext(ContextoNotificaciones)
  if (!contexto) {
    throw new Error('useNotificar debe usarse dentro de ProveedorNotificaciones')
  }
  return contexto
}
