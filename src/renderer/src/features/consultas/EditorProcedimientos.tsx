import { useEffect, useRef, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Entrada } from '../../components/ui/Campo'
import { api, pedir } from '../../lib/api'
import { CATEGORIAS_EXAMEN } from '@shared/types'
import type { CategoriaExamen, Examen, ProcedimientoConsulta } from '@shared/types'

const ETIQUETA_CATEGORIA: Record<CategoriaExamen, string> = {
  laboratorio: 'Laboratorio',
  imagen: 'Imagen',
  procedimiento: 'Procedimiento',
  otro: 'Otro'
}

export function EditorProcedimientos({
  procedimientos,
  onCambiar
}: {
  procedimientos: ProcedimientoConsulta[]
  onCambiar: (lista: ProcedimientoConsulta[]) => void
}): React.JSX.Element {
  function actualizar<C extends keyof ProcedimientoConsulta>(
    indice: number,
    campo: C,
    valor: ProcedimientoConsulta[C]
  ): void {
    onCambiar(procedimientos.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)))
  }

  function agregarDesdeCatalogo(examen: Examen): void {
    onCambiar([
      ...procedimientos,
      {
        examenId: examen.id,
        nombre: examen.nombre,
        categoria: examen.categoria,
        // La preparación del catálogo arranca las indicaciones, y queda editable.
        indicaciones: examen.preparacion,
        urgente: false
      }
    ])
  }

  function agregarLibre(nombre: string): void {
    onCambiar([
      ...procedimientos,
      {
        examenId: null,
        nombre,
        categoria: 'laboratorio',
        indicaciones: null,
        urgente: false
      }
    ])
  }

  return (
    <div className="flex flex-col gap-3">
      {procedimientos.map((p, indice) => (
        <div key={indice} className="rounded-lg border border-[var(--borde)] px-3 py-2.5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="min-w-0 font-medium text-[var(--tinta)]">{p.nombre}</p>
            <button
              type="button"
              onClick={() => onCambiar(procedimientos.filter((_, i) => i !== indice))}
              aria-label="Quitar examen"
              className="shrink-0 rounded p-1 text-[var(--tinta-tenue)] transition-colors hover:text-red-600"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIAS_EXAMEN.map((c) => (
              <button
                key={c.valor}
                type="button"
                onClick={() => actualizar(indice, 'categoria', c.valor)}
                className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium transition-colors ${
                  p.categoria === c.valor
                    ? 'bg-marca-100 text-marca-800 oscuro:bg-marca-900 oscuro:text-marca-200'
                    : 'text-[var(--tinta-tenue)] hover:text-[var(--tinta)]'
                }`}
              >
                {c.etiqueta}
              </button>
            ))}
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[0.8125rem] text-[var(--tinta)]">
              <input
                type="checkbox"
                checked={p.urgente}
                onChange={(e) => actualizar(indice, 'urgente', e.target.checked)}
                className="h-3.5 w-3.5 accent-red-600"
              />
              Urgente
            </label>
          </div>

          <Entrada
            etiqueta="Indicaciones y preparación"
            className="mt-2"
            value={p.indicaciones ?? ''}
            onChange={(e) => actualizar(indice, 'indicaciones', e.target.value || null)}
            placeholder="Ayuno de 8 horas"
          />
        </div>
      ))}

      <BuscadorExamen onElegir={agregarDesdeCatalogo} onLibre={agregarLibre} />
    </div>
  )
}

function BuscadorExamen({
  onElegir,
  onLibre
}: {
  onElegir: (examen: Examen) => void
  onLibre: (nombre: string) => void
}): React.JSX.Element {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Examen[]>([])
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    const temporizador = window.setTimeout(async () => {
      try {
        const datos = await pedir(api.catalogo.buscarExamenes(texto))
        if (vigente) setResultados(datos)
      } catch {
        if (vigente) setResultados([])
      }
    }, 140)
    return () => {
      vigente = false
      window.clearTimeout(temporizador)
    }
  }, [texto, abierto])

  useEffect(() => {
    function alClic(evento: MouseEvent): void {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClic)
    return () => document.removeEventListener('mousedown', alClic)
  }, [])

  const hayExacto = resultados.some((r) => r.nombre.toLowerCase() === texto.trim().toLowerCase())

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
        placeholder="Indicar examen o procedimiento…"
        className="campo-base pl-9"
        aria-label="Buscar examen"
      />

      {abierto && (resultados.length > 0 || texto.trim().length >= 3) && (
        <ul className="desplazable superficie absolute z-30 mt-1 max-h-64 w-full overflow-y-auto py-1">
          {resultados.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  onElegir(e)
                  setTexto('')
                  setAbierto(false)
                }}
                className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left hover:bg-marca-50 oscuro:hover:bg-marca-900/60"
              >
                <span className="font-medium text-[var(--tinta)]">{e.nombre}</span>
                <span className="text-[0.8125rem] text-[var(--tinta-suave)]">
                  {[ETIQUETA_CATEGORIA[e.categoria], e.preparacion].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}

          {texto.trim().length >= 3 && !hayExacto && (
            <li className="border-t border-[var(--borde)] pt-1">
              <button
                type="button"
                onClick={() => {
                  onLibre(texto.trim())
                  setTexto('')
                  setAbierto(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.875rem] text-marca-700 hover:bg-marca-50 oscuro:text-marca-400 oscuro:hover:bg-marca-900/60"
              >
                <Plus size={14} />
                Indicar «{texto.trim()}» sin catalogar
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
