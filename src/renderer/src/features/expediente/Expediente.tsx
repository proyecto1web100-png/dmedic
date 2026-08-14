import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Archive,
  Columns2,
  LayoutList,
  Plus,
  Rows3,
  Search as Lupa,
  Trash2
} from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Entrada } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Aviso, Cargando, Insignia, Vacio } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { formatearFecha } from '@shared/lib/fecha'
import { CabeceraPaciente } from './CabeceraPaciente'
import { VistaConsulta } from './VistaConsulta'
import { PanelDatosClinicos } from './PanelDatosClinicos'
import { CitasDelPaciente } from './CitasDelPaciente'
import { FormularioPaciente } from '../pacientes/FormularioPaciente'
import type {
  ConsultaCompleta,
  ConsultaResumen,
  ExpedienteResumen,
  Paciente
} from '@shared/types'

type Vista = 'linea' | 'tabla'

export function Expediente(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const pacienteId = Number(id)
  const navegar = useNavigate()
  const notificar = useNotificar()

  const [expediente, setExpediente] = useState<ExpedienteResumen | null>(null)
  const [historial, setHistorial] = useState<ConsultaResumen[]>([])
  const [seleccionada, setSeleccionada] = useState<ConsultaCompleta | null>(null)
  const [vista, setVista] = useState<Vista>('linea')
  const [filtroTexto, setFiltroTexto] = useState('')
  const [editando, setEditando] = useState(false)
  const [comparando, setComparando] = useState<[number, number] | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    try {
      const [datos, lista] = await Promise.all([
        pedir(api.pacientes.expediente(pacienteId)),
        pedir(api.consultas.historial(pacienteId, { texto: filtroTexto || null }))
      ])
      setExpediente(datos)
      setHistorial(lista)
      if (lista.length > 0) {
        setSeleccionada(await pedir(api.consultas.obtener(lista[0].id)))
      } else {
        setSeleccionada(null)
      }
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setCargando(false)
    }
  }, [pacienteId, filtroTexto, notificar])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function abrirConsulta(consultaId: number): Promise<void> {
    try {
      setSeleccionada(await pedir(api.consultas.obtener(consultaId)))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  async function imprimir(consultaId: number, tipo: 'receta' | 'resumen_consulta'): Promise<void> {
    try {
      const documento = await pedir(api.documentos.generar(consultaId, tipo))
      notificar.exito('Documento generado y archivado en la carpeta del paciente')
      await pedir(api.documentos.abrir(documento.ruta))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  async function archivar(): Promise<void> {
    if (!expediente) return
    try {
      if (expediente.paciente.activo) {
        await pedir(api.pacientes.archivar(pacienteId))
        notificar.exito('Paciente archivado. El expediente se conserva completo.')
      } else {
        await pedir(api.pacientes.reactivar(pacienteId))
        notificar.exito('Paciente reactivado')
      }
      await cargar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  if (cargando) return <Cargando />
  if (!expediente) {
    return (
      <Vacio
        titulo="Paciente no encontrado"
        accion={<Boton onClick={() => navegar('/pacientes')}>Volver a pacientes</Boton>}
      />
    )
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 px-8 py-6">
      <div className="flex items-center justify-between gap-3">
        <Boton
          variante="fantasma"
          tamano="sm"
          iconoIzquierda={<ArrowLeft size={15} />}
          onClick={() => navegar('/pacientes')}
        >
          Pacientes
        </Boton>
        <div className="flex items-center gap-2">
          <Boton
            tamano="sm"
            variante="fantasma"
            iconoIzquierda={<Archive size={14} />}
            onClick={() => void archivar()}
          >
            {expediente.paciente.activo ? 'Archivar' : 'Reactivar'}
          </Boton>
          <Boton
            tamano="sm"
            variante="fantasma"
            iconoIzquierda={<Trash2 size={14} />}
            onClick={() => setEliminando(true)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 oscuro:text-red-400 oscuro:hover:bg-red-950/40"
          >
            Eliminar
          </Boton>
          <Boton
            variante="primario"
            iconoIzquierda={<Plus size={16} />}
            onClick={() => navegar(`/pacientes/${pacienteId}/consulta`)}
          >
            Nueva consulta
          </Boton>
        </div>
      </div>

      <CabeceraPaciente expediente={expediente} onEditar={() => setEditando(true)} />

      <PanelDatosClinicos expediente={expediente} onCambio={cargar} />

      <CitasDelPaciente pacienteId={pacienteId} nombre={expediente.paciente.nombreCompleto} />

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
            Historial · {historial.length}{' '}
            {historial.length === 1 ? 'consulta' : 'consultas'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Lupa
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tinta-tenue)]"
              />
              <input
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Filtrar historial…"
                aria-label="Filtrar historial"
                className="campo-base h-8 w-56 pl-8 text-[0.8125rem]"
              />
            </div>
            {historial.length >= 2 && (
              <Boton
                tamano="sm"
                variante="fantasma"
                iconoIzquierda={<Columns2 size={14} />}
                onClick={() => setComparando([historial[0].id, historial[1].id])}
              >
                Comparar
              </Boton>
            )}
            <div className="flex rounded-lg border border-[var(--borde)] p-0.5">
              <BotonVista activo={vista === 'linea'} onClick={() => setVista('linea')}>
                <Rows3 size={14} />
              </BotonVista>
              <BotonVista activo={vista === 'tabla'} onClick={() => setVista('tabla')}>
                <LayoutList size={14} />
              </BotonVista>
            </div>
          </div>
        </div>

        {historial.length === 0 ? (
          <div className="superficie">
            <Vacio
              titulo={filtroTexto ? 'Sin coincidencias en el historial' : 'Sin consultas todavía'}
              descripcion={
                filtroTexto
                  ? 'Pruebe con otro término de búsqueda.'
                  : 'Cree la primera consulta de este paciente.'
              }
              accion={
                !filtroTexto && (
                  <Boton
                    variante="primario"
                    iconoIzquierda={<Plus size={16} />}
                    onClick={() => navegar(`/pacientes/${pacienteId}/consulta`)}
                  >
                    Nueva consulta
                  </Boton>
                )
              }
            />
          </div>
        ) : vista === 'linea' ? (
          <div className="flex min-h-0 gap-4">
            <ol className="desplazable superficie max-h-[32rem] w-[19rem] shrink-0 divide-y divide-[var(--borde)] overflow-hidden">
              {historial.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => void abrirConsulta(c.id)}
                    className={`w-full px-3.5 py-2.5 text-left transition-colors ${
                      seleccionada?.id === c.id
                        ? 'bg-marca-50 oscuro:bg-marca-900/50'
                        : 'hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_8%,transparent)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[0.8125rem] font-semibold text-[var(--tinta)]">
                        {formatearFecha(c.fecha)}
                      </span>
                      {c.estado === 'anulada' && <Insignia tono="critico">Anulada</Insignia>}
                    </div>
                    <p className="truncate text-[0.875rem] text-[var(--tinta-suave)]">
                      {c.motivo}
                    </p>
                    {c.diagnosticoPrincipal && (
                      <p className="truncate text-[0.75rem] text-[var(--tinta-tenue)]">
                        {c.diagnosticoPrincipal}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ol>

            <div className="desplazable superficie max-h-[32rem] min-w-0 flex-1 px-5 py-4">
              {seleccionada ? (
                <VistaConsulta
                  consulta={seleccionada}
                  onImprimir={(tipo) => void imprimir(seleccionada.id, tipo)}
                />
              ) : (
                <Vacio titulo="Seleccione una consulta" />
              )}
            </div>
          </div>
        ) : (
          <div className="superficie overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--borde)] text-[0.75rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
                  <th className="px-4 py-2.5 font-semibold">Fecha</th>
                  <th className="px-4 py-2.5 font-semibold">Motivo</th>
                  <th className="px-4 py-2.5 font-semibold">Diagnóstico principal</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Medicamentos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--borde)]">
                {historial.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => void abrirConsulta(c.id)}
                    className="cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_8%,transparent)]"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-[0.875rem] text-[var(--tinta-suave)]">
                      {formatearFecha(c.fecha)}
                      {c.estado === 'anulada' && (
                        <span className="ml-2">
                          <Insignia tono="critico">Anulada</Insignia>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[0.9375rem] text-[var(--tinta)]">{c.motivo}</td>
                    <td className="px-4 py-2.5 text-[0.875rem] text-[var(--tinta-suave)]">
                      {c.diagnosticoPrincipal ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[0.875rem] tabular-nums text-[var(--tinta-suave)]">
                      {c.totalMedicamentos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <FormularioPaciente
        abierto={editando}
        paciente={{ ...(expediente.paciente as Paciente), contactos: expediente.contactos }}
        onCerrar={() => setEditando(false)}
        onGuardado={() => {
          setEditando(false)
          void cargar()
        }}
      />

      {comparando && (
        <ModalComparar
          ids={comparando}
          historial={historial}
          onCerrar={() => setComparando(null)}
        />
      )}

      <ModalEliminar
        abierto={eliminando}
        numeroExpediente={expediente.paciente.numeroExpediente}
        nombre={expediente.paciente.nombreCompleto}
        totalConsultas={historial.length}
        onCerrar={() => setEliminando(false)}
        onEliminado={() => navegar('/pacientes')}
        pacienteId={pacienteId}
      />
    </div>
  )
}

function BotonVista({
  activo,
  onClick,
  children
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
        activo
          ? 'bg-marca-600 text-white'
          : 'text-[var(--tinta-tenue)] hover:text-[var(--tinta)]'
      }`}
    >
      {children}
    </button>
  )
}

function ModalComparar({
  ids,
  historial,
  onCerrar
}: {
  ids: [number, number]
  historial: ConsultaResumen[]
  onCerrar: () => void
}): React.JSX.Element {
  const notificar = useNotificar()
  const [izquierda, setIzquierda] = useState(ids[0])
  const [derecha, setDerecha] = useState(ids[1])
  const [par, setPar] = useState<[ConsultaCompleta, ConsultaCompleta] | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setPar(await pedir(api.consultas.comparar(izquierda, derecha)))
      } catch (error) {
        notificar.error(mensajeDeError(error))
      }
    })()
  }, [izquierda, derecha, notificar])

  const opciones = historial.map((c) => ({
    valor: String(c.id),
    etiqueta: `${formatearFecha(c.fecha)} · ${c.motivo}`
  }))

  return (
    <Modal abierto titulo="Comparar consultas" ancho="xl" onCerrar={onCerrar}>
      <div className="grid grid-cols-2 gap-5">
        {([
          [izquierda, setIzquierda, par?.[0]],
          [derecha, setDerecha, par?.[1]]
        ] as const).map(([valor, cambiar, consulta], indice) => (
          <div key={indice} className="min-w-0">
            <select
              value={String(valor)}
              onChange={(e) => cambiar(Number(e.target.value))}
              className="campo-base mb-3 h-9 cursor-pointer text-[0.875rem]"
            >
              {opciones.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
            {consulta ? <VistaConsulta consulta={consulta} compacto /> : <Cargando />}
          </div>
        ))}
      </div>
    </Modal>
  )
}

function ModalEliminar({
  abierto,
  pacienteId,
  numeroExpediente,
  nombre,
  totalConsultas,
  onCerrar,
  onEliminado
}: {
  abierto: boolean
  pacienteId: number
  numeroExpediente: string
  nombre: string
  totalConsultas: number
  onCerrar: () => void
  onEliminado: () => void
}): React.JSX.Element {
  const notificar = useNotificar()
  const [confirmacion, setConfirmacion] = useState('')
  const [eliminando, setEliminando] = useState(false)

  async function eliminar(): Promise<void> {
    setEliminando(true)
    try {
      await pedir(api.pacientes.eliminar(pacienteId, confirmacion))
      notificar.exito('Paciente eliminado definitivamente')
      onEliminado()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setEliminando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Eliminar definitivamente"
      ancho="sm"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            cargando={eliminando}
            disabled={confirmacion.trim().toUpperCase() !== numeroExpediente.toUpperCase()}
            onClick={() => void eliminar()}
          >
            Eliminar para siempre
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Aviso tono="critico">
          Esto destruye de forma irreversible el expediente de <strong>{nombre}</strong>, incluidas
          sus {totalConsultas} {totalConsultas === 1 ? 'consulta' : 'consultas'}, recetas y
          diagnósticos. No se puede deshacer.
        </Aviso>
        <p className="text-[0.875rem] text-[var(--tinta-suave)]">
          Si solo quiere que deje de aparecer en las listas, use <strong>Archivar</strong>: el
          expediente se conserva íntegro y puede reactivarse cuando el paciente regrese.
        </p>
        <Entrada
          etiqueta={`Escriba ${numeroExpediente} para confirmar`}
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          placeholder={numeroExpediente}
          className="font-mono"
        />
      </div>
    </Modal>
  )
}
