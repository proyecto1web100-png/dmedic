import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CalendarPlus, Search, UserPlus, Users } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Cargando, Vacio } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { useSesion } from '../../app/Sesion'
import { formatearFecha } from '@shared/lib/fecha'
import { useBusquedaPacientes } from '../pacientes/useBusquedaPacientes'
import { FormularioPaciente } from '../pacientes/FormularioPaciente'
import type { ResumenAgenda, ResumenDashboard } from '@shared/types'

export function Dashboard(): React.JSX.Element {
  const navegar = useNavigate()
  const notificar = useNotificar()
  const { config } = useSesion()

  const [resumen, setResumen] = useState<ResumenDashboard | null>(null)
  const [agenda, setAgenda] = useState<ResumenAgenda | null>(null)
  const [nuevoPaciente, setNuevoPaciente] = useState(false)
  const { texto, setTexto, resultados, buscando } = useBusquedaPacientes()
  const buscador = useRef<HTMLInputElement>(null)

  async function cargar(): Promise<void> {
    try {
      const [panel, citas] = await Promise.all([
        pedir(api.consultas.dashboard()),
        pedir(api.citas.resumen())
      ])
      setResumen(panel)
      setAgenda(citas)
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  useEffect(() => {
    void cargar()
    buscador.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saludo = useMemo(() => {
    const hora = new Date().getHours()
    if (hora < 12) return 'Buenos días'
    if (hora < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }, [])

  if (!resumen) return <Cargando />

  const mostrandoResultados = texto.trim().length > 0

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-8 py-9">
      <header className="mb-7">
        <p className="text-[0.875rem] text-[var(--tinta-suave)]">{saludo},</p>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--tinta)]">
          {config?.nombreDoctor || 'Doctor'}
        </h1>
      </header>

      <div className="relative mb-6">
        <Search
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--tinta-tenue)]"
        />
        <input
          ref={buscador}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar paciente por nombre, identidad o expediente…"
          className="campo-base h-[3.25rem] pl-12 pr-4 text-[1.0625rem]"
          aria-label="Buscar paciente"
        />
      </div>

      {mostrandoResultados ? (
        <div className="superficie mb-6 overflow-hidden">
          {buscando && resultados.length === 0 ? (
            <Cargando texto="Buscando…" />
          ) : resultados.length === 0 ? (
            <Vacio
              titulo="Sin coincidencias"
              descripcion={`No se encontró ningún paciente que coincida con "${texto}".`}
              accion={
                <Boton
                  variante="primario"
                  iconoIzquierda={<UserPlus size={16} />}
                  onClick={() => setNuevoPaciente(true)}
                >
                  Registrar paciente nuevo
                </Boton>
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--borde)]">
              {resultados.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => navegar(`/pacientes/${p.id}`)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_8%,transparent)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--tinta)]">
                        {p.nombreCompleto}
                      </p>
                      <p className="truncate text-[0.8125rem] text-[var(--tinta-tenue)]">
                        {p.numeroExpediente} · {p.edad} años
                        {p.telefono ? ` · ${p.telefono}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-[0.8125rem] text-[var(--tinta-tenue)]">
                      {p.ultimaConsultaEn
                        ? `Última: ${formatearFecha(p.ultimaConsultaEn)}`
                        : 'Sin consultas'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-4 gap-3">
            <Tarjeta etiqueta="Pacientes activos" valor={resumen.totalPacientes} />
            <Tarjeta etiqueta="Citas de hoy" valor={resumen.citasHoy} />
            <Tarjeta etiqueta="Consultas de hoy" valor={resumen.consultasHoy} destacado />
            <Tarjeta etiqueta="Nuevos este mes" valor={resumen.pacientesNuevosMes} />
          </div>

          <div className="mb-7 flex gap-2.5">
            <Boton
              variante="primario"
              iconoIzquierda={<UserPlus size={16} />}
              onClick={() => setNuevoPaciente(true)}
            >
              Nuevo paciente
            </Boton>
            <Boton
              iconoIzquierda={<Users size={16} />}
              onClick={() => navegar('/pacientes')}
            >
              Ver todos los pacientes
            </Boton>
            <Boton
              iconoIzquierda={<CalendarPlus size={16} />}
              onClick={() => navegar('/agenda')}
            >
              Agenda
            </Boton>
          </div>

          <section className="mb-7">
            <h2 className="mb-2.5 text-[0.75rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
              Citas de hoy
            </h2>
            <div className="superficie overflow-hidden">
              {agenda === null ? (
                <Cargando texto="Cargando agenda…" />
              ) : agenda.hoy.filter((c) => c.estado === 'agendada').length === 0 ? (
                <Vacio
                  icono={<CalendarDays size={26} />}
                  titulo="Sin citas para hoy"
                  descripcion="No hay nada agendado en el día de hoy."
                />
              ) : (
                <ul className="divide-y divide-[var(--borde)]">
                  {agenda.hoy
                    .filter((c) => c.estado === 'agendada')
                    .map((cita) => (
                      <li key={cita.id}>
                        <button
                          onClick={() =>
                            cita.pacienteId
                              ? navegar(`/pacientes/${cita.pacienteId}`)
                              : navegar('/agenda')
                          }
                          className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_8%,transparent)]"
                        >
                          <span className="w-14 shrink-0 text-[0.875rem] font-bold tabular-nums text-marca-700 oscuro:text-marca-400">
                            {cita.hora ?? '—'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-[var(--tinta)]">
                              {cita.nombre}
                            </p>
                            {cita.motivo && (
                              <p className="truncate text-[0.8125rem] text-[var(--tinta-tenue)]">
                                {cita.motivo}
                              </p>
                            )}
                          </div>
                          {!cita.esPacienteRegistrado && (
                            <span className="shrink-0 text-[0.75rem] text-amber-700 oscuro:text-amber-400">
                              Sin expediente
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2.5 text-[0.75rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
              Atendidos recientemente
            </h2>
            <div className="superficie overflow-hidden">
              {resumen.ultimosAtendidos.length === 0 ? (
                <Vacio
                  titulo="Todavía no hay consultas"
                  descripcion="Registre un paciente y cree su primera consulta para empezar."
                />
              ) : (
                <ul className="divide-y divide-[var(--borde)]">
                  {resumen.ultimosAtendidos.map((p, indice) => (
                    <li key={`${p.pacienteId}-${indice}`}>
                      <button
                        onClick={() => navegar(`/pacientes/${p.pacienteId}`)}
                        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_8%,transparent)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[var(--tinta)]">
                            {p.nombreCompleto}
                          </p>
                          <p className="truncate text-[0.8125rem] text-[var(--tinta-tenue)]">
                            {p.motivo}
                          </p>
                        </div>
                        <span className="shrink-0 text-[0.8125rem] text-[var(--tinta-tenue)]">
                          {formatearFecha(p.fecha)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      <FormularioPaciente
        abierto={nuevoPaciente}
        onCerrar={() => setNuevoPaciente(false)}
        onGuardado={(id) => {
          setNuevoPaciente(false)
          navegar(`/pacientes/${id}`)
        }}
      />
    </div>
  )
}

function Tarjeta({
  etiqueta,
  valor,
  destacado = false
}: {
  etiqueta: string
  valor: number
  destacado?: boolean
}): React.JSX.Element {
  return (
    <div className="superficie px-4 py-3.5">
      <p className="text-[0.78125rem] font-medium text-[var(--tinta-tenue)]">{etiqueta}</p>
      <p
        className={`mt-0.5 text-2xl font-bold tabular-nums ${
          destacado ? 'text-marca-600 oscuro:text-marca-400' : 'text-[var(--tinta)]'
        }`}
      >
        {valor}
      </p>
    </div>
  )
}
