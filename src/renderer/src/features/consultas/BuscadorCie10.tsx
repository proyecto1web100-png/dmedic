import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { api, pedir } from '../../lib/api'
import type { Cie10 } from '@shared/types'

export function BuscadorCie10({
  onElegir,
  marcador = 'Buscar diagnóstico por código o descripción…'
}: {
  onElegir: (codigo: Cie10) => void
  marcador?: string
}): React.JSX.Element {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Cie10[]>([])
  const [abierto, setAbierto] = useState(false)
  const [resaltado, setResaltado] = useState(0)
  const contenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    const temporizador = window.setTimeout(async () => {
      try {
        const datos = await pedir(api.catalogo.buscarCie10(texto))
        if (vigente) {
          setResultados(datos)
          setResaltado(0)
        }
      } catch {
        if (vigente) setResultados([])
      }
    }, 140)
    return () => {
      vigente = false
      window.clearTimeout(temporizador)
    }
  }, [texto, abierto])

  // Cerrar al hacer clic fuera: sin esto la lista se queda flotando sobre el formulario.
  useEffect(() => {
    function alClic(evento: MouseEvent): void {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClic)
    return () => document.removeEventListener('mousedown', alClic)
  }, [])

  function elegir(codigo: Cie10): void {
    onElegir(codigo)
    setTexto('')
    setAbierto(false)
  }

  function alTeclear(evento: React.KeyboardEvent): void {
    if (!abierto || resultados.length === 0) return
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      setResaltado((i) => Math.min(i + 1, resultados.length - 1))
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      setResaltado((i) => Math.max(i - 1, 0))
    } else if (evento.key === 'Enter') {
      evento.preventDefault()
      elegir(resultados[resaltado])
    } else if (evento.key === 'Escape') {
      setAbierto(false)
    }
  }

  return (
    <div ref={contenedor} className="relative">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tinta-tenue)]"
      />
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={alTeclear}
        placeholder={marcador}
        className="campo-base pl-9"
        aria-label="Buscar diagnóstico CIE-10"
      />

      {abierto && resultados.length > 0 && (
        <ul className="desplazable superficie absolute z-30 mt-1 max-h-72 w-full overflow-y-auto py-1">
          {resultados.map((c, indice) => (
            <li key={c.codigo}>
              <button
                type="button"
                onMouseEnter={() => setResaltado(indice)}
                onClick={() => elegir(c)}
                className={`flex w-full items-baseline gap-2.5 px-3 py-1.5 text-left ${
                  indice === resaltado
                    ? 'bg-marca-50 oscuro:bg-marca-900/60'
                    : ''
                }`}
              >
                <span className="shrink-0 font-mono text-[0.8125rem] font-semibold text-marca-700 oscuro:text-marca-400">
                  {c.codigo}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.875rem] text-[var(--tinta)]">
                  {c.descripcion}
                </span>
                {c.categoria && (
                  <span className="shrink-0 text-[0.75rem] text-[var(--tinta-tenue)]">
                    {c.categoria}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
