import { useCallback, useEffect, useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Insignia } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { useSesion } from '../../app/Sesion'
import { formatearFecha, hoyIso } from '@shared/lib/fecha'
import { FormularioCita } from '../agenda/FormularioCita'
import type { CitaConPaciente, EstadoCita } from '@shared/types'

const TONO: Record<EstadoCita, 'marca' | 'exito' | 'alerta' | 'neutro'> = {
  agendada: 'marca',
  atendida: 'exito',
  no_asistio: 'alerta',
  cancelada: 'neutro'
}

const ETIQUETA: Record<EstadoCita, string> = {
  agendada: 'Agendada',
  atendida: 'Atendida',
  no_asistio: 'No asistió',
  cancelada: 'Cancelada'
}

export function CitasDelPaciente({
  pacienteId,
  nombre
}: {
  pacienteId: number
  nombre: string
}): React.JSX.Element {
  const notificar = useNotificar()
  const { puede } = useSesion()
  const [citas, setCitas] = useState<CitaConPaciente[]>([])
  const [agendando, setAgendando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setCitas(await pedir(api.citas.dePaciente(pacienteId)))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }, [pacienteId, notificar])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const hoy = hoyIso()
  const pendientes = citas.filter((c) => c.estado === 'agendada' && c.fecha >= hoy)
  const pasadas = citas.filter((c) => !(c.estado === 'agendada' && c.fecha >= hoy)).slice(0, 4)

  return (
    <section className="superficie px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
          Citas
        </h3>
        {puede('citas.gestionar') && (
          <Boton
            tamano="sm"
            variante="fantasma"
            iconoIzquierda={<CalendarPlus size={14} />}
            onClick={() => setAgendando(true)}
          >
            Agendar
          </Boton>
        )}
      </div>

      {citas.length === 0 ? (
        <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">
          Este paciente no tiene citas registradas.
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
          {[...pendientes, ...pasadas].map((cita) => (
            <div key={cita.id} className="flex items-center gap-2 text-[0.875rem]">
              <span className="font-medium tabular-nums text-[var(--tinta)]">
                {formatearFecha(cita.fecha)}
                {cita.hora ? ` · ${cita.hora}` : ''}
              </span>
              {cita.motivo && (
                <span className="text-[var(--tinta-suave)]">{cita.motivo}</span>
              )}
              <Insignia tono={TONO[cita.estado]}>{ETIQUETA[cita.estado]}</Insignia>
            </div>
          ))}
        </div>
      )}

      <FormularioCita
        abierto={agendando}
        pacienteFijo={{ id: pacienteId, nombre }}
        fechaInicial={hoy}
        onCerrar={() => setAgendando(false)}
        onGuardado={cargar}
      />
    </section>
  )
}
