import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Printer } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Aviso, Cargando, Vacio } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { useSesion } from '../../app/Sesion'
import { hoyIso } from '@shared/lib/fecha'
import {
  celdasDelMes,
  DIAS_SEMANA,
  aFecha,
  diasDeSemana,
  esHoy,
  esMismoMes,
  rangoVisible,
  sumarDias,
  sumarMeses,
  tituloPeriodo,
  type Vista
} from './calendario'
import { FormularioCita } from './FormularioCita'
import { TarjetaCita, PanelCita } from './TarjetaCita'
import { ReporteAgenda } from './ReporteAgenda'
import type { CitaConPaciente } from '@shared/types'

export function Agenda(): React.JSX.Element {
  const notificar = useNotificar()
  const navegar = useNavigate()

  const [vista, setVista] = useState<Vista>('semana')
  const [referencia, setReferencia] = useState(hoyIso)
  const [citas, setCitas] = useState<CitaConPaciente[]>([])
  const [cargando, setCargando] = useState(true)
  const [formulario, setFormulario] = useState<{ cita?: CitaConPaciente; fecha?: string } | null>(
    null
  )
  const [seleccionada, setSeleccionada] = useState<CitaConPaciente | null>(null)

  const { puede } = useSesion()
  const gestiona = puede('citas.gestionar')
  const puedeAtender = puede('consultas.crear')
  // La secretaría ve la agenda de todos; un doctor solo la suya.
  const verTodos = puede('citas.gestionar_todas')
  const [filtroDoctor, setFiltroDoctor] = useState<number | null>(null)
  const [doctores, setDoctores] = useState<{ id: number; nombre: string }[]>([])
  const [reporte, setReporte] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const { desde, hasta } = rangoVisible(referencia, vista)
      setCitas(await pedir(api.citas.enRango(desde, hasta, filtroDoctor)))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setCargando(false)
    }
  }, [referencia, vista, notificar, filtroDoctor])

  useEffect(() => {
    if (!verTodos) return
    void (async () => {
      try {
        setDoctores(await pedir(api.citas.doctores()))
      } catch {
        setDoctores([])
      }
    })()
  }, [verTodos])

  useEffect(() => {
    void cargar()
  }, [cargar])

  function navegarPeriodo(direccion: -1 | 1): void {
    if (vista === 'mes') setReferencia((r) => sumarMeses(r, direccion))
    else if (vista === 'semana') setReferencia((r) => sumarDias(r, direccion * 7))
    else setReferencia((r) => sumarDias(r, direccion))
  }

  const citasDe = (fecha: string): CitaConPaciente[] => citas.filter((c) => c.fecha === fecha)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-8 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Boton
            tamano="sm"
            variante="fantasma"
            onClick={() => navegarPeriodo(-1)}
            aria-label="Período anterior"
          >
            <ChevronLeft size={17} />
          </Boton>
          <Boton
            tamano="sm"
            variante="fantasma"
            onClick={() => navegarPeriodo(1)}
            aria-label="Período siguiente"
          >
            <ChevronRight size={17} />
          </Boton>
          <h1 className="ml-1 text-lg font-bold capitalize tracking-tight text-[var(--tinta)]">
            {tituloPeriodo(referencia, vista)}
          </h1>
          {referencia !== hoyIso() && (
            <Boton tamano="sm" variante="fantasma" onClick={() => setReferencia(hoyIso())}>
              Hoy
            </Boton>
          )}
        </div>

        <div className="flex items-center gap-2">
          {verTodos && (
            <select
              value={filtroDoctor === null ? '' : String(filtroDoctor)}
              onChange={(e) => setFiltroDoctor(e.target.value ? Number(e.target.value) : null)}
              aria-label="Filtrar por doctor"
              className="campo-base h-8 w-44 cursor-pointer text-[0.8125rem]"
            >
              <option value="">Todos los doctores</option>
              {doctores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          )}
          {puede('citas.reportes') && (
            <Boton
              tamano="sm"
              iconoIzquierda={<Printer size={14} />}
              onClick={() => setReporte(true)}
            >
              Reporte
            </Boton>
          )}
          <div className="flex rounded-lg border border-[var(--borde)] p-0.5">
            {(['dia', 'semana', 'mes'] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`rounded-md px-3 py-1 text-[0.8125rem] font-medium capitalize transition-colors ${
                  vista === v
                    ? 'bg-marca-600 text-white'
                    : 'text-[var(--tinta-tenue)] hover:text-[var(--tinta)]'
                }`}
              >
                {v === 'dia' ? 'Día' : v}
              </button>
            ))}
          </div>
          {gestiona && (
            <Boton
              variante="primario"
              iconoIzquierda={<Plus size={16} />}
              onClick={() => setFormulario({ fecha: referencia })}
            >
              Nueva cita
            </Boton>
          )}
        </div>
      </header>

      {!verTodos && (
        <div className="mb-4">
          <Aviso tono="info">
            Está viendo <strong>su</strong> agenda. Las citas que cree aquí se le asignan
            automáticamente; la secretaría es quien puede agendar para otros doctores.
          </Aviso>
        </div>
      )}

      {cargando ? (
        <Cargando />
      ) : vista === 'mes' ? (
        <VistaMes
          referencia={referencia}
          citasDe={citasDe}
          onDia={(fecha) => {
            setReferencia(fecha)
            setVista('dia')
          }}
          onCita={setSeleccionada}
        />
      ) : vista === 'semana' ? (
        <VistaSemana
          referencia={referencia}
          citasDe={citasDe}
          puedeAgendar={gestiona}
          onAgendar={(fecha) => setFormulario({ fecha })}
          onCita={setSeleccionada}
        />
      ) : (
        <VistaDia
          fecha={referencia}
          citas={citasDe(referencia)}
          puedeAgendar={gestiona}
          onAgendar={() => setFormulario({ fecha: referencia })}
          onCita={setSeleccionada}
        />
      )}

      {reporte && (
        <ReporteAgenda fechaInicial={referencia} onCerrar={() => setReporte(false)} />
      )}

      <FormularioCita
        abierto={formulario !== null}
        cita={formulario?.cita}
        fechaInicial={formulario?.fecha}
        onCerrar={() => setFormulario(null)}
        onGuardado={cargar}
      />

      {seleccionada && (
        <PanelCita
          cita={seleccionada}
          puedeGestionar={gestiona}
          puedeAtender={puedeAtender}
          onCerrar={() => setSeleccionada(null)}
          onEditar={() => {
            setFormulario({ cita: seleccionada })
            setSeleccionada(null)
          }}
          onCambio={async () => {
            setSeleccionada(null)
            await cargar()
          }}
          onAtender={(cita) => {
            if (!cita.pacienteId) {
              notificar.info(
                'Esta cita es de una persona sin expediente. Regístrela como paciente antes de atenderla.'
              )
              return
            }
            navegar(`/pacientes/${cita.pacienteId}/consulta?cita=${cita.id}`)
          }}
        />
      )}
    </div>
  )
}

