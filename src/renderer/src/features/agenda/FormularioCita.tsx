import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { AreaTexto, Entrada, Selector } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Aviso } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { useSesion } from '../../app/Sesion'
import { useBusquedaPacientes } from '../pacientes/useBusquedaPacientes'
import { horaFin } from './calendario'
import type { CitaConPaciente, CitaInput, PacienteConResumen, SolapamientoCita } from '@shared/types'

const DURACIONES = [15, 20, 30, 45, 60, 90].map((m) => ({
  valor: String(m),
  etiqueta: `${m} minutos`
}))

interface Props {
  abierto: boolean
  cita?: CitaConPaciente
  fechaInicial?: string
  pacienteFijo?: { id: number; nombre: string }
  onCerrar: () => void
  onGuardado: () => void | Promise<void>
}

export function FormularioCita({
  abierto,
  cita,
  fechaInicial,
  pacienteFijo,
  onCerrar,
  onGuardado
}: Props): React.JSX.Element {
  const notificar = useNotificar()

  const [pacienteId, setPacienteId] = useState<number | null>(null)
  const [nombrePaciente, setNombrePaciente] = useState('')
  const [nombreProvisional, setNombreProvisional] = useState('')
  const [telefonoProvisional, setTelefonoProvisional] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [duracion, setDuracion] = useState(30)
  const [motivo, setMotivo] = useState('')
  const [notas, setNotas] = useState('')
  const [cruces, setCruces] = useState<SolapamientoCita[]>([])
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Solo la secretaría elige doctor; un doctor siempre se la asigna a sí mismo.
  const { estado, puede } = useSesion()
  const eligeDoctor = puede('citas.gestionar_todas')
  const [doctorId, setDoctorId] = useState<number | null>(null)
  const [doctores, setDoctores] = useState<{ id: number; nombre: string }[]>([])

  const editando = cita !== undefined

  useEffect(() => {
    if (!abierto || !eligeDoctor) return
    void (async () => {
      try {
        setDoctores(await pedir(api.citas.doctores()))
      } catch {
        setDoctores([])
      }
    })()
  }, [abierto, eligeDoctor])

  useEffect(() => {
    if (!abierto) return
    setError(null)
    setCruces([])

    setDoctorId(cita?.doctorId ?? (eligeDoctor ? null : (estado?.sesion?.usuarioId ?? null)))

    if (cita) {
      setPacienteId(cita.pacienteId)
      setNombrePaciente(cita.esPacienteRegistrado ? cita.nombre : '')
      setNombreProvisional(cita.nombreProvisional ?? '')
      setTelefonoProvisional(cita.telefonoProvisional ?? '')
      setFecha(cita.fecha)
      setHora(cita.hora ?? '')
      setDuracion(cita.duracionMinutos)
      setMotivo(cita.motivo ?? '')
      setNotas(cita.notas ?? '')
    } else {
      setPacienteId(pacienteFijo?.id ?? null)
      setNombrePaciente(pacienteFijo?.nombre ?? '')
      setNombreProvisional('')
      setTelefonoProvisional('')
      setFecha(fechaInicial ?? '')
      setHora('')
      setDuracion(30)
      setMotivo('')
      setNotas('')
    }
  }, [abierto, cita, fechaInicial, pacienteFijo, eligeDoctor, estado?.sesion?.usuarioId])

  // Aviso de cruce mientras se elige el horario, antes de guardar.
  useEffect(() => {
    if (!abierto || !fecha || !hora) {
      setCruces([])
      return
    }
    let vigente = true
    const temporizador = window.setTimeout(async () => {
      try {
        const encontrados = await pedir(
          api.citas.comprobarSolapamiento(fecha, hora, duracion, cita?.id, doctorId)
        )
        if (vigente) setCruces(encontrados)
      } catch {
        if (vigente) setCruces([])
      }
    }, 250)
    return () => {
      vigente = false
      window.clearTimeout(temporizador)
    }
  }, [abierto, fecha, hora, duracion, cita?.id, doctorId])

  async function guardar(): Promise<void> {
    setError(null)
    setGuardando(true)
    try {
      const carga: CitaInput = {
        doctorId,
        pacienteId,
        nombreProvisional: pacienteId ? null : nombreProvisional.trim() || null,
        telefonoProvisional: pacienteId ? null : telefonoProvisional.trim() || null,
        fecha,
        hora: hora || null,
        duracionMinutos: duracion,
        motivo: motivo.trim() || null,
        notas: notas.trim() || null
      }

      if (editando && cita) {
        await pedir(api.citas.actualizar(cita.id, carga))
        notificar.exito('Cita actualizada')
      } else {
        await pedir(api.citas.crear(carga))
        notificar.exito('Cita agendada')
      }
      onCerrar()
      await onGuardado()
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo={editando ? 'Editar cita' : 'Nueva cita'}
      descripcion="El horario es libre: si hay cruce con otra cita, el sistema avisa pero no lo impide."
      ancho="md"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={
              !fecha ||
              (eligeDoctor && doctorId === null) ||
              (!pacienteId && nombreProvisional.trim().length < 2)
            }
            onClick={() => void guardar()}
          >
            {editando ? 'Guardar cambios' : 'Agendar'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Aviso tono="critico">{error}</Aviso>}

        {eligeDoctor ? (
          <Selector
            etiqueta="Doctor que atenderá"
            requerido
            value={doctorId === null ? '' : String(doctorId)}
            onChange={(e) => setDoctorId(e.target.value ? Number(e.target.value) : null)}
            opciones={doctores.map((d) => ({ valor: String(d.id), etiqueta: d.nombre }))}
            marcador="Seleccione un doctor"
            ayuda="La cita aparecerá en la agenda de ese doctor."
          />
        ) : (
          <p className="text-[0.875rem] text-[var(--tinta-suave)]">
            La cita se agenda en <strong>su</strong> agenda ({estado?.sesion?.nombre}).
          </p>
        )}

        {pacienteFijo === undefined && (
          <SelectorPaciente
            pacienteId={pacienteId}
            nombre={nombrePaciente}
            nombreProvisional={nombreProvisional}
            telefonoProvisional={telefonoProvisional}
            onElegir={(p) => {
              setPacienteId(p.id)
              setNombrePaciente(p.nombreCompleto)
              setNombreProvisional('')
            }}
            onQuitar={() => {
              setPacienteId(null)
              setNombrePaciente('')
            }}
            onNombreProvisional={setNombreProvisional}
            onTelefonoProvisional={setTelefonoProvisional}
          />
        )}

        <div className="grid grid-cols-3 gap-3">
          <Entrada
            etiqueta="Fecha"
            requerido
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
          <Entrada
            etiqueta="Hora"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            ayuda="Opcional"
          />
          <Selector
            etiqueta="Duración"
            value={String(duracion)}
            onChange={(e) => setDuracion(Number(e.target.value))}
            opciones={DURACIONES}
            disabled={!hora}
          />
        </div>

        {cruces.length > 0 && (
          <Aviso tono="alerta">
            {hora && (
              <p className="mb-1">
                De {hora} a {horaFin(hora, duracion)} ya hay{' '}
                {cruces.length === 1 ? 'una cita' : `${cruces.length} citas`}:
              </p>
            )}
            <ul className="list-inside list-disc">
              {cruces.map((c) => (
                <li key={c.id}>
                  {c.hora} · {c.nombre}
                </li>
              ))}
            </ul>
          </Aviso>
        )}

        <Entrada
          etiqueta="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Control, primera vez, seguimiento…"
        />
        <AreaTexto
          etiqueta="Notas"
          rows={2}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>
    </Modal>
  )
}

function SelectorPaciente({
  pacienteId,
  nombre,
  nombreProvisional,
  telefonoProvisional,
  onElegir,
  onQuitar,
  onNombreProvisional,
  onTelefonoProvisional
}: {
  pacienteId: number | null
  nombre: string
  nombreProvisional: string
  telefonoProvisional: string
  onElegir: (paciente: PacienteConResumen) => void
  onQuitar: () => void
  onNombreProvisional: (valor: string) => void
  onTelefonoProvisional: (valor: string) => void
}): React.JSX.Element {
  const { texto, setTexto, resultados } = useBusquedaPacientes()
  const [abierto, setAbierto] = useState(false)

  if (pacienteId !== null) {
    return (
      <div>
        <span className="etiqueta">Paciente</span>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--borde)] px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-medium text-[var(--tinta)]">{nombre}</span>
          <button
            type="button"
            onClick={onQuitar}
            aria-label="Quitar paciente"
            className="shrink-0 rounded p-0.5 text-[var(--tinta-tenue)] transition-colors hover:text-red-600"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <span className="etiqueta">Paciente registrado</span>
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-[2.1rem] text-[var(--tinta-tenue)]"
        />
        <input
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setAbierto(true)
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
          placeholder="Buscar por nombre, identidad o expediente…"
          className="campo-base pl-9"
        />
        {abierto && resultados.length > 0 && (
          <ul className="desplazable superficie absolute z-30 mt-1 max-h-56 w-full overflow-y-auto py-1">
            {resultados.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onElegir(p)
                    setAbierto(false)
                  }}
                  className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left hover:bg-marca-50 oscuro:hover:bg-marca-900/60"
                >
                  <span className="font-medium text-[var(--tinta)]">{p.nombreCompleto}</span>
                  <span className="text-[0.8125rem] text-[var(--tinta-tenue)]">
                    {p.numeroExpediente}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-[var(--borde)] px-3 py-3">
        <p className="mb-2 text-[0.8125rem] text-[var(--tinta-suave)]">
          O agende a alguien que todavía no es paciente registrado:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Entrada
            placeholder="Nombre de la persona"
            value={nombreProvisional}
            onChange={(e) => onNombreProvisional(e.target.value)}
          />
          <Entrada
            placeholder="Teléfono"
            value={telefonoProvisional}
            onChange={(e) => onTelefonoProvisional(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
