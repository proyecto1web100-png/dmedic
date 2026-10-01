import { useCallback, useEffect, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, History, Package, Plus, Scale } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Entrada } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Aviso, Cargando, Insignia, Vacio } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { useSesion } from '../../app/Sesion'
import { formatearFecha, formatearFechaHora } from '@shared/lib/fecha'
import type { Medicamento, MovimientoInventario, TipoMovimiento } from '@shared/types'

/**
 * Existencias de los medicamentos que la clinica entrega. La cantidad nunca se
 * teclea directamente: cambia registrando entradas, salidas y ajustes, de modo
 * que siempre se pueda explicar por que hay lo que hay.
 */
export function PanelInventario(): React.JSX.Element {
  const notificar = useNotificar()
  const { puede } = useSesion()
  const puedeGestionar = puede('inventario.gestionar')

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [cargando, setCargando] = useState(true)
  const [movimiento, setMovimiento] = useState<{ medicamento: Medicamento; tipo: TipoMovimiento } | null>(
    null
  )
  const [historial, setHistorial] = useState<Medicamento | null>(null)
  const [configurando, setConfigurando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setMedicamentos(await pedir(api.inventario.listar()))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setCargando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (cargando) return <Cargando texto="Cargando inventario…" />

  const bajos = medicamentos.filter((m) => m.bajoMinimo)
  const vencidos = medicamentos.filter((m) => m.vencido)
  const porVencer = medicamentos.filter((m) => m.porVencer)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.875rem] text-[var(--tinta-suave)]">
          Solo aparecen los medicamentos marcados con control de existencias.
        </p>
        {puedeGestionar && (
          <Boton
            variante="secundario"
            tamano="sm"
            iconoIzquierda={<Plus size={15} />}
            onClick={() => setConfigurando(true)}
          >
            Poner un medicamento en inventario
          </Boton>
        )}
      </div>

      {vencidos.length > 0 && (
        <Aviso tono="critico">
          {vencidos.length === 1
            ? `${vencidos[0].nombre} está vencido.`
            : `${vencidos.length} medicamentos están vencidos.`}{' '}
          Retírelos del inventario con una salida.
        </Aviso>
      )}
      {bajos.length > 0 && (
        <Aviso tono="alerta">
          {bajos.length === 1
            ? `${bajos[0].nombre} llegó al mínimo.`
            : `${bajos.length} medicamentos llegaron al mínimo.`}
        </Aviso>
      )}
      {porVencer.length > 0 && (
        <Aviso tono="info">
          {porVencer.length === 1
            ? `${porVencer[0].nombre} vence dentro de los próximos dos meses.`
            : `${porVencer.length} medicamentos vencen dentro de los próximos dos meses.`}
        </Aviso>
      )}

      {medicamentos.length === 0 ? (
        <Vacio
          icono={<Package size={28} />}
          titulo="Sin medicamentos en inventario"
          descripcion="Marque los medicamentos que la clínica entrega para llevarles el control de existencias."
        />
      ) : (
        <div className="superficie overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--borde)] text-[0.75rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
                <th className="px-4 py-2.5 font-semibold">Medicamento</th>
                <th className="px-4 py-2.5 text-right font-semibold">Existencia</th>
                <th className="px-4 py-2.5 text-right font-semibold">Mínimo</th>
                <th className="px-4 py-2.5 font-semibold">Vence</th>
                <th className="px-4 py-2.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {medicamentos.map((m) => (
                <tr key={m.id} className="border-b border-[var(--borde)] last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-[var(--tinta)]">
                      {[m.nombre, m.concentracion].filter(Boolean).join(' ')}
                    </div>
                    {m.forma && (
                      <div className="text-[0.78125rem] text-[var(--tinta-tenue)]">{m.forma}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <span
                      className={`font-semibold ${m.bajoMinimo ? 'text-amber-700 oscuro:text-amber-400' : 'text-[var(--tinta)]'}`}
                    >
                      {m.existencia}
                    </span>
                    {m.unidad && (
                      <span className="ml-1 text-[0.78125rem] text-[var(--tinta-tenue)]">
                        {m.unidad}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--tinta-tenue)]">
                    {m.minimo || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-[0.875rem]">
                    {m.vencimiento ? (
                      <span
                        className={
                          m.vencido
                            ? 'font-medium text-red-600 oscuro:text-red-400'
                            : m.porVencer
                              ? 'font-medium text-amber-700 oscuro:text-amber-400'
                              : 'text-[var(--tinta-suave)]'
                        }
                      >
                        {formatearFecha(m.vencimiento)}
                        {m.vencido && ' · vencido'}
                      </span>
                    ) : (
                      <span className="text-[var(--tinta-tenue)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {puedeGestionar && (
                        <>
                          <Boton
                            tamano="sm"
                            variante="fantasma"
                            iconoIzquierda={<ArrowDownCircle size={14} />}
                            onClick={() => setMovimiento({ medicamento: m, tipo: 'entrada' })}
                          >
                            Entrada
                          </Boton>
                          <Boton
                            tamano="sm"
                            variante="fantasma"
                            iconoIzquierda={<ArrowUpCircle size={14} />}
                            onClick={() => setMovimiento({ medicamento: m, tipo: 'salida' })}
                          >
                            Salida
                          </Boton>
                          <Boton
                            tamano="sm"
                            variante="fantasma"
                            iconoIzquierda={<Scale size={14} />}
                            onClick={() => setMovimiento({ medicamento: m, tipo: 'ajuste' })}
                          >
                            Ajustar
                          </Boton>
                        </>
                      )}
                      <Boton
                        tamano="sm"
                        variante="fantasma"
                        iconoIzquierda={<History size={14} />}
                        onClick={() => setHistorial(m)}
                      >
                        Historial
                      </Boton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormularioMovimiento
        datos={movimiento}
        onCerrar={() => setMovimiento(null)}
        onGuardado={cargar}
      />
      <HistorialMovimientos medicamento={historial} onCerrar={() => setHistorial(null)} />
      <ConfigurarInventario
        abierto={configurando}
        onCerrar={() => setConfigurando(false)}
        onGuardado={cargar}
      />
    </div>
  )
}

const TITULOS: Record<TipoMovimiento, string> = {
  entrada: 'Registrar entrada',
  salida: 'Registrar salida',
  ajuste: 'Ajustar existencia'
}

function FormularioMovimiento({
  datos,
  onCerrar,
  onGuardado
}: {
  datos: { medicamento: Medicamento; tipo: TipoMovimiento } | null
  onCerrar: () => void
  onGuardado: () => Promise<void> | void
}): React.JSX.Element {
  const notificar = useNotificar()
  const [cantidad, setCantidad] = useState('')
  const [lote, setLote] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  const numero = Number(cantidad)
  const valido =
    cantidad !== '' &&
    !Number.isNaN(numero) &&
    numero >= 0 &&
    (datos?.tipo === 'ajuste' || numero > 0)

  function limpiar(): void {
    setCantidad('')
    setLote('')
    setVencimiento('')
    setMotivo('')
  }

  async function guardar(): Promise<void> {
    if (!datos) return
    setGuardando(true)
    try {
      await pedir(
        api.inventario.registrar({
          medicamentoId: datos.medicamento.id,
          tipo: datos.tipo,
          cantidad: numero,
          lote: lote.trim() || null,
          vencimiento: vencimiento || null,
          motivo: motivo.trim() || null
        })
      )
      notificar.exito('Movimiento registrado')
      limpiar()
      await onGuardado()
      onCerrar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  const resultante =
    datos && !Number.isNaN(numero) && cantidad !== ''
      ? datos.tipo === 'entrada'
        ? datos.medicamento.existencia + numero
        : datos.tipo === 'salida'
          ? datos.medicamento.existencia - numero
          : numero
      : null

  return (
    <Modal
      abierto={datos !== null}
      titulo={datos ? TITULOS[datos.tipo] : ''}
      descripcion={
        datos
          ? `${[datos.medicamento.nombre, datos.medicamento.concentracion].filter(Boolean).join(' ')} · existencia actual ${datos.medicamento.existencia}`
          : undefined
      }
      onCerrar={() => {
        limpiar()
        onCerrar()
      }}
      pie={
        <>
          <Boton
            variante="fantasma"
            onClick={() => {
              limpiar()
              onCerrar()
            }}
          >
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={!valido || (resultante !== null && resultante < 0)}
            onClick={() => void guardar()}
          >
            Registrar
          </Boton>
        </>
      }
    >
      <div className="grid gap-3">
        <Entrada
          etiqueta={datos?.tipo === 'ajuste' ? 'Existencia contada' : 'Cantidad'}
          type="number"
          min={0}
          requerido
          autoFocus
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          ayuda={
            datos?.tipo === 'ajuste'
              ? 'La cantidad que hay realmente, no la diferencia'
              : resultante !== null
                ? `Quedarían ${resultante}`
                : undefined
          }
          error={
            resultante !== null && resultante < 0
              ? 'No hay suficiente existencia para esa salida'
              : null
          }
        />

        {datos?.tipo === 'entrada' && (
          <div className="grid grid-cols-2 gap-3">
            <Entrada
              etiqueta="Lote"
              placeholder="L-2026-08"
              value={lote}
              onChange={(e) => setLote(e.target.value)}
            />
            <Entrada
              etiqueta="Vencimiento"
              type="date"
              value={vencimiento}
              onChange={(e) => setVencimiento(e.target.value)}
            />
          </div>
        )}

        <Entrada
          etiqueta="Motivo"
          placeholder={
            datos?.tipo === 'entrada'
              ? 'Compra a proveedor'
              : datos?.tipo === 'salida'
                ? 'Producto vencido, entrega a paciente…'
                : 'Conteo físico'
          }
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </div>
    </Modal>
  )
}

const ETIQUETA_TIPO: Record<TipoMovimiento, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste'
}

function HistorialMovimientos({
  medicamento,
  onCerrar
}: {
  medicamento: Medicamento | null
  onCerrar: () => void
}): React.JSX.Element {
  const notificar = useNotificar()
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!medicamento) return
    setCargando(true)
    void (async () => {
      try {
        setMovimientos(await pedir(api.inventario.movimientos(medicamento.id)))
      } catch (error) {
        notificar.error(mensajeDeError(error))
      } finally {
        setCargando(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicamento])

  return (
    <Modal
      abierto={medicamento !== null}
      titulo={`Historial de ${medicamento?.nombre ?? ''}`}
      ancho="lg"
      onCerrar={onCerrar}
    >
      {cargando ? (
        <Cargando />
      ) : movimientos.length === 0 ? (
        <Vacio titulo="Sin movimientos registrados" />
      ) : (
        <table className="w-full border-collapse text-left text-[0.875rem]">
          <thead>
            <tr className="border-b border-[var(--borde)] text-[0.75rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
              <th className="py-2 font-semibold">Fecha</th>
              <th className="py-2 font-semibold">Tipo</th>
              <th className="py-2 text-right font-semibold">Cantidad</th>
              <th className="py-2 text-right font-semibold">Queda</th>
              <th className="py-2 font-semibold">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.id} className="border-b border-[var(--borde)] last:border-0">
                <td className="py-2 text-[var(--tinta-suave)]">{formatearFechaHora(m.fecha)}</td>
                <td className="py-2">
                  <Insignia
                    tono={m.tipo === 'entrada' ? 'exito' : m.tipo === 'salida' ? 'alerta' : 'neutro'}
                  >
                    {ETIQUETA_TIPO[m.tipo]}
                  </Insignia>
                </td>
                <td className="py-2 text-right tabular-nums">{m.cantidad}</td>
                <td className="py-2 text-right font-medium tabular-nums">
                  {m.existenciaResultante}
                </td>
                <td className="py-2 text-[var(--tinta-tenue)]">
                  {[m.pacienteNombre, m.motivo, m.lote ? `Lote ${m.lote}` : null, m.usuarioNombre]
                    .filter(Boolean)
                    .join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}

/**
 * Marca un medicamento del catalogo para llevarle existencias. Reutiliza el
 * catalogo que ya existe en vez de duplicar los medicamentos en otra lista.
 */
function ConfigurarInventario({
  abierto,
  onCerrar,
  onGuardado
}: {
  abierto: boolean
  onCerrar: () => void
  onGuardado: () => Promise<void> | void
}): React.JSX.Element {
  const notificar = useNotificar()
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Medicamento[]>([])
  const [elegido, setElegido] = useState<Medicamento | null>(null)
  const [minimo, setMinimo] = useState('0')
  const [unidad, setUnidad] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    void (async () => {
      try {
        const encontrados = await pedir(api.catalogo.buscarMedicamentos(busqueda))
        if (vigente) setResultados(encontrados.filter((m) => !m.controlaInventario))
      } catch {
        if (vigente) setResultados([])
      }
    })()
    return () => {
      vigente = false
    }
  }, [abierto, busqueda])

  async function guardar(): Promise<void> {
    if (!elegido) return
    setGuardando(true)
    try {
      await pedir(
        api.catalogo.actualizarMedicamento(elegido.id, {
          nombre: elegido.nombre,
          forma: elegido.forma,
          concentracion: elegido.concentracion,
          via: elegido.via,
          controlaInventario: true,
          minimo: Number(minimo) || 0,
          unidad: unidad.trim() || null
        })
      )
      notificar.exito(`${elegido.nombre} entró al inventario`)
      setElegido(null)
      setBusqueda('')
      setMinimo('0')
      setUnidad('')
      await onGuardado()
      onCerrar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Poner un medicamento en inventario"
      descripcion="Elija un medicamento del catálogo. Su existencia empieza en cero: regístrele una entrada después."
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={!elegido}
            onClick={() => void guardar()}
          >
            Agregar al inventario
          </Boton>
        </>
      }
    >
      <div className="grid gap-3">
        {elegido ? (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--borde)] bg-[var(--lienzo)] px-3 py-2">
            <span className="flex-1 text-[0.9375rem] font-medium">
              {[elegido.nombre, elegido.concentracion, elegido.forma].filter(Boolean).join(' · ')}
            </span>
            <Boton tamano="sm" variante="fantasma" onClick={() => setElegido(null)}>
              Cambiar
            </Boton>
          </div>
        ) : (
          <>
            <Entrada
              etiqueta="Buscar en el catálogo"
              placeholder="Ibuprofeno"
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <div className="max-h-56 overflow-y-auto rounded-lg border border-[var(--borde)]">
              {resultados.length === 0 ? (
                <p className="px-3 py-4 text-center text-[0.875rem] text-[var(--tinta-tenue)]">
                  Sin medicamentos disponibles con ese nombre.
                </p>
              ) : (
                resultados.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setElegido(m)}
                    className="block w-full border-b border-[var(--borde)] px-3 py-2 text-left text-[0.875rem] last:border-0 hover:bg-[var(--lienzo)]"
                  >
                    {[m.nombre, m.concentracion, m.forma].filter(Boolean).join(' · ')}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {elegido && (
          <div className="grid grid-cols-2 gap-3">
            <Entrada
              etiqueta="Existencia mínima"
              type="number"
              min={0}
              ayuda="Aviso cuando baje de aquí"
              value={minimo}
              onChange={(e) => setMinimo(e.target.value)}
            />
            <Entrada
              etiqueta="Unidad"
              placeholder="tabletas, frascos…"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
