import { useEffect, useRef, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Entrada } from '../../components/ui/Campo'
import { Aviso } from '../../components/ui/Varios'
import { api, pedir } from '../../lib/api'
import type { Alergia, Medicamento, MedicamentoRecetado } from '@shared/types'

export function EditorMedicamentos({
  medicamentos,
  alergias,
  onCambiar
}: {
  medicamentos: MedicamentoRecetado[]
  alergias: Alergia[]
  onCambiar: (lista: MedicamentoRecetado[]) => void
}): React.JSX.Element {
  function actualizar(indice: number, campo: keyof MedicamentoRecetado, valor: string): void {
    const lista = medicamentos.map((m, i) => (i === indice ? { ...m, [campo]: valor } : m))
    onCambiar(lista)
  }

  function agregarDesdeCatalogo(medicamento: Medicamento): void {
    onCambiar([
      ...medicamentos,
      {
        medicamentoId: medicamento.id,
        nombre: medicamento.nombre,
        concentracion: medicamento.concentracion,
        forma: medicamento.forma,
        via: medicamento.via,
        dosis: '',
        frecuencia: '',
        duracion: null,
        indicaciones: null
      }
    ])
  }

  function agregarLibre(nombre: string): void {
    onCambiar([
      ...medicamentos,
      {
        medicamentoId: null,
        nombre,
        concentracion: null,
        forma: null,
        via: null,
        dosis: '',
        frecuencia: '',
        duracion: null,
        indicaciones: null
      }
    ])
  }

  // Aviso, no bloqueo: coincidencia por nombre entre lo recetado y las alergias activas.
  const coincidencias = medicamentos
    .map((m, indice) => {
      const alergia = alergias.find(
        (a) =>
          a.activa &&
          m.nombre.toLowerCase().includes(a.sustancia.toLowerCase().trim())
      )
      return alergia ? { indice, medicamento: m.nombre, alergia: alergia.sustancia } : null
    })
    .filter((x): x is { indice: number; medicamento: string; alergia: string } => x !== null)

  return (
    <div className="flex flex-col gap-3">
      {coincidencias.length > 0 && (
        <Aviso tono="critico">
          {coincidencias.map((c) => (
            <p key={c.indice}>
              <strong>{c.medicamento}</strong> coincide con una alergia registrada del paciente (
              {c.alergia}). Verifique antes de recetar.
            </p>
          ))}
        </Aviso>
      )}

      {medicamentos.map((m, indice) => (
        <div key={indice} className="rounded-lg border border-[var(--borde)] px-3 py-2.5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-[var(--tinta)]">
                {m.nombre}
                {m.concentracion ? ` ${m.concentracion}` : ''}
              </p>
              {m.forma && (
                <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">
                  {m.forma}
                  {m.via ? ` · ${m.via}` : ''}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onCambiar(medicamentos.filter((_, i) => i !== indice))}
              aria-label="Quitar medicamento"
              className="shrink-0 rounded p-1 text-[var(--tinta-tenue)] transition-colors hover:text-red-600"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Entrada
              etiqueta="Dosis"
              value={m.dosis}
              onChange={(e) => actualizar(indice, 'dosis', e.target.value)}
              placeholder="1 tableta"
            />
            <Entrada
              etiqueta="Frecuencia"
              value={m.frecuencia}
              onChange={(e) => actualizar(indice, 'frecuencia', e.target.value)}
              placeholder="cada 8 horas"
            />
            <Entrada
              etiqueta="Duración"
              value={m.duracion ?? ''}
              onChange={(e) => actualizar(indice, 'duracion', e.target.value)}
              placeholder="por 7 días"
            />
          </div>
          <Entrada
            etiqueta="Indicaciones"
            className="mt-2"
            value={m.indicaciones ?? ''}
            onChange={(e) => actualizar(indice, 'indicaciones', e.target.value)}
            placeholder="Tomar con alimentos"
          />
        </div>
      ))}

      <BuscadorMedicamento onElegir={agregarDesdeCatalogo} onLibre={agregarLibre} />
    </div>
  )
}

function BuscadorMedicamento({
  onElegir,
  onLibre
}: {
  onElegir: (medicamento: Medicamento) => void
  onLibre: (nombre: string) => void
}): React.JSX.Element {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Medicamento[]>([])
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    const temporizador = window.setTimeout(async () => {
      try {
        const datos = await pedir(api.catalogo.buscarMedicamentos(texto))
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

  const hayExacto = resultados.some(
    (r) => r.nombre.toLowerCase() === texto.trim().toLowerCase()
  )

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
        placeholder="Agregar medicamento del catálogo…"
        className="campo-base pl-9"
        aria-label="Buscar medicamento"
      />

      {abierto && (resultados.length > 0 || texto.trim().length >= 3) && (
        <ul className="desplazable superficie absolute z-30 mt-1 max-h-64 w-full overflow-y-auto py-1">
          {resultados.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onElegir(m)
                  setTexto('')
                  setAbierto(false)
                }}
                className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left hover:bg-marca-50 oscuro:hover:bg-marca-900/60"
              >
                <span className="font-medium text-[var(--tinta)]">{m.nombre}</span>
                <span className="text-[0.8125rem] text-[var(--tinta-suave)]">
                  {[m.concentracion, m.forma].filter(Boolean).join(' · ')}
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
                Usar «{texto.trim()}» sin catalogar
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export function BotonAgregar({
  onClick,
  children
}: {
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Boton tamano="sm" variante="fantasma" iconoIzquierda={<Plus size={14} />} onClick={onClick}>
      {children}
    </Boton>
  )
}
