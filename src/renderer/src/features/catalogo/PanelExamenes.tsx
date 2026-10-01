import { useCallback, useEffect, useState } from 'react'
import { FlaskConical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Entrada, Selector } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Aviso, Cargando, Insignia, Vacio } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { CATEGORIAS_EXAMEN } from '@shared/types'
import type { CategoriaExamen, Examen } from '@shared/types'

const ETIQUETA_CATEGORIA: Record<CategoriaExamen, string> = {
  laboratorio: 'Laboratorio',
  imagen: 'Imagen',
  procedimiento: 'Procedimiento',
  otro: 'Otro'
}

export function PanelExamenes(): React.JSX.Element {
  const notificar = useNotificar()
  const [examenes, setExamenes] = useState<Examen[] | null>(null)
  const [editando, setEditando] = useState<{ examen?: Examen } | null>(null)

  const cargar = useCallback(async () => {
    try {
      setExamenes(await pedir(api.catalogo.listarExamenes()))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }, [notificar])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function retirar(id: number): Promise<void> {
    try {
      await pedir(api.catalogo.desactivarExamen(id))
      notificar.exito('Examen retirado del buscador')
      await cargar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  if (!examenes) return <Cargando />

  const activos = examenes.filter((e) => e.activo)

  return (
    <>
      <Aviso tono="info">
        Estos son los estudios que se ofrecen al indicar exámenes en una consulta. Un examen
        retirado deja de aparecer en el buscador, pero las consultas que ya lo indicaron lo
        conservan intacto.
      </Aviso>

      <div className="flex justify-end">
        <Boton
          variante="primario"
          iconoIzquierda={<Plus size={16} />}
          onClick={() => setEditando({})}
        >
          Nuevo examen
        </Boton>
      </div>

      <div className="superficie overflow-hidden">
        {activos.length === 0 ? (
          <Vacio
            icono={<FlaskConical size={28} />}
            titulo="Sin exámenes en el catálogo"
            descripcion="Agregue los estudios que indica con más frecuencia para no escribirlos cada vez."
            accion={
              <Boton
                variante="primario"
                iconoIzquierda={<Plus size={16} />}
                onClick={() => setEditando({})}
              >
                Nuevo examen
              </Boton>
            }
          />
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--borde)] text-[0.6875rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
                <th className="px-4 py-2.5 font-semibold">Examen</th>
                <th className="px-4 py-2.5 font-semibold">Tipo</th>
                <th className="px-4 py-2.5 font-semibold">Preparación</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--borde)]">
              {activos.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2.5 text-[0.9375rem] font-medium text-[var(--tinta)]">
                    {e.nombre}
                  </td>
                  <td className="px-4 py-2.5">
                    <Insignia tono="marca">{ETIQUETA_CATEGORIA[e.categoria]}</Insignia>
                  </td>
                  <td className="px-4 py-2.5 text-[0.8125rem] text-[var(--tinta-suave)]">
                    {e.preparacion ?? '—'}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex justify-end gap-0.5">
                      <button
                        onClick={() => setEditando({ examen: e })}
                        aria-label="Editar"
                        className="rounded p-1 text-[var(--tinta-tenue)] transition-colors hover:text-[var(--tinta)]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => void retirar(e.id)}
                        aria-label="Retirar"
                        className="rounded p-1 text-[var(--tinta-tenue)] transition-colors hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editando && (
        <EditorExamen
          examen={editando.examen}
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

function EditorExamen({
  examen,
  onCerrar,
  onGuardado
}: {
  examen?: Examen
  onCerrar: () => void
  onGuardado: () => Promise<void>
}): React.JSX.Element {
  const notificar = useNotificar()
  const [nombre, setNombre] = useState(examen?.nombre ?? '')
  const [categoria, setCategoria] = useState<CategoriaExamen>(examen?.categoria ?? 'laboratorio')
  const [preparacion, setPreparacion] = useState(examen?.preparacion ?? '')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(): Promise<void> {
    setError(null)
    setGuardando(true)
    try {
      const datos = {
        nombre: nombre.trim(),
        categoria,
        preparacion: preparacion.trim() || null
      }
      if (examen) {
        await pedir(api.catalogo.actualizarExamen(examen.id, datos))
        notificar.exito('Examen actualizado')
      } else {
        await pedir(api.catalogo.crearExamen(datos))
        notificar.exito('Examen creado')
      }
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
      titulo={examen ? 'Editar examen' : 'Nuevo examen'}
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
            disabled={nombre.trim().length < 3}
            onClick={() => void guardar()}
          >
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        {error && <Aviso tono="critico">{error}</Aviso>}
        <Entrada
          etiqueta="Nombre del examen"
          requerido
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Hemograma completo"
        />
        <Selector
          etiqueta="Tipo"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaExamen)}
          opciones={CATEGORIAS_EXAMEN.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))}
        />
        <Entrada
          etiqueta="Preparación habitual"
          value={preparacion}
          onChange={(e) => setPreparacion(e.target.value)}
          placeholder="Ayuno de 8 horas"
          ayuda="Se carga sola al indicar el examen, y queda editable en cada consulta."
        />
      </div>
    </Modal>
  )
}