function VistaMes({
  referencia,
  citasDe,
  onDia,
  onCita
}: {
  referencia: string
  citasDe: (fecha: string) => CitaConPaciente[]
  onDia: (fecha: string) => void
  onCita: (cita: CitaConPaciente) => void
}): React.JSX.Element {
  const celdas = celdasDelMes(referencia)

  return (
    <div className="superficie flex-1 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[var(--borde)]">
        {DIAS_SEMANA.map((dia) => (
          <div
            key={dia}
            className="px-2 py-2 text-center text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]"
          >
            {dia}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6" style={{ minHeight: '32rem' }}>
        {celdas.map((fecha) => {
          const delDia = citasDe(fecha).filter((c) => c.estado !== 'cancelada')
          const fueraDeMes = !esMismoMes(fecha, referencia)
          return (
            <div
              key={fecha}
              onClick={() => onDia(fecha)}
              className={`cursor-pointer border-b border-r border-[var(--borde)] p-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_7%,transparent)] ${
                fueraDeMes ? 'opacity-40' : ''
              }`}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.75rem] font-semibold ${
                    esHoy(fecha)
                      ? 'bg-marca-600 text-white'
                      : 'text-[var(--tinta-suave)]'
                  }`}
                >
                  {aFecha(fecha).getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {delDia.slice(0, 3).map((cita) => (
                  <button
                    key={cita.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onCita(cita)
                    }}
                    className="truncate rounded bg-marca-100 px-1 py-0.5 text-left text-[0.6875rem] font-medium text-marca-800 hover:bg-marca-200 oscuro:bg-marca-900 oscuro:text-marca-200"
                  >
                    {cita.hora ? `${cita.hora} ` : ''}
                    {cita.nombre}
                  </button>
                ))}
                {delDia.length > 3 && (
                  <span className="px-1 text-[0.6875rem] text-[var(--tinta-tenue)]">
                    +{delDia.length - 3} más
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VistaSemana({
  referencia,
  citasDe,
  puedeAgendar,
  onAgendar,
  onCita
}: {
  referencia: string
  citasDe: (fecha: string) => CitaConPaciente[]
  puedeAgendar: boolean
  onAgendar: (fecha: string) => void
  onCita: (cita: CitaConPaciente) => void
}): React.JSX.Element {
  const dias = diasDeSemana(referencia)

  return (
    <div className="grid flex-1 grid-cols-7 gap-2">
      {dias.map((fecha, indice) => {
        const delDia = citasDe(fecha)
        return (
          <div
            key={fecha}
            className={`superficie flex min-h-[26rem] flex-col overflow-hidden ${
              esHoy(fecha) ? 'ring-2 ring-marca-500' : ''
            }`}
          >
            <div className="border-b border-[var(--borde)] px-2 py-2 text-center">
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
                {DIAS_SEMANA[indice]}
              </p>
              <p
                className={`text-[1.0625rem] font-bold ${
                  esHoy(fecha) ? 'text-marca-600 oscuro:text-marca-400' : 'text-[var(--tinta)]'
                }`}
              >
                {aFecha(fecha).getDate()}
              </p>
            </div>
            <div className="desplazable flex flex-1 flex-col gap-1.5 p-1.5">
              {delDia.map((cita) => (
                <TarjetaCita key={cita.id} cita={cita} onClick={() => onCita(cita)} />
              ))}
              {puedeAgendar && (
                <button
                  onClick={() => onAgendar(fecha)}
                  className="mt-auto rounded-lg border border-dashed border-[var(--borde)] py-1.5 text-[0.75rem] text-[var(--tinta-tenue)] transition-colors hover:border-marca-400 hover:text-marca-600"
                >
                  + Agendar
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VistaDia({
  fecha,
  citas,
  puedeAgendar,
  onAgendar,
  onCita
}: {
  fecha: string
  citas: CitaConPaciente[]
  puedeAgendar: boolean
  onAgendar: () => void
  onCita: (cita: CitaConPaciente) => void
}): React.JSX.Element {
  return (
    <div className="superficie mx-auto w-full max-w-2xl flex-1 overflow-hidden">
      {citas.length === 0 ? (
        <Vacio
          icono={<CalendarDays size={30} />}
          titulo="Sin citas este día"
          descripcion={esHoy(fecha) ? 'No hay nada agendado para hoy.' : undefined}
          accion={
            puedeAgendar && (
              <Boton variante="primario" iconoIzquierda={<Plus size={16} />} onClick={onAgendar}>
                Agendar cita
              </Boton>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-2 p-3">
          {citas.map((cita) => (
            <TarjetaCita key={cita.id} cita={cita} amplia onClick={() => onCita(cita)} />
          ))}
          {puedeAgendar && (
            <button
              onClick={onAgendar}
              className="rounded-lg border border-dashed border-[var(--borde)] py-2.5 text-[0.875rem] text-[var(--tinta-tenue)] transition-colors hover:border-marca-400 hover:text-marca-600"
            >
              + Agendar otra cita
            </button>
          )}
        </div>
      )}
    </div>
  )
}
