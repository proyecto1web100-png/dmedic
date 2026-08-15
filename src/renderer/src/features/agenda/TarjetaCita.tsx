import { useState } from 'react'
import { CalendarClock, Phone, Stethoscope, Trash2, UserCheck, UserX } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Modal } from '../../components/ui/Modal'
import { Insignia } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { formatearFechaLarga } from '@shared/lib/fecha'
import { horaFin } from './calendario'
import type { CitaConPaciente, EstadoCita } from '@shared/types'

const TONO_ESTADO: Record<EstadoCita, 'marca' | 'exito' | 'alerta' | 'neutro'> = {
  agendada: 'marca',
  atendida: 'exito',
  no_asistio: 'alerta',
  cancelada: 'neutro'
}

const ETIQUETA_ESTADO: Record<EstadoCita, string> = {
  agendada: 'Agendada',
  atendida: 'Atendida',
  no_asistio: 'No asistió',
  cancelada: 'Cancelada'
}

export function TarjetaCita({
  cita,
  amplia = false,
  onClick
}: {
  cita: CitaConPaciente
  amplia?: boolean
  onClick: () => void
}): React.JSX.Element {
  const anulada = cita.estado === 'cancelada'

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border border-l-[3px] px-2 py-1.5 text-left transition-colors
        ${anulada ? 'opacity-55' : ''}
        ${
          cita.estado === 'atendida'
            ? 'border-l-emerald-500'
            : cita.estado === 'no_asistio'
              ? 'border-l-amber-500'
              : cita.estado === 'cancelada'
                ? 'border-l-[var(--tinta-tenue)]'
                : 'border-l-marca-500'
        }
        border-y-[var(--borde)] border-r-[var(--borde)]
        hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_8%,transparent)]`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`text-[0.75rem] font-bold tabular-nums ${
            cita.hora ? 'text-[var(--tinta)]' : 'text-[var(--tinta-tenue)]'
          }`}
        >
          {cita.hora ?? 'Sin hora'}
        </span>
        {amplia && <Insignia tono={TONO_ESTADO[cita.estado]}>{ETIQUETA_ESTADO[cita.estado]}</Insignia>}
      </div>
      <p
        className={`truncate text-[0.8125rem] font-medium text-[var(--tinta)] ${anulada ? 'line-through' : ''}`}
      >
        {cita.nombre}
      </p>
      {cita.motivo && (
        <p className="truncate text-[0.75rem] text-[var(--tinta-tenue)]">{cita.motivo}</p>
      )}
      {!cita.esPacienteRegistrado && (
        <p className="text-[0.6875rem] text-amber-700 oscuro:text-amber-400">Sin expediente</p>
      )}
    </button>
  )
}

export function PanelCita({
  cita,
  puedeGestionar,
  puedeAtender,
  onCerrar,
  onEditar,
  onCambio,
  onAtender
}: {
  cita: CitaConPaciente
  puedeGestionar: boolean
  puedeAtender: boolean
  onCerrar: () => void
  onEditar: () => void
  onCambio: () => void | Promise<void>
  onAtender: (cita: CitaConPaciente) => void
}): React.JSX.Element {
  const notificar = useNotificar()
  const [ocupado, setOcupado] = useState(false)

  async function ejecutar(operacion: Promise<unknown>, exito: string): Promise<void> {
    setOcupado(true)
    try {
      await operacion
      notificar.exito(exito)
      await onCambio()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setOcupado(false)
    }
  }

  async function cambiarEstado(estado: EstadoCita, mensaje: string): Promise<void> {
    await ejecutar(pedir(api.citas.cambiarEstado(cita.id, estado)), mensaje)
  }

  return (
    <Modal
      abierto
      titulo={cita.nombre}
      descripcion={`${formatearFechaLarga(cita.fecha)}${
        cita.hora ? ` · ${cita.hora} – ${horaFin(cita.hora, cita.duracionMinutos)}` : ' · sin hora'
      }`}
      ancho="sm"
      onCerrar={onCerrar}
      pie={
        <>
          {puedeGestionar && (
            <Boton variante="fantasma" onClick={onEditar} disabled={ocupado}>
              Editar
            </Boton>
          )}
          {puedeAtender && (
            <Boton variante="primario" onClick={() => onAtender(cita)} disabled={ocupado}>
              <Stethoscope size={15} />
              Iniciar consulta
            </Boton>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tono={TONO_ESTADO[cita.estado]}>{ETIQUETA_ESTADO[cita.estado]}</Insignia>
          {cita.esPacienteRegistrado && cita.numeroExpediente && (
            <span className="font-mono text-[0.8125rem] text-[var(--tinta-suave)]">
              {cita.numeroExpediente}
            </span>
          )}
          {!cita.esPacienteRegistrado && <Insignia tono="alerta">Sin expediente</Insignia>}
        </div>

        {cita.telefono && (
          <p className="flex items-center gap-2 text-[0.875rem] text-[var(--tinta-suave)]">
            <Phone size={14} className="text-[var(--tinta-tenue)]" />
            {cita.telefono}
          </p>
        )}

        {cita.motivo && (
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
              Motivo
            </p>
            <p className="text-[0.9375rem] text-[var(--tinta)]">{cita.motivo}</p>
          </div>
        )}

        {cita.notas && (
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
              Notas
            </p>
            <p className="whitespace-pre-wrap text-[0.9375rem] text-[var(--tinta)]">{cita.notas}</p>
          </div>
        )}

        {cita.consultaOrigenId && (
          <p className="flex items-center gap-2 text-[0.8125rem] text-[var(--tinta-tenue)]">
            <CalendarClock size={14} />
            Generada automáticamente desde una consulta anterior.
          </p>
        )}

        {cita.estado === 'agendada' && puedeGestionar && (
          <div className="flex flex-wrap gap-2 border-t border-[var(--borde)] pt-3.5">
            <Boton
              tamano="sm"
              iconoIzquierda={<UserCheck size={14} />}
              disabled={ocupado}
              onClick={() => void cambiarEstado('atendida', 'Cita marcada como atendida')}
            >
              Marcar atendida
            </Boton>
            <Boton
              tamano="sm"
              iconoIzquierda={<UserX size={14} />}
              disabled={ocupado}
              onClick={() => void cambiarEstado('no_asistio', 'Cita marcada como no asistida')}
            >
              No asistió
            </Boton>
            <Boton
              tamano="sm"
              variante="fantasma"
              disabled={ocupado}
              onClick={() => void cambiarEstado('cancelada', 'Cita cancelada')}
            >
              Cancelar cita
            </Boton>
          </div>
        )}

        {cita.consultaAtencionId === null && puedeGestionar && (
          <Boton
            tamano="sm"
            variante="fantasma"
            disabled={ocupado}
            iconoIzquierda={<Trash2 size={14} />}
            className="self-start text-red-600 hover:bg-red-50 hover:text-red-700 oscuro:text-red-400 oscuro:hover:bg-red-950/40"
            onClick={() => void ejecutar(pedir(api.citas.eliminar(cita.id)), 'Cita eliminada')}
          >
            Eliminar del calendario
          </Boton>
        )}
      </div>
    </Modal>
  )
}
