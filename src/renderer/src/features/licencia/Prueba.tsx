import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react'
import { Clock, Copy, KeyRound, Lock } from 'lucide-react'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { Boton } from '../../components/ui/Boton'
import { Entrada } from '../../components/ui/Campo'
import type { EstadoLicencia } from '@shared/types'

/**
 * Periodo de prueba. Mientras corre, una franja fija arriba muestra cuanto
 * queda; cuando se agota, esta pantalla sustituye a toda la aplicacion y solo
 * se sale de ella escribiendo el codigo de activacion del equipo. El bloqueo
 * de verdad esta en el proceso principal: esta pantalla solo lo hace visible.
 */

const ContextoLicencia = createContext<EstadoLicencia | null>(null)

export function useLicencia(): EstadoLicencia | null {
  return useContext(ContextoLicencia)
}

function formatearRestante(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const dos = (n: number): string => String(n).padStart(2, '0')

  // Por encima de un dia el reloj a segundos no dice nada util: se cuenta en
  // dias y horas, y solo el ultimo dia baja a horas, minutos y segundos.
  if (total >= 86400) {
    const dias = Math.floor(total / 86400)
    const horas = Math.floor((total % 86400) / 3600)
    return `${dias} ${dias === 1 ? 'día' : 'días'} y ${horas} h`
  }

  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${dos(h)}:${dos(m)}:${dos(s)}`
}

export function ProveedorLicencia({ children }: { children: ReactNode }): React.JSX.Element {
  const [licencia, setLicencia] = useState<EstadoLicencia | null>(null)
  const [restante, setRestante] = useState(0)

  const consultar = useCallback(async () => {
    try {
      const dato = await pedir(api.licencia.estado())
      setLicencia(dato)
      setRestante(dato.restanteMs)
    } catch {
      // Si no se puede consultar, se deja lo que ya se sabia: la comprobacion
      // real ocurre en cada operacion del proceso principal.
    }
  }, [])

  useEffect(() => {
    void consultar()
    // Se vuelve a preguntar de vez en cuando para no depender del reloj del
    // navegador, que la cuenta de cada segundo solo usa para verse fluida.
    const intervalo = setInterval(() => void consultar(), 60_000)
    return () => clearInterval(intervalo)
  }, [consultar])

  useEffect(() => {
    if (!licencia || licencia.activado || restante <= 0) return
    const tic = setInterval(() => setRestante((r) => Math.max(0, r - 1000)), 1000)
    return () => clearInterval(tic)
  }, [licencia, restante])

  // Hasta saber en qué estado está, no se muestra ni la franja ni el bloqueo:
  // evita un parpadeo de "prueba" en un equipo ya activado.
  if (!licencia) return <ContextoLicencia.Provider value={null}>{children}</ContextoLicencia.Provider>

  if (licencia.activado) {
    return <ContextoLicencia.Provider value={licencia}>{children}</ContextoLicencia.Provider>
  }

  if (licencia.bloqueado || restante <= 0) {
    return <PantallaBloqueo licencia={licencia} alActivar={consultar} />
  }

  return (
    <ContextoLicencia.Provider value={licencia}>
      <div className="flex h-full flex-col">
        <FranjaPrueba restante={restante} />
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </ContextoLicencia.Provider>
  )
}

function FranjaPrueba({ restante }: { restante: number }): React.JSX.Element {
  // Las últimas dos horas cambian el color: el aviso deja de ser informativo.
  const urgente = restante < 2 * 60 * 60 * 1000
  return (
    <div
      className={`flex shrink-0 items-center justify-center gap-2 px-4 py-1.5 text-[0.8125rem] font-medium text-white ${
        urgente ? 'bg-red-600' : 'bg-amber-600'
      }`}
    >
      <Clock size={15} />
      <span>Versión de prueba de DMedic.</span>
      <span className="font-mono tabular-nums">{formatearRestante(restante)}</span>
      <span>para que expire y el programa se bloquee.</span>
    </div>
  )
}

function PantallaBloqueo({
  licencia,
  alActivar
}: {
  licencia: EstadoLicencia
  alActivar: () => Promise<void>
}): React.JSX.Element {
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(false)

  async function activar(): Promise<void> {
    setEnviando(true)
    setError(null)
    try {
      await pedir(api.licencia.activar(codigo))
      setListo(true)
      await alActivar()
      // El reinicio es lo que enciende de nuevo el buscador de actualizaciones.
      await pedir(api.licencia.reiniciar())
    } catch (e) {
      setError(mensajeDeError(e))
      setEnviando(false)
    }
  }

  return (
    // Fija a la ventana y con desplazamiento propio: la pantalla de bloqueo no
    // depende de la altura de ningun contenedor de la aplicacion, que en este
    // punto ya no se esta dibujando.
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--lienzo)]">
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-[var(--borde)] bg-[var(--superficie)] p-8 shadow-sm">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 oscuro:bg-red-950 oscuro:text-red-400">
          <Lock size={22} />
        </div>

        <h1 className="text-xl font-semibold text-[var(--tinta)]">Periodo de prueba finalizado</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--tinta-suave)]">
          El periodo de prueba de DMedic terminó. Su información sigue guardada e intacta en esta
          computadora: al escribir el código vuelve a estar disponible tal como la dejó.
        </p>

        {listo ? (
          <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-[0.9375rem] font-medium text-emerald-800 oscuro:bg-emerald-950 oscuro:text-emerald-300">
            Código aceptado. DMedic se está reiniciando…
          </p>
        ) : (
          <>
            <div className="mt-6 rounded-lg border border-[var(--borde)] bg-[var(--lienzo)] px-4 py-3">
              <p className="text-[0.78125rem] font-medium text-[var(--tinta-tenue)]">
                ID de este equipo
              </p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <code className="font-mono text-lg font-semibold tracking-wider text-[var(--tinta)]">
                  {licencia.idEquipo}
                </code>
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  iconoIzquierda={<Copy size={14} />}
                  onClick={() => void navigator.clipboard.writeText(licencia.idEquipo)}
                >
                  Copiar
                </Boton>
              </div>
              <p className="mt-2 text-[0.78125rem] text-[var(--tinta-tenue)]">
                Envíe este ID por WhatsApp para recibir su código.
              </p>
            </div>

            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault()
                void activar()
              }}
            >
              <Entrada
                etiqueta="Código de activación"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                error={error}
                autoFocus
                className="font-mono"
              />
              <Boton
                type="submit"
                variante="primario"
                tamano="lg"
                className="mt-4 w-full"
                cargando={enviando}
                disabled={codigo.trim().length < 8}
                iconoIzquierda={<KeyRound size={17} />}
              >
                Activar DMedic
              </Boton>
            </form>
          </>
          )}
        </div>
      </div>
    </div>
  )
}
