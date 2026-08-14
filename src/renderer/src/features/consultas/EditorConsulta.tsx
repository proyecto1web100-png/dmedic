import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Sparkles, X } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { AreaTexto, Entrada } from '../../components/ui/Campo'
import { Aviso, Cargando, Insignia, Vacio } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { calcularImc, clasificarImc, evaluarVital, signosVacios } from '@shared/lib/vitales'
import { formatearFecha } from '@shared/lib/fecha'
import { BuscadorCie10 } from './BuscadorCie10'
import { EditorMedicamentos } from './EditorMedicamentos'
import { VistaConsulta } from '../expediente/VistaConsulta'
import type {
  Cie10,
  ConsultaCompleta,
  ConsultaInput,
  DiagnosticoConsulta,
  ExpedienteResumen,
  MedicamentoRecetado,
  PlantillaTratamiento,
  SignosVitales
} from '@shared/types'

const CAMPOS_VITALES: {
  campo: keyof SignosVitales
  etiqueta: string
  unidad: string
  paso?: string
}[] = [
  { campo: 'peso', etiqueta: 'Peso', unidad: 'kg', paso: '0.1' },
  { campo: 'altura', etiqueta: 'Altura', unidad: 'cm', paso: '0.5' },
  { campo: 'presionSistolica', etiqueta: 'PA sistólica', unidad: 'mmHg' },
  { campo: 'presionDiastolica', etiqueta: 'PA diastólica', unidad: 'mmHg' },
  { campo: 'temperatura', etiqueta: 'Temperatura', unidad: '°C', paso: '0.1' },
  { campo: 'frecuenciaCardiaca', etiqueta: 'F. cardíaca', unidad: 'lpm' },
  { campo: 'frecuenciaRespiratoria', etiqueta: 'F. respiratoria', unidad: 'rpm' },
  { campo: 'saturacionOxigeno', etiqueta: 'SpO₂', unidad: '%' },
  { campo: 'glucosa', etiqueta: 'Glucosa', unidad: 'mg/dL' }
]

interface Borrador {
  motivo: string
  sintomas: string
  exploracion: string
  tratamiento: string
  observaciones: string
  recomendaciones: string
  proximaCitaFecha: string
  sinProximaCita: boolean
  signos: SignosVitales
  diagnosticos: DiagnosticoConsulta[]
  medicamentos: MedicamentoRecetado[]
}

function borradorVacio(): Borrador {
  return {
    motivo: '',
    sintomas: '',
    exploracion: '',
    tratamiento: '',
    observaciones: '',
    recomendaciones: '',
    proximaCitaFecha: '',
    sinProximaCita: false,
    signos: signosVacios(),
    diagnosticos: [],
    medicamentos: []
  }
}

function claveBorrador(pacienteId: number, consultaId?: number): string {
  return `dmedic:borrador:${pacienteId}:${consultaId ?? 'nueva'}`
}

