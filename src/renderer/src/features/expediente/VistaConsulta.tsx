import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, CalendarClock, FilePlus2, FileText, Paperclip, Pencil, Printer, Send } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import {
  FormularioAdjunto,
  FormularioIncapacidad,
  FormularioReferencia
} from './PanelExpediente'
import { AreaTexto } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Aviso, Insignia } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { useSesion } from '../../app/Sesion'
import { formatearFechaHora, formatearFechaLarga } from '@shared/lib/fecha'
import { clasificarImc, evaluarVital } from '@shared/lib/vitales'
import type { CategoriaExamen, ConsultaCompleta, SignosVitales } from '@shared/types'

const ETIQUETA_CATEGORIA: Record<CategoriaExamen, string> = {
  laboratorio: 'Laboratorio',
  imagen: 'Imagen',
  procedimiento: 'Procedimiento',
  otro: 'Otro'
}

const UNIDADES: Partial<Record<keyof SignosVitales, string>> = {
  peso: 'kg',
  altura: 'cm',
  temperatura: '°C',
  frecuenciaCardiaca: 'lpm',
  frecuenciaRespiratoria: 'rpm',
  saturacionOxigeno: '%',
  glucosa: 'mg/dL'
}

const ETIQUETAS: Partial<Record<keyof SignosVitales, string>> = {
  peso: 'Peso',
  altura: 'Altura',
  temperatura: 'Temperatura',
  frecuenciaCardiaca: 'F. cardíaca',
  frecuenciaRespiratoria: 'F. respiratoria',
  saturacionOxigeno: 'SpO₂',
  glucosa: 'Glucosa'
}

