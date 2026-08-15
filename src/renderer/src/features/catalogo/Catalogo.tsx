import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Stethoscope, Trash2, X } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { AreaTexto, Entrada } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Aviso, Cargando, Insignia, Vacio } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { BuscadorCie10 } from '../consultas/BuscadorCie10'
import { EditorMedicamentos } from '../consultas/EditorMedicamentos'
import type { Cie10, MedicamentoRecetado, PlantillaTratamiento } from '@shared/types'

type Pestana = 'diagnosticos' | 'tratamientos'

export function Catalogo(): React.JSX.Element {
  const [pestana, setPestana] = useState<Pestana>('tratamientos')

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-5 px-8 py-8">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-[var(--tinta)]">Catálogo clínico</h1>
        <p className="text-[0.875rem] text-[var(--tinta-suave)]">
          Sus diagnósticos propios y sus protocolos de tratamiento.
        </p>
      </header>

      <div className="flex gap-1 border-b border-[var(--borde)]">
        {(
          [
            ['tratamientos', 'Protocolos de tratamiento'],
            ['diagnosticos', 'Diagnósticos propios']
          ] as [Pestana, string][]
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            onClick={() => setPestana(valor)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-[0.875rem] font-medium transition-colors ${
              pestana === valor
                ? 'border-marca-600 text-marca-700 oscuro:text-marca-400'
                : 'border-transparent text-[var(--tinta-tenue)] hover:text-[var(--tinta)]'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'tratamientos' ? <PanelPlantillas /> : <PanelDiagnosticos />}
    </div>
  )
}

// ===== Protocolos de tratamiento =====

function PanelPlantillas(): React.JSX.Element {
  const notificar = useNotificar()
  const [plantillas, setPlantillas] = useState<PlantillaTratamiento[] | null>(null)
  const [editando, setEditando] = useState<{ plantilla?: PlantillaTratamiento } | null>(null)

  const cargar = useCallback(async () => {
    try {
      setPlantillas(await pedir(api.catalogo.listarPlantillas()))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }, [notificar])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function eliminar(id: number): Promise<void> {
    try {
      await pedir(api.catalogo.eliminarPlantilla(id))
      notificar.exito('Protocolo eliminado')
      await cargar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  if (!plantillas) return <Cargando />

  return (
    <>
      <Aviso tono="info">
        Estos protocolos son suyos: el sistema nunca sugiere tratamientos por su cuenta. Al elegir
        un diagnóstico en una consulta, se le ofrecen los que usted haya guardado para ese código,
        y todo queda editable antes de firmar.
      </Aviso>

      <div className="flex justify-end">
        <Boton
          variante="primario"
          iconoIzquierda={<Plus size={16} />}
          onClick={() => setEditando({})}
        >
          Nuevo protocolo
        </Boton>
      </div>

      <div className="superficie overflow-hidden">
        {plantillas.length === 0 ? (
          <Vacio
            icono={<Stethoscope size={28} />}
            titulo="Todavía no hay protocolos"
            descripcion="Cree uno para que sus tratamientos habituales se carguen solos al elegir un diagnóstico."
            accion={
              <Boton
                variante="primario"
                iconoIzquierda={<Plus size={16} />}
                onClick={() => setEditando({})}
              >
                Nuevo protocolo
              </Boton>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--borde)]">
            {plantillas.map((p) => (
              <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--tinta)]">{p.nombre}</span>
                    <Insignia tono="marca">{p.codigoCie10}</Insignia>
                    {p.items.length > 0 && (
                      <Insignia>
                        {p.items.length}{' '}
                        {p.items.length === 1 ? 'medicamento' : 'medicamentos'}
                      </Insignia>
                    )}
                  </div>
                  {p.tratamiento && (
                    <p className="mt-0.5 line-clamp-2 text-[0.8125rem] text-[var(--tinta-suave)]">
                      {p.tratamiento}
                    </p>
                  )}
                </div>
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  iconoIzquierda={<Pencil size={14} />}
                  onClick={() => setEditando({ plantilla: p })}
                >
                  Editar
                </Boton>
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  onClick={() => void eliminar(p.id)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 oscuro:text-red-400"
                >
                  <Trash2 size={14} />
                </Boton>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <EditorPlantilla
          plantilla={editando.plantilla}
          onCerrar={() => setEditando(null)}
          onGuardado={async () => {
            setEditando(null)
            await cargar()
          }}
        />
      )}
    </>
  )
}

function EditorPlantilla({
  plantilla,
  onCerrar,
  onGuardado
}: {
  plantilla?: PlantillaTratamiento
  onCerrar: () => void
  onGuardado: () => Promise<void>
}): React.JSX.Element {
  const notificar = useNotificar()
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '')
  const [diagnostico, setDiagnostico] = useState<Cie10 | null>(
    plantilla ? { codigo: plantilla.codigoCie10, descripcion: '', categoria: null } : null
  )
  const [tratamiento, setTratamiento] = useState(plantilla?.tratamiento ?? '')
  const [recomendaciones, setRecomendaciones] = useState(plantilla?.recomendaciones ?? '')
  const [medicamentos, setMedicamentos] = useState<MedicamentoRecetado[]>(
    (plantilla?.items ?? []).map((i) => ({
      medicamentoId: i.medicamentoId,
      nombre: i.nombre,
      concentracion: i.concentracion,
      forma: i.forma,
      via: i.via,
      dosis: i.dosis,
      frecuencia: i.frecuencia,
      duracion: i.duracion,
      indicaciones: i.indicaciones
    }))
  )
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(): Promise<void> {
    setError(null)
    if (!diagnostico) {
      setError('Elija el diagnóstico al que se asocia este protocolo')
      return
    }
    setGuardando(true)
    try {
      await pedir(
        api.catalogo.guardarPlantilla({
          id: plantilla?.id as number,
          codigoCie10: diagnostico.codigo,
          nombre: nombre.trim(),
          tratamiento: tratamiento.trim() || null,
          recomendaciones: recomendaciones.trim() || null,
          items: medicamentos.map((m) => ({
            medicamentoId: m.medicamentoId,
            nombre: m.nombre,
            concentracion: m.concentracion,
            forma: m.forma,
            via: m.via,
            dosis: m.dosis,
            frecuencia: m.frecuencia,
            duracion: m.duracion,
            indicaciones: m.indicaciones
          }))
        })
      )
      notificar.exito(plantilla ? 'Protocolo actualizado' : 'Protocolo creado')
      await onGuardado()
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto
      titulo={plantilla ? 'Editar protocolo' : 'Nuevo protocolo de tratamiento'}
      ancho="lg"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={nombre.trim().length < 3 || !diagnostico}
            onClick={() => void guardar()}
          >
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Aviso tono="critico">{error}</Aviso>}

        <Entrada
          etiqueta="Nombre del protocolo"
          requerido
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Faringitis bacteriana — adulto"
        />

        <div>
          <span className="etiqueta">Diagnóstico asociado</span>
          {diagnostico ? (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--borde)] px-3 py-2">
              <span className="font-mono text-[0.8125rem] font-semibold text-marca-700 oscuro:text-marca-400">
                {diagnostico.codigo}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-[var(--tinta)]">
                {diagnostico.descripcion}
              </span>
              <button
                type="button"
                onClick={() => setDiagnostico(null)}
                aria-label="Quitar diagnóstico"
                className="rounded p-0.5 text-[var(--tinta-tenue)] hover:text-red-600"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <BuscadorCie10 onElegir={setDiagnostico} />
          )}
        </div>

        <AreaTexto
          etiqueta="Tratamiento"
          rows={3}
          value={tratamiento}
          onChange={(e) => setTratamiento(e.target.value)}
          ayuda="Se cargará en el campo Tratamiento de la consulta."
        />

        <div>
          <span className="etiqueta">Medicamentos habituales</span>
          <EditorMedicamentos
            medicamentos={medicamentos}
            alergias={[]}
            onCambiar={setMedicamentos}
          />
        </div>

        <AreaTexto
          etiqueta="Recomendaciones"
          rows={2}
          value={recomendaciones}
          onChange={(e) => setRecomendaciones(e.target.value)}
        />
      </div>
    </Modal>
  )
}

// ===== Diagnosticos propios =====

function PanelDiagnosticos(): React.JSX.Element {
  const notificar = useNotificar()
  const [codigos, setCodigos] = useState<Cie10[] | null>(null)
  const [creando, setCreando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setCodigos(await pedir(api.catalogo.listarCie10(true)))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }, [notificar])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function eliminar(codigo: string): Promise<void> {
    try {
      await pedir(api.catalogo.eliminarCie10(codigo))
      notificar.exito('Diagnóstico eliminado')
      await cargar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  if (!codigos) return <Cargando />

  return (
    <>
      <Aviso tono="info">
        El catálogo CIE-10 oficial ya viene incluido y no se modifica. Aquí puede agregar
        diagnósticos propios de la clínica que no existan en él; aparecerán en el buscador junto a
        los oficiales.
      </Aviso>

      <div className="flex justify-end">
        <Boton
          variante="primario"
          iconoIzquierda={<Plus size={16} />}
          onClick={() => setCreando(true)}
        >
          Nuevo diagnóstico
        </Boton>
      </div>

      <div className="superficie overflow-hidden">
        {codigos.length === 0 ? (
          <Vacio
            titulo="Sin diagnósticos propios"
            descripcion="Todos los diagnósticos en uso provienen del catálogo CIE-10 incluido."
          />
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--borde)] text-[0.6875rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
                <th className="px-4 py-2.5 font-semibold">Código</th>
                <th className="px-4 py-2.5 font-semibold">Descripción</th>
                <th className="px-4 py-2.5 font-semibold">Categoría</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--borde)]">
              {codigos.map((c) => (
                <tr key={c.codigo}>
                  <td className="px-4 py-2.5 font-mono text-[0.8125rem] font-semibold text-marca-700 oscuro:text-marca-400">
                    {c.codigo}
                  </td>
                  <td className="px-4 py-2.5 text-[0.9375rem] text-[var(--tinta)]">
                    {c.descripcion}
                  </td>
                  <td className="px-4 py-2.5 text-[0.8125rem] text-[var(--tinta-suave)]">
                    {c.categoria ?? '—'}
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => void eliminar(c.codigo)}
                      aria-label="Eliminar"
                      className="rounded p-1 text-[var(--tinta-tenue)] transition-colors hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creando && (
        <NuevoDiagnostico
          onCerrar={() => setCreando(false)}
          onGuardado={async () => {
            setCreando(false)
            await cargar()
          }}
        />
      )}
    </>
  )
}

function NuevoDiagnostico({
  onCerrar,
  onGuardado
}: {
  onCerrar: () => void
  onGuardado: () => Promise<void>
}): React.JSX.Element {
  const notificar = useNotificar()
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(): Promise<void> {
    setError(null)
    setGuardando(true)
    try {
      await pedir(
        api.catalogo.crearCie10({
          codigo: codigo.trim().toUpperCase(),
          descripcion: descripcion.trim(),
          categoria: categoria.trim() || null
        })
      )
      notificar.exito('Diagnóstico creado')
      await onGuardado()
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto
      titulo="Nuevo diagnóstico"
      ancho="sm"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={codigo.trim().length < 2 || descripcion.trim().length < 3}
            onClick={() => void guardar()}
          >
            Crear
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        {error && <Aviso tono="critico">{error}</Aviso>}
        <Entrada
          etiqueta="Código"
          requerido
          autoFocus
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="LOC-01"
          className="font-mono"
          ayuda="Use un código que no exista en el CIE-10 oficial, para no confundirlos."
        />
        <Entrada
          etiqueta="Descripción"
          requerido
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <Entrada
          etiqueta="Categoría"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          placeholder="Personalizado"
        />
      </div>
    </Modal>
  )
}