export function EditorConsulta(): React.JSX.Element {
  const { pacienteId: parametroPaciente, consultaId: parametroConsulta } = useParams()
  const pacienteId = Number(parametroPaciente)
  const consultaId = parametroConsulta ? Number(parametroConsulta) : undefined
  const [parametrosBusqueda] = useSearchParams()
  // Cita de la agenda desde la que se inició la consulta, si se llegó por ahí.
  const citaId = parametrosBusqueda.get('cita')
    ? Number(parametrosBusqueda.get('cita'))
    : undefined
  const navegar = useNavigate()
  const notificar = useNotificar()

  const [expediente, setExpediente] = useState<ExpedienteResumen | null>(null)
  const [anteriores, setAnteriores] = useState<ConsultaCompleta[]>([])
  const [datos, setDatos] = useState<Borrador>(borradorVacio)
  const [plantillas, setPlantillas] = useState<PlantillaTratamiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [borradorRestaurado, setBorradorRestaurado] = useState(false)

  const clave = claveBorrador(pacienteId, consultaId)

  useEffect(() => {
    void (async () => {
      try {
        const resumen = await pedir(api.pacientes.expediente(pacienteId))
        setExpediente(resumen)

        const historial = await pedir(api.consultas.historial(pacienteId))
        const previas = historial.filter((c) => c.id !== consultaId).slice(0, 3)
        const completas = await Promise.all(
          previas.map((c) => pedir(api.consultas.obtener(c.id)))
        )
        setAnteriores(completas)

        if (consultaId) {
          const consulta = await pedir(api.consultas.obtener(consultaId))
          if (!consulta.editable) {
            setError(
              'Esta consulta ya no puede editarse porque no fue creada hoy. Puede agregarle una adenda desde el expediente.'
            )
          }
          setDatos({
            motivo: consulta.motivo,
            sintomas: consulta.sintomas ?? '',
            exploracion: consulta.exploracion ?? '',
            tratamiento: consulta.tratamiento ?? '',
            observaciones: consulta.observaciones ?? '',
            recomendaciones: consulta.recomendaciones ?? '',
            proximaCitaFecha: consulta.proximaCitaFecha ?? '',
            sinProximaCita: consulta.sinProximaCita,
            signos: consulta.signos,
            diagnosticos: consulta.diagnosticos,
            medicamentos: consulta.medicamentos
          })
        } else {
          // Borrador local: si se fue la luz o se cerró el programa, no se pierde lo escrito.
          const guardado = window.localStorage.getItem(clave)
          if (guardado) {
            setDatos(JSON.parse(guardado) as Borrador)
            setBorradorRestaurado(true)
          } else if (citaId) {
            // Al venir de la agenda, el motivo de la cita arranca el motivo de consulta.
            const cita = await pedir(api.citas.obtener(citaId))
            if (cita.motivo) setDatos((actual) => ({ ...actual, motivo: cita.motivo as string }))
          }
        }
      } catch (fallo) {
        notificar.error(mensajeDeError(fallo))
      } finally {
        setCargando(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId, consultaId])

  // Autoguardado del borrador mientras se escribe.
  useEffect(() => {
    if (cargando || consultaId) return
    const temporizador = window.setTimeout(() => {
      window.localStorage.setItem(clave, JSON.stringify(datos))
    }, 600)
    return () => window.clearTimeout(temporizador)
  }, [datos, cargando, consultaId, clave])

  const cambiar = useCallback(<C extends keyof Borrador>(campo: C, valor: Borrador[C]): void => {
    setDatos((actual) => ({ ...actual, [campo]: valor }))
  }, [])

  function cambiarVital(campo: keyof SignosVitales, texto: string): void {
    const valor = texto === '' ? null : Number(texto)
    setDatos((actual) => {
      const signos = { ...actual.signos, [campo]: Number.isNaN(valor) ? null : valor }
      signos.imc = calcularImc(signos.peso, signos.altura)
      return { ...actual, signos }
    })
  }

  async function agregarDiagnostico(codigo: Cie10): Promise<void> {
    if (datos.diagnosticos.some((d) => d.codigoCie10 === codigo.codigo)) return
    const esPrimero = datos.diagnosticos.length === 0
    cambiar('diagnosticos', [
      ...datos.diagnosticos,
      {
        codigoCie10: codigo.codigo,
        descripcion: codigo.descripcion,
        esPrincipal: esPrimero,
        nota: null
      }
    ])
    try {
      setPlantillas(await pedir(api.catalogo.plantillasPorCie10(codigo.codigo)))
    } catch {
      setPlantillas([])
    }
  }

  /** Aplica un protocolo guardado por el propio doctor. Todo queda editable. */
  function aplicarPlantilla(plantilla: PlantillaTratamiento): void {
    setDatos((actual) => ({
      ...actual,
      tratamiento: plantilla.tratamiento ?? actual.tratamiento,
      recomendaciones: plantilla.recomendaciones ?? actual.recomendaciones,
      medicamentos: [
        ...actual.medicamentos,
        ...plantilla.items.map((item) => ({
          medicamentoId: item.medicamentoId,
          nombre: item.nombre,
          concentracion: item.concentracion,
          forma: item.forma,
          via: item.via,
          dosis: item.dosis,
          frecuencia: item.frecuencia,
          duracion: item.duracion,
          indicaciones: item.indicaciones
        }))
      ]
    }))
    setPlantillas([])
    notificar.info(`Protocolo «${plantilla.nombre}» aplicado. Revise y ajuste lo necesario.`)
  }

  async function guardar(): Promise<void> {
    setError(null)
    setGuardando(true)
    try {
      const carga: ConsultaInput = {
        pacienteId,
        citaId: citaId ?? null,
        motivo: datos.motivo,
        sintomas: datos.sintomas || null,
        exploracion: datos.exploracion || null,
        tratamiento: datos.tratamiento || null,
        observaciones: datos.observaciones || null,
        recomendaciones: datos.recomendaciones || null,
        proximaCitaFecha: datos.proximaCitaFecha || null,
        sinProximaCita: datos.sinProximaCita,
        signos: datos.signos,
        diagnosticos: datos.diagnosticos,
        medicamentos: datos.medicamentos
      }

      if (consultaId) {
        await pedir(api.consultas.actualizar(consultaId, carga))
        notificar.exito('Consulta actualizada')
      } else {
        await pedir(api.consultas.crear(carga))
        window.localStorage.removeItem(clave)
        notificar.exito('Consulta guardada')
      }
      navegar(`/pacientes/${pacienteId}`)
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    } finally {
      setGuardando(false)
    }
  }

  const imc = datos.signos.imc
  const conHistorial = anteriores.length > 0

  const alertasVitales = useMemo(
    () =>
      CAMPOS_VITALES.map(({ campo }) => ({
        campo,
        nivel: evaluarVital(campo, datos.signos[campo])
      })).filter((a) => a.nivel !== 'normal'),
    [datos.signos]
  )

  if (cargando) return <Cargando />
  if (!expediente) return <Vacio titulo="Paciente no encontrado" />

  const formulario = (
    <div className="flex flex-col gap-5">
      {error && <Aviso tono="critico">{error}</Aviso>}

      {borradorRestaurado && (
        <Aviso tono="info">
          Se recuperó un borrador sin guardar de esta consulta. Revíselo antes de guardar.
        </Aviso>
      )}

      <Bloque titulo="Signos vitales">
        <div className="grid grid-cols-3 gap-2.5">
          {CAMPOS_VITALES.map(({ campo, etiqueta, unidad, paso }) => {
            const nivel = evaluarVital(campo, datos.signos[campo])
            return (
              <Entrada
                key={campo}
                etiqueta={`${etiqueta} (${unidad})`}
                type="number"
                step={paso}
                inputMode="decimal"
                value={datos.signos[campo] ?? ''}
                onChange={(e) => cambiarVital(campo, e.target.value)}
                className={
                  nivel === 'critico'
                    ? '[&_input]:border-red-400'
                    : nivel === 'atencion'
                      ? '[&_input]:border-amber-400'
                      : ''
                }
              />
            )
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {imc !== null && (
            <Insignia tono="marca">
              IMC {imc} · {clasificarImc(imc)}
            </Insignia>
          )}
          {alertasVitales.length > 0 && (
            <span className="text-[0.8125rem] text-[var(--tinta-suave)]">
              {alertasVitales.length}{' '}
              {alertasVitales.length === 1 ? 'valor' : 'valores'} fuera del rango de referencia
            </span>
          )}
        </div>
      </Bloque>

      <Bloque titulo="Motivo de consulta" requerido>
        <AreaTexto
          rows={2}
          autoFocus
          value={datos.motivo}
          onChange={(e) => cambiar('motivo', e.target.value)}
          placeholder="¿Por qué acude el paciente?"
        />
      </Bloque>

      <Bloque titulo="Síntomas e historia actual">
        <AreaTexto
          rows={4}
          value={datos.sintomas}
          onChange={(e) => cambiar('sintomas', e.target.value)}
        />
      </Bloque>

      <Bloque titulo="Exploración física">
        <AreaTexto
          rows={4}
          value={datos.exploracion}
          onChange={(e) => cambiar('exploracion', e.target.value)}
        />
      </Bloque>

      <Bloque titulo="Diagnóstico">
        <BuscadorCie10 onElegir={(c) => void agregarDiagnostico(c)} />

        {datos.diagnosticos.length > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {datos.diagnosticos.map((d, indice) => (
              <li
                key={d.codigoCie10}
                className="flex items-center gap-2 rounded-lg border border-[var(--borde)] px-3 py-2"
              >
                <span className="shrink-0 font-mono text-[0.8125rem] font-semibold text-marca-700 oscuro:text-marca-400">
                  {d.codigoCie10}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-[var(--tinta)]">
                  {d.descripcion}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    cambiar(
                      'diagnosticos',
                      datos.diagnosticos.map((x, i) => ({ ...x, esPrincipal: i === indice }))
                    )
                  }
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold transition-colors ${
                    d.esPrincipal
                      ? 'bg-marca-100 text-marca-800 oscuro:bg-marca-900 oscuro:text-marca-200'
                      : 'text-[var(--tinta-tenue)] hover:text-[var(--tinta)]'
                  }`}
                >
                  Principal
                </button>
                <button
                  type="button"
                  onClick={() =>
                    cambiar(
                      'diagnosticos',
                      datos.diagnosticos.filter((_, i) => i !== indice)
                    )
                  }
                  aria-label="Quitar diagnóstico"
                  className="shrink-0 rounded p-0.5 text-[var(--tinta-tenue)] hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {plantillas.length > 0 && (
          <div className="mt-2.5 rounded-lg border border-marca-300 bg-marca-50 px-3 py-2.5 oscuro:border-marca-700 oscuro:bg-marca-900/40">
            <p className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-marca-800 oscuro:text-marca-200">
              <Sparkles size={14} />
              Sus protocolos guardados para este diagnóstico
            </p>
            <div className="flex flex-wrap gap-1.5">
              {plantillas.map((p) => (
                <Boton key={p.id} tamano="sm" onClick={() => aplicarPlantilla(p)}>
                  {p.nombre}
                </Boton>
              ))}
            </div>
          </div>
        )}
      </Bloque>

      <Bloque titulo="Tratamiento">
        <AreaTexto
          rows={3}
          value={datos.tratamiento}
          onChange={(e) => cambiar('tratamiento', e.target.value)}
        />
      </Bloque>

      <Bloque titulo="Medicamentos">
        <EditorMedicamentos
          medicamentos={datos.medicamentos}
          alergias={expediente.alergias}
          onCambiar={(lista) => cambiar('medicamentos', lista)}
        />
      </Bloque>

      <Bloque titulo="Observaciones">
        <AreaTexto
          rows={3}
          value={datos.observaciones}
          onChange={(e) => cambiar('observaciones', e.target.value)}
        />
      </Bloque>

      <Bloque titulo="Recomendaciones">
        <AreaTexto
          rows={3}
          value={datos.recomendaciones}
          onChange={(e) => cambiar('recomendaciones', e.target.value)}
        />
      </Bloque>

      <Bloque titulo="Próxima cita" requerido>
        <div className="flex items-center gap-4">
          <Entrada
            type="date"
            className="w-52"
            disabled={datos.sinProximaCita}
            value={datos.proximaCitaFecha}
            onChange={(e) => cambiar('proximaCitaFecha', e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-2 text-[0.875rem] text-[var(--tinta)]">
            <input
              type="checkbox"
              checked={datos.sinProximaCita}
              onChange={(e) => {
                cambiar('sinProximaCita', e.target.checked)
                if (e.target.checked) cambiar('proximaCitaFecha', '')
              }}
              className="h-4 w-4 accent-[var(--color-marca-600)]"
            />
            Sin próxima cita
          </label>
        </div>
      </Bloque>
    </div>
  )

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[92rem] flex-col px-8 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Boton
            variante="fantasma"
            tamano="sm"
            iconoIzquierda={<ArrowLeft size={15} />}
            onClick={() => navegar(`/pacientes/${pacienteId}`)}
          >
            Expediente
          </Boton>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-[var(--tinta)]">
              {consultaId ? 'Editar consulta' : 'Nueva consulta'}
            </h1>
            <p className="truncate text-[0.8125rem] text-[var(--tinta-suave)]">
              {expediente.paciente.nombreCompleto} · {expediente.paciente.numeroExpediente}
            </p>
          </div>
        </div>
        <Boton
          variante="primario"
          iconoIzquierda={<Save size={16} />}
          cargando={guardando}
          onClick={() => void guardar()}
        >
          Guardar consulta
        </Boton>
      </div>

      {expediente.alergias.filter((a) => a.activa).length > 0 && (
        <div className="mb-4">
          <Aviso tono="critico">
            Alergias del paciente:{' '}
            {expediente.alergias
              .filter((a) => a.activa)
              .map((a) => `${a.sustancia} (${a.gravedad})`)
              .join(' · ')}
          </Aviso>
        </div>
      )}

      {/* Con historial previo, el doctor escribe mientras consulta lo anterior.
          Sin historial, una sola columna más ancha resulta más cómoda. */}
      {conHistorial ? (
        <div className="flex min-h-0 flex-1 gap-5">
          <div className="min-w-0 flex-1">{formulario}</div>
          <aside className="desplazable w-[26rem] shrink-0">
            <h2 className="mb-2.5 text-[0.75rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
              Consultas anteriores
            </h2>
            <div className="flex flex-col gap-3">
              {anteriores.map((c) => (
                <div key={c.id} className="superficie px-4 py-3">
                  <p className="mb-1.5 text-[0.75rem] font-semibold text-[var(--tinta-tenue)]">
                    {formatearFecha(c.fecha)}
                  </p>
                  <VistaConsulta consulta={c} compacto />
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl">{formulario}</div>
      )}
    </div>
  )
}

function Bloque({
  titulo,
  requerido = false,
  children
}: {
  titulo: string
  requerido?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="superficie px-4 py-3.5">
      <h2 className="mb-2.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
        {titulo}
        {requerido && <span className="ml-0.5 text-red-500">*</span>}
      </h2>
      {children}
    </section>
  )
}