export function VistaConsulta({
  consulta,
  onImprimir,
  onCambio,
  compacto = false
}: {
  consulta: ConsultaCompleta
  onImprimir?: (tipo: 'receta' | 'resumen_consulta') => void
  /** Se invoca tras anular o agregar una adenda, para recargar el expediente. */
  onCambio?: () => void | Promise<void>
  compacto?: boolean
}): React.JSX.Element {
  const { puede } = useSesion()
  const navegar = useNavigate()
  const [anulando, setAnulando] = useState(false)
  const [adendando, setAdendando] = useState(false)
  const [incapacitando, setIncapacitando] = useState(false)
  const [refiriendo, setRefiriendo] = useState(false)
  const [adjuntando, setAdjuntando] = useState(false)

  // El diagnóstico principal de esta consulta se propone en la incapacidad y en
  // la referencia: es el motivo por el que se emiten.
  const principal =
    consulta.diagnosticos.find((d) => d.esPrincipal) ?? consulta.diagnosticos[0] ?? null
  const diagnosticoSugerido = principal
    ? { codigo: principal.codigoCie10, descripcion: principal.descripcion }
    : null

  const s = consulta.signos
  const imc = s.imc
  const anulada = consulta.estado === 'anulada'
  // Las acciones solo tienen sentido en la vista completa del expediente: en el
  // modo compacto la consulta se muestra como referencia, no para operarla.
  const conAcciones = Boolean(onCambio) && !compacto

  return (
    <article className={anulada ? 'opacity-70' : ''}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-[var(--tinta)]">
            {formatearFechaLarga(consulta.fecha)}
          </h3>
          {anulada && (
            <p className="mt-0.5 text-[0.8125rem] text-red-600 oscuro:text-red-400">
              Consulta anulada: {consulta.motivoAnulacion}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {consulta.editable && <Insignia tono="marca">Editable hoy</Insignia>}
          {conAcciones && !anulada && consulta.editable && puede('consultas.editar') && (
            <Boton
              tamano="sm"
              variante="fantasma"
              iconoIzquierda={<Pencil size={14} />}
              onClick={() =>
                navegar(`/pacientes/${consulta.pacienteId}/consulta/${consulta.id}`)
              }
            >
              Editar
            </Boton>
          )}
          {conAcciones && puede('consultas.editar') && (
            <Boton
              tamano="sm"
              variante="fantasma"
              iconoIzquierda={<FilePlus2 size={14} />}
              onClick={() => setAdendando(true)}
            >
              Adenda
            </Boton>
          )}
          {conAcciones && !anulada && puede('consultas.anular') && (
            <Boton
              tamano="sm"
              variante="fantasma"
              iconoIzquierda={<Ban size={14} />}
              onClick={() => setAnulando(true)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 oscuro:text-red-400 oscuro:hover:bg-red-950/40"
            >
              Anular
            </Boton>
          )}
          {conAcciones && !anulada && puede('expediente.adjuntar') && (
            <Boton
              tamano="sm"
              variante="fantasma"
              iconoIzquierda={<Paperclip size={14} />}
              onClick={() => setAdjuntando(true)}
            >
              Adjuntar
            </Boton>
          )}
          {conAcciones && !anulada && puede('documentos.incapacidad') && (
            <Boton
              tamano="sm"
              variante="fantasma"
              iconoIzquierda={<CalendarClock size={14} />}
              onClick={() => setIncapacitando(true)}
            >
              Incapacidad
            </Boton>
          )}
          {conAcciones && !anulada && puede('documentos.referencia') && (
            <Boton
              tamano="sm"
              variante="fantasma"
              iconoIzquierda={<Send size={14} />}
              onClick={() => setRefiriendo(true)}
            >
              Referir
            </Boton>
          )}
          {onImprimir && !anulada && (
            <>
              {(consulta.medicamentos.length > 0 || consulta.procedimientos.length > 0) && (
                <Boton
                  tamano="sm"
                  iconoIzquierda={<Printer size={14} />}
                  onClick={() => onImprimir('receta')}
                >
                  {consulta.medicamentos.length > 0 ? 'Receta' : 'Orden de exámenes'}
                </Boton>
              )}
              <Boton
                tamano="sm"
                iconoIzquierda={<FileText size={14} />}
                onClick={() => onImprimir('resumen_consulta')}
              >
                Resumen
              </Boton>
            </>
          )}
        </div>
      </header>

      <Campo titulo="Motivo de consulta" texto={consulta.motivo} />

      {(s.peso || s.altura || s.presionSistolica || s.temperatura || s.glucosa) && (
        <div className="mb-3">
          <Titulo>Signos vitales</Titulo>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {(Object.keys(ETIQUETAS) as (keyof SignosVitales)[]).map((campo) => {
              const valor = s[campo]
              if (valor === null) return null
              const nivel = evaluarVital(campo, valor)
              return (
                <Vital
                  key={campo}
                  etiqueta={ETIQUETAS[campo] as string}
                  valor={`${valor} ${UNIDADES[campo] ?? ''}`.trim()}
                  nivel={nivel}
                />
              )
            })}
            {s.presionSistolica !== null && s.presionDiastolica !== null && (
              <Vital
                etiqueta="Presión arterial"
                valor={`${s.presionSistolica}/${s.presionDiastolica} mmHg`}
                nivel={
                  evaluarVital('presionSistolica', s.presionSistolica) === 'critico' ||
                  evaluarVital('presionDiastolica', s.presionDiastolica) === 'critico'
                    ? 'critico'
                    : evaluarVital('presionSistolica', s.presionSistolica) === 'atencion' ||
                        evaluarVital('presionDiastolica', s.presionDiastolica) === 'atencion'
                      ? 'atencion'
                      : 'normal'
                }
              />
            )}
            {imc !== null && (
              <Vital
                etiqueta="IMC"
                valor={`${imc} · ${clasificarImc(imc)}`}
                nivel="normal"
              />
            )}
          </div>
        </div>
      )}

      <Campo titulo="Síntomas e historia actual" texto={consulta.sintomas} />
      {!compacto && <Campo titulo="Exploración física" texto={consulta.exploracion} />}

      {consulta.diagnosticos.length > 0 && (
        <div className="mb-3">
          <Titulo>Diagnóstico</Titulo>
          <ul className="flex flex-col gap-1">
            {consulta.diagnosticos.map((d, indice) => (
              <li key={d.id ?? indice} className="text-[0.9375rem] leading-snug">
                <span className="font-mono text-[0.8125rem] font-semibold text-marca-700 oscuro:text-marca-400">
                  {d.codigoCie10}
                </span>{' '}
                <span className="text-[var(--tinta)]">{d.descripcion}</span>
                {d.esPrincipal && (
                  <span className="ml-1.5">
                    <Insignia tono="marca">Principal</Insignia>
                  </span>
                )}
                {d.nota && (
                  <p className="text-[0.8125rem] text-[var(--tinta-suave)]">{d.nota}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Campo titulo="Tratamiento" texto={consulta.tratamiento} />

      {consulta.medicamentos.length > 0 && (
        <div className="mb-3">
          <Titulo>Medicamentos</Titulo>
          <ul className="flex flex-col gap-1.5">
            {consulta.medicamentos.map((m, indice) => (
              <li
                key={m.id ?? indice}
                className="border-l-2 border-marca-400 pl-2.5 text-[0.9375rem] leading-snug"
              >
                <span className="font-medium text-[var(--tinta)]">
                  {m.nombre}
                  {m.concentracion ? ` ${m.concentracion}` : ''}
                </span>
                {m.forma && (
                  <span className="text-[var(--tinta-tenue)]"> ({m.forma})</span>
                )}
                <p className="text-[0.875rem] text-[var(--tinta-suave)]">
                  {[m.dosis, m.frecuencia, m.duracion, m.via].filter(Boolean).join(' · ')}
                </p>
                {m.indicaciones && (
                  <p className="text-[0.8125rem] italic text-[var(--tinta-tenue)]">
                    {m.indicaciones}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {consulta.procedimientos.length > 0 && (
        <div className="mb-3">
          <Titulo>Exámenes y procedimientos</Titulo>
          <ul className="flex flex-col gap-1.5">
            {consulta.procedimientos.map((p, indice) => (
              <li
                key={p.id ?? indice}
                className="border-l-2 border-marca-400 pl-2.5 text-[0.9375rem] leading-snug"
              >
                <span className="font-medium text-[var(--tinta)]">{p.nombre}</span>
                <span className="text-[var(--tinta-tenue)]">
                  {' '}
                  ({ETIQUETA_CATEGORIA[p.categoria]})
                </span>
                {p.urgente && (
                  <span className="ml-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-red-600 oscuro:text-red-400">
                    Urgente
                  </span>
                )}
                {p.indicaciones && (
                  <p className="text-[0.8125rem] italic text-[var(--tinta-tenue)]">
                    {p.indicaciones}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compacto && <Campo titulo="Observaciones" texto={consulta.observaciones} />}
      <Campo titulo="Recomendaciones" texto={consulta.recomendaciones} />

      <div className="mb-3">
        <Titulo>Próxima cita</Titulo>
        <p className="text-[0.9375rem] text-[var(--tinta)]">
          {consulta.sinProximaCita
            ? 'Sin próxima cita programada'
            : formatearFechaLarga(consulta.proximaCitaFecha)}
        </p>
      </div>

      {consulta.adendas.length > 0 && (
        <div className="mb-3">
          <Titulo>Adendas</Titulo>
          <ul className="flex flex-col gap-2">
            {consulta.adendas.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-[var(--borde)] bg-[color-mix(in_srgb,var(--tinta-tenue)_6%,transparent)] px-3 py-2"
              >
                <p className="text-[0.75rem] font-medium text-[var(--tinta-tenue)]">
                  {formatearFechaHora(a.creadaEn)}
                </p>
                <p className="whitespace-pre-wrap text-[0.875rem] text-[var(--tinta)]">
                  {a.texto}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {conAcciones && (
        <>
          <ModalAdenda
            abierto={adendando}
            consultaId={consulta.id}
            onCerrar={() => setAdendando(false)}
            onGuardado={async () => {
              setAdendando(false)
              await onCambio?.()
            }}
          />
          <ModalAnular
            abierto={anulando}
            consultaId={consulta.id}
            fecha={consulta.fecha}
            onCerrar={() => setAnulando(false)}
            onAnulada={async () => {
              setAnulando(false)
              await onCambio?.()
            }}
          />
          <FormularioIncapacidad
            abierto={incapacitando}
            pacienteId={consulta.pacienteId}
            consultaId={consulta.id}
            diagnosticoSugerido={diagnosticoSugerido}
            onCerrar={() => setIncapacitando(false)}
            onGuardado={() => onCambio?.()}
          />
          <FormularioReferencia
            abierto={refiriendo}
            pacienteId={consulta.pacienteId}
            consultaId={consulta.id}
            diagnosticoSugerido={diagnosticoSugerido}
            resumenSugerido={[consulta.motivo, consulta.sintomas, consulta.exploracion]
              .filter(Boolean)
              .join('\n\n')}
            onCerrar={() => setRefiriendo(false)}
            onGuardado={() => onCambio?.()}
          />
          <FormularioAdjunto
            abierto={adjuntando}
            pacienteId={consulta.pacienteId}
            consultaId={consulta.id}
            onCerrar={() => setAdjuntando(false)}
            onGuardado={() => onCambio?.()}
          />
        </>
      )}
    </article>
  )
}

/**
 * Una consulta que ya no es editable no se reescribe: se le agrega una adenda,
 * fechada y aparte. Es la forma de corregir o completar un expediente sin
 * borrar lo que se escribio en su momento.
 */
function ModalAdenda({
  abierto,
  consultaId,
  onCerrar,
  onGuardado
}: {
  abierto: boolean
  consultaId: number
  onCerrar: () => void
  onGuardado: () => void | Promise<void>
}): React.JSX.Element {
  const notificar = useNotificar()
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(): Promise<void> {
    setGuardando(true)
    try {
      await pedir(api.consultas.agregarAdenda(consultaId, texto))
      notificar.exito('Adenda agregada')
      setTexto('')
      await onGuardado()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Agregar una adenda"
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
            disabled={texto.trim().length < 3}
            onClick={() => void guardar()}
          >
            Agregar adenda
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Aviso tono="info">
          La adenda no modifica lo ya escrito: se agrega al final de la consulta con su fecha y
          hora, y queda visible para quien la lea despues.
        </Aviso>
        <AreaTexto
          etiqueta="Texto de la adenda"
          rows={5}
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Resultado de laboratorio recibido, correccion de la dosis indicada..."
        />
      </div>
    </Modal>
  )
}

/**
 * Anular deja la consulta a la vista, marcada y con su motivo. No borra nada:
 * un expediente clinico registra tambien los errores y por que se corrigieron.
 */
function ModalAnular({
  abierto,
  consultaId,
  fecha,
  onCerrar,
  onAnulada
}: {
  abierto: boolean
  consultaId: number
  fecha: string
  onCerrar: () => void
  onAnulada: () => void | Promise<void>
}): React.JSX.Element {
  const notificar = useNotificar()
  const [motivo, setMotivo] = useState('')
  const [anulando, setAnulando] = useState(false)

  async function anular(): Promise<void> {
    setAnulando(true)
    try {
      await pedir(api.consultas.anular(consultaId, motivo))
      notificar.exito('Consulta anulada')
      setMotivo('')
      await onAnulada()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setAnulando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Anular consulta"
      descripcion={formatearFechaLarga(fecha)}
      ancho="sm"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            cargando={anulando}
            disabled={motivo.trim().length < 5}
            onClick={() => void anular()}
          >
            Anular consulta
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Aviso tono="alerta">
          La consulta no se borra: queda en el historial marcada como anulada, con el motivo a la
          vista, y deja de poder imprimirse. Anular no se puede deshacer desde la aplicacion.
        </Aviso>
        <AreaTexto
          etiqueta="Motivo de la anulacion"
          rows={3}
          autoFocus
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Registrada en el paciente equivocado, duplicada por error..."
          ayuda="Minimo 5 caracteres. Queda registrado en la auditoria."
        />
      </div>
    </Modal>
  )
}

function Titulo({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h4 className="mb-1 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
      {children}
    </h4>
  )
}

function Campo({ titulo, texto }: { titulo: string; texto: string | null }): React.JSX.Element | null {
  if (!texto) return null
  return (
    <div className="mb-3">
      <Titulo>{titulo}</Titulo>
      <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-[var(--tinta)]">
        {texto}
      </p>
    </div>
  )
}

function Vital({
  etiqueta,
  valor,
  nivel
}: {
  etiqueta: string
  valor: string
  nivel: 'normal' | 'atencion' | 'critico'
}): React.JSX.Element {
  const punto =
    nivel === 'critico'
      ? 'bg-red-500'
      : nivel === 'atencion'
        ? 'bg-amber-500'
        : 'bg-transparent'
  return (
    <div className="flex items-baseline gap-1.5">
      {nivel !== 'normal' && (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${punto}`} aria-hidden />
      )}
      <span className="text-[0.75rem] text-[var(--tinta-tenue)]">{etiqueta}</span>
      <span
        className={`text-[0.9375rem] font-semibold tabular-nums ${
          nivel === 'critico'
            ? 'text-red-600 oscuro:text-red-400'
            : nivel === 'atencion'
              ? 'text-amber-700 oscuro:text-amber-400'
              : 'text-[var(--tinta)]'
        }`}
      >
        {valor}
      </span>
    </div>
  )
}
