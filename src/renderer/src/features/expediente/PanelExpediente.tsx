import { useCallback, useEffect, useState } from 'react'
import {
  CalendarClock,
  FileText,
  FlaskConical,
  Image as IconoImagen,
  Paperclip,
  Pill,
  Plus,
  Printer,
  Send,
  Trash2,
  X
} from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { AreaTexto, Entrada, Selector } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Cargando, Insignia, Vacio } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { useSesion } from '../../app/Sesion'
import { formatearFecha } from '@shared/lib/fecha'
import { CATEGORIAS_EXAMEN } from '@shared/types'
import type {
  Adjunto,
  CategoriaExamen,
  ExpedienteResumen,
  Incapacidad,
  MedicacionCronica,
  Referencia
} from '@shared/types'

/**
 * Todo lo que cuelga del paciente y no de una consulta concreta: los estudios
 * que trae, las constancias que se le entregan y la medicacion que ya toma.
 */

type Pestana = 'estudios' | 'incapacidades' | 'referencias' | 'cronica'

const PESTANAS: { id: Pestana; etiqueta: string; icono: typeof Paperclip }[] = [
  { id: 'estudios', etiqueta: 'Estudios y archivos', icono: Paperclip },
  { id: 'incapacidades', etiqueta: 'Incapacidades', icono: CalendarClock },
  { id: 'referencias', etiqueta: 'Referencias', icono: Send },
  { id: 'cronica', etiqueta: 'Medicación permanente', icono: Pill }
]

export function PanelExpediente({
  expediente,
  onCambio
}: {
  expediente: ExpedienteResumen
  onCambio: () => Promise<void> | void
}): React.JSX.Element {
  const pacienteId = expediente.paciente.id
  const [pestana, setPestana] = useState<Pestana>('estudios')

  return (
    <section className="superficie overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b border-[var(--borde)] px-2 pt-2">
        {PESTANAS.map((p) => {
          const Icono = p.icono
          const activa = pestana === p.id
          return (
            <button
              key={p.id}
              onClick={() => setPestana(p.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-[0.875rem] font-medium transition-colors ${
                activa
                  ? 'bg-[var(--lienzo)] text-marca-700 oscuro:text-marca-300'
                  : 'text-[var(--tinta-suave)] hover:text-[var(--tinta)]'
              }`}
            >
              <Icono size={15} />
              {p.etiqueta}
            </button>
          )
        })}
      </div>

      <div className="bg-[var(--lienzo)] p-4">
        {pestana === 'estudios' && <Estudios pacienteId={pacienteId} />}
        {pestana === 'incapacidades' && <Incapacidades pacienteId={pacienteId} />}
        {pestana === 'referencias' && <Referencias pacienteId={pacienteId} />}
        {pestana === 'cronica' && (
          <MedicacionPermanente pacienteId={pacienteId} onCambio={onCambio} />
        )}
      </div>
    </section>
  )
}

/** Hook comun: carga una lista, la recarga a demanda y avisa de los errores. */
function useLista<T>(cargar: () => Promise<T[]>): {
  datos: T[]
  cargando: boolean
  recargar: () => Promise<void>
} {
  const [datos, setDatos] = useState<T[]>([])
  const [cargando, setCargando] = useState(true)
  const notificar = useNotificar()

  const recargar = useCallback(async () => {
    try {
      setDatos(await cargar())
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setCargando(false)
    }
    // `cargar` se recrea en cada render del padre; la dependencia real es el paciente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { datos, cargando, recargar }
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ICONO_CATEGORIA: Record<CategoriaExamen, typeof FlaskConical> = {
  laboratorio: FlaskConical,
  imagen: IconoImagen,
  procedimiento: FileText,
  otro: FileText
}

// ===== Estudios y archivos =====

function Estudios({ pacienteId }: { pacienteId: number }): React.JSX.Element {
  const notificar = useNotificar()
  const { puede } = useSesion()
  const puedeAdjuntar = puede('expediente.adjuntar')

  const { datos, cargando, recargar } = useLista<Adjunto>(() =>
    pedir(api.adjuntos.dePaciente(pacienteId))
  )
  const [agregando, setAgregando] = useState(false)
  const [viendo, setViendo] = useState<{ adjunto: Adjunto; dataUrl: string } | null>(null)

  async function ver(adjunto: Adjunto): Promise<void> {
    // Las imágenes se muestran dentro del programa; lo demás lo abre Windows
    // con el programa que el usuario tenga asociado.
    if (!adjunto.esImagen) {
      try {
        await pedir(api.adjuntos.abrir(adjunto.id))
      } catch (error) {
        notificar.error(mensajeDeError(error))
      }
      return
    }
    try {
      setViendo({ adjunto, dataUrl: await pedir(api.adjuntos.imagen(adjunto.id)) })
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  async function eliminar(adjunto: Adjunto): Promise<void> {
    try {
      await pedir(api.adjuntos.eliminar(adjunto.id))
      notificar.exito('Archivo eliminado del expediente')
      await recargar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  if (cargando) return <Cargando texto="Cargando estudios…" />

  return (
    <>
      <div className="mb-3 flex justify-end">
        {puedeAdjuntar && (
          <Boton
            variante="primario"
            tamano="sm"
            iconoIzquierda={<Plus size={15} />}
            onClick={() => setAgregando(true)}
          >
            Agregar estudio
          </Boton>
        )}
      </div>

      {datos.length === 0 ? (
        <Vacio
          icono={<Paperclip size={28} />}
          titulo="Sin estudios adjuntos"
          descripcion="Agregue resultados de laboratorio, radiografías o cualquier documento del paciente."
        />
      ) : (
        <div className="grid gap-2">
          {datos.map((a) => {
            const Icono = ICONO_CATEGORIA[a.categoria]
            return (
              <div
                key={a.id}
                className="superficie flex items-start gap-3 px-3.5 py-3"
              >
                <div className="mt-0.5 shrink-0 text-[var(--tinta-tenue)]">
                  <Icono size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => void ver(a)}
                    className="text-left text-[0.9375rem] font-medium text-marca-700 hover:underline oscuro:text-marca-300"
                  >
                    {a.titulo}
                  </button>
                  <div className="mt-0.5 text-[0.78125rem] text-[var(--tinta-tenue)]">
                    {formatearFecha(a.fechaEstudio ?? a.creadoEn)} · {a.nombreOriginal} ·{' '}
                    {formatearTamano(a.tamanoBytes)}
                    {a.usuarioNombre ? ` · ${a.usuarioNombre}` : ''}
                  </div>
                  {a.descripcion && (
                    <p className="mt-1.5 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-[var(--tinta-suave)]">
                      {a.descripcion}
                    </p>
                  )}
                </div>
                <Insignia tono="neutro">{a.categoria}</Insignia>
                {puedeAdjuntar && (
                  <button
                    onClick={() => void eliminar(a)}
                    aria-label={`Eliminar ${a.titulo}`}
                    className="shrink-0 rounded p-1 text-[var(--tinta-tenue)] transition-colors hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <FormularioAdjunto
        abierto={agregando}
        pacienteId={pacienteId}
        onCerrar={() => setAgregando(false)}
        onGuardado={recargar}
      />

      <Modal
        abierto={viendo !== null}
        titulo={viendo?.adjunto.titulo ?? ''}
        descripcion={viendo?.adjunto.descripcion ?? undefined}
        ancho="xl"
        onCerrar={() => setViendo(null)}
        pie={
          <Boton
            variante="secundario"
            onClick={() => viendo && void pedir(api.adjuntos.abrir(viendo.adjunto.id))}
          >
            Abrir fuera del programa
          </Boton>
        }
      >
        {viendo && (
          <img
            src={viendo.dataUrl}
            alt={viendo.adjunto.titulo}
            className="mx-auto max-h-[65vh] w-auto rounded-lg"
          />
        )}
      </Modal>
    </>
  )
}

export function FormularioAdjunto({
  abierto,
  pacienteId,
  consultaId,
  onCerrar,
  onGuardado
}: {
  abierto: boolean
  pacienteId: number
  consultaId?: number | null
  onCerrar: () => void
  onGuardado: () => Promise<void> | void
}): React.JSX.Element {
  const notificar = useNotificar()
  const [archivo, setArchivo] = useState<{ ruta: string; nombre: string; tamanoBytes: number } | null>(
    null
  )
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState<CategoriaExamen>('laboratorio')
  const [descripcion, setDescripcion] = useState('')
  const [fechaEstudio, setFechaEstudio] = useState('')
  const [guardando, setGuardando] = useState(false)

  function limpiar(): void {
    setArchivo(null)
    setTitulo('')
    setCategoria('laboratorio')
    setDescripcion('')
    setFechaEstudio('')
  }

  async function elegir(): Promise<void> {
    try {
      const elegidos = await pedir(api.adjuntos.elegir())
      if (elegidos.length === 0) return
      setArchivo(elegidos[0])
      // El nombre del archivo suele describir el estudio: se propone como título.
      if (!titulo) setTitulo(elegidos[0].nombre.replace(/\.[^.]+$/, ''))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  async function guardar(): Promise<void> {
    if (!archivo) return
    setGuardando(true)
    try {
      await pedir(
        api.adjuntos.agregar(
          {
            pacienteId,
            consultaId: consultaId ?? null,
            categoria,
            titulo: titulo.trim(),
            descripcion: descripcion.trim() || null,
            fechaEstudio: fechaEstudio || null
          },
          archivo.ruta
        )
      )
      notificar.exito('Estudio agregado al expediente')
      limpiar()
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
      titulo="Agregar estudio al expediente"
      descripcion="El archivo se copia a la carpeta del paciente, así que puede mover o borrar el original sin perderlo."
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
            disabled={!archivo || titulo.trim().length < 2}
            onClick={() => void guardar()}
          >
            Agregar
          </Boton>
        </>
      }
    >
      <div className="grid gap-3">
        <div>
          <span className="etiqueta">Archivo</span>
          {archivo ? (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--borde)] bg-[var(--lienzo)] px-3 py-2">
              <Paperclip size={15} className="shrink-0 text-[var(--tinta-tenue)]" />
              <span className="min-w-0 flex-1 truncate text-[0.875rem]">{archivo.nombre}</span>
              <span className="shrink-0 text-[0.78125rem] text-[var(--tinta-tenue)]">
                {formatearTamano(archivo.tamanoBytes)}
              </span>
              <button
                onClick={() => setArchivo(null)}
                aria-label="Quitar archivo"
                className="shrink-0 rounded p-0.5 text-[var(--tinta-tenue)] hover:text-[var(--tinta)]"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <Boton variante="secundario" className="w-full" onClick={() => void elegir()}>
              Seleccionar archivo…
            </Boton>
          )}
        </div>

        <Entrada
          etiqueta="Título del estudio"
          requerido
          placeholder="Hemograma completo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Selector
            etiqueta="Tipo"
            opciones={CATEGORIAS_EXAMEN.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaExamen)}
          />
          <Entrada
            etiqueta="Fecha del estudio"
            type="date"
            ayuda="La fecha en que se realizó, no la de hoy"
            value={fechaEstudio}
            onChange={(e) => setFechaEstudio(e.target.value)}
          />
        </div>

        <AreaTexto
          etiqueta="Interpretación o descripción"
          rows={4}
          placeholder="Qué muestra el estudio y qué significa para este paciente."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>
    </Modal>
  )
}

// ===== Incapacidades =====

function Incapacidades({ pacienteId }: { pacienteId: number }): React.JSX.Element {
  const notificar = useNotificar()
  const { puede } = useSesion()
  const puedeEmitir = puede('documentos.incapacidad')

  const { datos, cargando, recargar } = useLista<Incapacidad>(() =>
    pedir(api.incapacidades.listar(pacienteId))
  )
  const [creando, setCreando] = useState(false)
  const [anulando, setAnulando] = useState<Incapacidad | null>(null)

  if (cargando) return <Cargando texto="Cargando incapacidades…" />

  return (
    <>
      <div className="mb-3 flex justify-end">
        {puedeEmitir && (
          <Boton
            variante="primario"
            tamano="sm"
            iconoIzquierda={<Plus size={15} />}
            onClick={() => setCreando(true)}
          >
            Nueva incapacidad
          </Boton>
        )}
      </div>

      {datos.length === 0 ? (
        <Vacio
          icono={<CalendarClock size={28} />}
          titulo="Sin incapacidades emitidas"
          descripcion="Las constancias que emita quedarán aquí, numeradas y con su copia en PDF."
        />
      ) : (
        <div className="grid gap-2">
          {datos.map((i) => (
            <div key={i.id} className="superficie px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[0.8125rem] font-semibold text-[var(--tinta)]">
                  {i.folio}
                </span>
                <Insignia tono={i.estado === 'anulada' ? 'critico' : 'exito'}>
                  {i.estado === 'anulada' ? 'Anulada' : 'Vigente'}
                </Insignia>
                <span className="text-[0.875rem] text-[var(--tinta-suave)]">
                  {i.dias} {i.dias === 1 ? 'día' : 'días'} · {formatearFecha(i.desde)} a{' '}
                  {formatearFecha(i.hasta)}
                </span>
                <div className="ml-auto flex gap-1">
                  <Boton
                    tamano="sm"
                    variante="fantasma"
                    iconoIzquierda={<Printer size={14} />}
                    onClick={() =>
                      void (async () => {
                        try {
                          const ruta = await pedir(api.incapacidades.imprimir(i.id))
                          await pedir(api.documentos.abrir(ruta))
                        } catch (error) {
                          notificar.error(mensajeDeError(error))
                        }
                      })()
                    }
                  >
                    Imprimir
                  </Boton>
                  {puedeEmitir && i.estado === 'vigente' && (
                    <Boton tamano="sm" variante="fantasma" onClick={() => setAnulando(i)}>
                      Anular
                    </Boton>
                  )}
                </div>
              </div>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--tinta-suave)]">
                {i.motivo}
              </p>
              {i.estado === 'anulada' && i.motivoAnulacion && (
                <p className="mt-1 text-[0.8125rem] text-red-600 oscuro:text-red-400">
                  Anulada: {i.motivoAnulacion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <FormularioIncapacidad
        abierto={creando}
        pacienteId={pacienteId}
        onCerrar={() => setCreando(false)}
        onGuardado={recargar}
      />

      <DialogoAnular
        documento={anulando}
        etiqueta="incapacidad"
        onCerrar={() => setAnulando(null)}
        onAnular={async (motivo) => {
          if (!anulando) return
          await pedir(api.incapacidades.anular(anulando.id, motivo))
          await recargar()
        }}
      />
    </>
  )
}

export function FormularioIncapacidad({
  abierto,
  pacienteId,
  consultaId,
  diagnosticoSugerido,
  onCerrar,
  onGuardado
}: {
  abierto: boolean
  pacienteId: number
  consultaId?: number | null
  diagnosticoSugerido?: { codigo: string; descripcion: string } | null
  onCerrar: () => void
  onGuardado: () => Promise<void> | void
}): React.JSX.Element {
  const notificar = useNotificar()
  const hoy = new Date().toISOString().slice(0, 10)

  const [desde, setDesde] = useState(hoy)
  const [dias, setDias] = useState('1')
  const [motivo, setMotivo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)

  const numeroDias = Number(dias)
  const valido = numeroDias >= 1 && numeroDias <= 365 && motivo.trim().length > 2 && desde !== ''

  // El último día se muestra ya calculado: es el dato que el paciente lleva a
  // su trabajo y no debe quedar a interpretación de nadie.
  const hasta = (() => {
    if (!desde || numeroDias < 1) return null
    const fecha = new Date(`${desde}T12:00:00`)
    fecha.setDate(fecha.getDate() + numeroDias - 1)
    return fecha.toISOString().slice(0, 10)
  })()

  async function guardar(): Promise<void> {
    setGuardando(true)
    try {
      const creada = await pedir(
        api.incapacidades.crear({
          pacienteId,
          consultaId: consultaId ?? null,
          desde,
          dias: numeroDias,
          motivo: motivo.trim(),
          observaciones: observaciones.trim() || null,
          codigoCie10: diagnosticoSugerido?.codigo ?? null,
          diagnostico: diagnosticoSugerido?.descripcion ?? null
        })
      )
      notificar.exito(`Incapacidad ${creada.folio} emitida`)
      setDias('1')
      setMotivo('')
      setObservaciones('')
      await onGuardado()
      onCerrar()
      if (creada.archivoPath) await pedir(api.documentos.abrir(creada.archivoPath))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Emitir constancia de incapacidad"
      descripcion="Se numera automáticamente y se guarda una copia en PDF en el expediente."
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={!valido}
            onClick={() => void guardar()}
          >
            Emitir e imprimir
          </Boton>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Entrada
            etiqueta="Desde"
            type="date"
            requerido
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
          <Entrada
            etiqueta="Días de reposo"
            type="number"
            min={1}
            max={365}
            requerido
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            ayuda={hasta ? `Hasta el ${formatearFecha(hasta)} inclusive` : undefined}
          />
        </div>

        {diagnosticoSugerido && (
          <div className="rounded-lg border border-[var(--borde)] bg-[var(--lienzo)] px-3 py-2 text-[0.875rem]">
            <span className="text-[var(--tinta-tenue)]">Diagnóstico: </span>
            {diagnosticoSugerido.codigo} — {diagnosticoSugerido.descripcion}
          </div>
        )}

        <AreaTexto
          etiqueta="Motivo"
          requerido
          rows={3}
          placeholder="Condición que justifica el reposo."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <AreaTexto
          etiqueta="Observaciones"
          rows={2}
          placeholder="Indicaciones o restricciones adicionales."
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>
    </Modal>
  )
}

// ===== Referencias =====

function Referencias({ pacienteId }: { pacienteId: number }): React.JSX.Element {
  const notificar = useNotificar()
  const { puede } = useSesion()
  const puedeEmitir = puede('documentos.referencia')

  const { datos, cargando, recargar } = useLista<Referencia>(() =>
    pedir(api.referencias.listar(pacienteId))
  )
  const [creando, setCreando] = useState(false)
  const [anulando, setAnulando] = useState<Referencia | null>(null)

  if (cargando) return <Cargando texto="Cargando referencias…" />

  return (
    <>
      <div className="mb-3 flex justify-end">
        {puedeEmitir && (
          <Boton
            variante="primario"
            tamano="sm"
            iconoIzquierda={<Plus size={15} />}
            onClick={() => setCreando(true)}
          >
            Nueva referencia
          </Boton>
        )}
      </div>

      {datos.length === 0 ? (
        <Vacio
          icono={<Send size={28} />}
          titulo="Sin referencias emitidas"
          descripcion="Las hojas de referencia a otro médico o especialista quedarán aquí."
        />
      ) : (
        <div className="grid gap-2">
          {datos.map((r) => (
            <div key={r.id} className="superficie px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[0.8125rem] font-semibold text-[var(--tinta)]">
                  {r.folio}
                </span>
                {r.urgente && <Insignia tono="critico">Urgente</Insignia>}
                <Insignia tono={r.estado === 'anulada' ? 'critico' : 'exito'}>
                  {r.estado === 'anulada' ? 'Anulada' : 'Vigente'}
                </Insignia>
                <span className="text-[0.875rem] font-medium text-[var(--tinta)]">
                  {r.dirigidaA}
                </span>
                <span className="text-[0.875rem] text-[var(--tinta-tenue)]">
                  {[r.especialidad, r.institucion].filter(Boolean).join(' · ')} ·{' '}
                  {formatearFecha(r.fecha)}
                </span>
                <div className="ml-auto flex gap-1">
                  <Boton
                    tamano="sm"
                    variante="fantasma"
                    iconoIzquierda={<Printer size={14} />}
                    onClick={() =>
                      void (async () => {
                        try {
                          const ruta = await pedir(api.referencias.imprimir(r.id))
                          await pedir(api.documentos.abrir(ruta))
                        } catch (error) {
                          notificar.error(mensajeDeError(error))
                        }
                      })()
                    }
                  >
                    Imprimir
                  </Boton>
                  {puedeEmitir && r.estado === 'vigente' && (
                    <Boton tamano="sm" variante="fantasma" onClick={() => setAnulando(r)}>
                      Anular
                    </Boton>
                  )}
                </div>
              </div>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--tinta-suave)]">
                {r.motivo}
              </p>
              {r.estado === 'anulada' && r.motivoAnulacion && (
                <p className="mt-1 text-[0.8125rem] text-red-600 oscuro:text-red-400">
                  Anulada: {r.motivoAnulacion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <FormularioReferencia
        abierto={creando}
        pacienteId={pacienteId}
        onCerrar={() => setCreando(false)}
        onGuardado={recargar}
      />

      <DialogoAnular
        documento={anulando}
        etiqueta="referencia"
        onCerrar={() => setAnulando(null)}
        onAnular={async (motivo) => {
          if (!anulando) return
          await pedir(api.referencias.anular(anulando.id, motivo))
          await recargar()
        }}
      />
    </>
  )
}

export function FormularioReferencia({
  abierto,
  pacienteId,
  consultaId,
  diagnosticoSugerido,
  resumenSugerido,
  onCerrar,
  onGuardado
}: {
  abierto: boolean
  pacienteId: number
  consultaId?: number | null
  diagnosticoSugerido?: { codigo: string; descripcion: string } | null
  resumenSugerido?: string | null
  onCerrar: () => void
  onGuardado: () => Promise<void> | void
}): React.JSX.Element {
  const notificar = useNotificar()
  const [dirigidaA, setDirigidaA] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [institucion, setInstitucion] = useState('')
  const [motivo, setMotivo] = useState('')
  const [resumen, setResumen] = useState('')
  const [hallazgos, setHallazgos] = useState('')
  const [urgente, setUrgente] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // El resumen de la consulta que origina la referencia se propone como punto
  // de partida; el doctor lo ajusta antes de emitirla.
  useEffect(() => {
    if (abierto && resumenSugerido && !resumen) setResumen(resumenSugerido)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const valido = dirigidaA.trim().length > 2 && motivo.trim().length > 2

  async function guardar(): Promise<void> {
    setGuardando(true)
    try {
      const creada = await pedir(
        api.referencias.crear({
          pacienteId,
          consultaId: consultaId ?? null,
          dirigidaA: dirigidaA.trim(),
          especialidad: especialidad.trim() || null,
          institucion: institucion.trim() || null,
          motivo: motivo.trim(),
          resumenClinico: resumen.trim() || null,
          hallazgos: hallazgos.trim() || null,
          codigoCie10: diagnosticoSugerido?.codigo ?? null,
          diagnostico: diagnosticoSugerido?.descripcion ?? null,
          urgente
        })
      )
      notificar.exito(`Referencia ${creada.folio} emitida`)
      setDirigidaA('')
      setEspecialidad('')
      setInstitucion('')
      setMotivo('')
      setResumen('')
      setHallazgos('')
      setUrgente(false)
      await onGuardado()
      onCerrar()
      if (creada.archivoPath) await pedir(api.documentos.abrir(creada.archivoPath))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Emitir hoja de referencia"
      descripcion="Se numera automáticamente y se guarda una copia en PDF en el expediente."
      ancho="lg"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={!valido}
            onClick={() => void guardar()}
          >
            Emitir e imprimir
          </Boton>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          <Entrada
            etiqueta="Dirigida a"
            requerido
            placeholder="Dr. Ramón Ortega"
            value={dirigidaA}
            onChange={(e) => setDirigidaA(e.target.value)}
          />
          <Entrada
            etiqueta="Especialidad"
            placeholder="Ortopedia"
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
          />
          <Entrada
            etiqueta="Institución"
            placeholder="Hospital Regional"
            value={institucion}
            onChange={(e) => setInstitucion(e.target.value)}
          />
        </div>

        {diagnosticoSugerido && (
          <div className="rounded-lg border border-[var(--borde)] bg-[var(--lienzo)] px-3 py-2 text-[0.875rem]">
            <span className="text-[var(--tinta-tenue)]">Diagnóstico: </span>
            {diagnosticoSugerido.codigo} — {diagnosticoSugerido.descripcion}
          </div>
        )}

        <AreaTexto
          etiqueta="Motivo de la referencia"
          requerido
          rows={2}
          placeholder="Por qué necesita valoración de otro médico."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <AreaTexto
          etiqueta="Resumen clínico"
          rows={4}
          placeholder="Antecedentes y evolución que el especialista necesita conocer."
          value={resumen}
          onChange={(e) => setResumen(e.target.value)}
        />
        <AreaTexto
          etiqueta="Hallazgos y estudios realizados"
          rows={3}
          placeholder="Exploración, laboratorios e imágenes ya practicados."
          value={hallazgos}
          onChange={(e) => setHallazgos(e.target.value)}
        />

        <label className="flex cursor-pointer items-center gap-2 text-[0.875rem]">
          <input
            type="checkbox"
            checked={urgente}
            onChange={(e) => setUrgente(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-red-600"
          />
          Marcar como urgente
        </label>
      </div>
    </Modal>
  )
}

// ===== Medicación permanente =====

function MedicacionPermanente({
  pacienteId,
  onCambio
}: {
  pacienteId: number
  onCambio: () => Promise<void> | void
}): React.JSX.Element {
  const notificar = useNotificar()
  const { puede } = useSesion()
  const puedeEditar = puede('pacientes.editar_clinico')

  const { datos, cargando, recargar } = useLista<MedicacionCronica>(() =>
    pedir(api.cronica.listar(pacienteId))
  )
  const [agregando, setAgregando] = useState(false)

  async function ejecutar(operacion: Promise<unknown>, exito: string): Promise<void> {
    try {
      await operacion
      notificar.exito(exito)
      await recargar()
      await onCambio()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  if (cargando) return <Cargando texto="Cargando medicación…" />

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">
          Lo que el paciente ya toma por su enfermedad de base. Se muestra al atender, pero no
          entra solo en la receta.
        </p>
        {puedeEditar && (
          <Boton
            variante="primario"
            tamano="sm"
            iconoIzquierda={<Plus size={15} />}
            onClick={() => setAgregando(true)}
          >
            Agregar
          </Boton>
        )}
      </div>

      {datos.length === 0 ? (
        <Vacio
          icono={<Pill size={28} />}
          titulo="Sin medicación permanente"
          descripcion="Registre aquí los medicamentos que el paciente toma de forma continua."
        />
      ) : (
        <div className="grid gap-2">
          {datos.map((m) => (
            <div
              key={m.id}
              className={`superficie flex items-start gap-3 px-3.5 py-3 ${m.activa ? '' : 'opacity-55'}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.9375rem] font-medium text-[var(--tinta)]">
                    {[m.nombre, m.concentracion].filter(Boolean).join(' ')}
                  </span>
                  {!m.activa && <Insignia tono="neutro">Suspendido</Insignia>}
                </div>
                <div className="mt-0.5 text-[0.875rem] text-[var(--tinta-suave)]">
                  {[m.dosis, m.frecuencia, m.via].filter(Boolean).join(' · ')}
                </div>
                {m.motivo && (
                  <div className="mt-0.5 text-[0.8125rem] text-[var(--tinta-tenue)]">
                    Por: {m.motivo}
                    {m.desde ? ` · desde ${formatearFecha(m.desde)}` : ''}
                  </div>
                )}
                {m.indicaciones && (
                  <p className="mt-1 text-[0.8125rem] text-[var(--tinta-tenue)]">
                    {m.indicaciones}
                  </p>
                )}
              </div>
              {puedeEditar && (
                <div className="flex shrink-0 gap-1">
                  <Boton
                    tamano="sm"
                    variante="fantasma"
                    onClick={() =>
                      void ejecutar(
                        pedir(api.cronica.suspender(m.id, !m.activa)),
                        m.activa ? 'Medicamento suspendido' : 'Medicamento reactivado'
                      )
                    }
                  >
                    {m.activa ? 'Suspender' : 'Reactivar'}
                  </Boton>
                  <button
                    onClick={() =>
                      void ejecutar(pedir(api.cronica.eliminar(m.id)), 'Medicamento eliminado')
                    }
                    aria-label={`Eliminar ${m.nombre}`}
                    className="rounded p-1 text-[var(--tinta-tenue)] transition-colors hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <FormularioCronica
        abierto={agregando}
        pacienteId={pacienteId}
        onCerrar={() => setAgregando(false)}
        onGuardado={async () => {
          await recargar()
          await onCambio()
        }}
      />
    </>
  )
}

function FormularioCronica({
  abierto,
  pacienteId,
  onCerrar,
  onGuardado
}: {
  abierto: boolean
  pacienteId: number
  onCerrar: () => void
  onGuardado: () => Promise<void> | void
}): React.JSX.Element {
  const notificar = useNotificar()
  const [nombre, setNombre] = useState('')
  const [concentracion, setConcentracion] = useState('')
  const [dosis, setDosis] = useState('')
  const [frecuencia, setFrecuencia] = useState('')
  const [via, setVia] = useState('')
  const [motivo, setMotivo] = useState('')
  const [desde, setDesde] = useState('')
  const [indicaciones, setIndicaciones] = useState('')
  const [guardando, setGuardando] = useState(false)

  const valido = nombre.trim().length > 1 && dosis.trim() !== '' && frecuencia.trim() !== ''

  async function guardar(): Promise<void> {
    setGuardando(true)
    try {
      await pedir(
        api.cronica.agregar({
          pacienteId,
          nombre: nombre.trim(),
          concentracion: concentracion.trim() || null,
          dosis: dosis.trim(),
          frecuencia: frecuencia.trim(),
          via: via.trim() || null,
          motivo: motivo.trim() || null,
          desde: desde || null,
          indicaciones: indicaciones.trim() || null
        })
      )
      notificar.exito('Medicamento agregado')
      setNombre('')
      setConcentracion('')
      setDosis('')
      setFrecuencia('')
      setVia('')
      setMotivo('')
      setDesde('')
      setIndicaciones('')
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
      titulo="Agregar medicación permanente"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={!valido}
            onClick={() => void guardar()}
          >
            Agregar
          </Boton>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Entrada
            etiqueta="Medicamento"
            requerido
            placeholder="Losartán"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Entrada
            etiqueta="Concentración"
            placeholder="50 mg"
            value={concentracion}
            onChange={(e) => setConcentracion(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Entrada
            etiqueta="Dosis"
            requerido
            placeholder="1 tableta"
            value={dosis}
            onChange={(e) => setDosis(e.target.value)}
          />
          <Entrada
            etiqueta="Frecuencia"
            requerido
            placeholder="Cada 24 horas"
            value={frecuencia}
            onChange={(e) => setFrecuencia(e.target.value)}
          />
          <Entrada
            etiqueta="Vía"
            placeholder="Oral"
            value={via}
            onChange={(e) => setVia(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Entrada
            etiqueta="Enfermedad de base"
            placeholder="Hipertensión arterial"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <Entrada
            etiqueta="La toma desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <AreaTexto
          etiqueta="Indicaciones"
          rows={2}
          value={indicaciones}
          onChange={(e) => setIndicaciones(e.target.value)}
        />
      </div>
    </Modal>
  )
}

// ===== Anulación =====

function DialogoAnular<T extends { folio: string }>({
  documento,
  etiqueta,
  onCerrar,
  onAnular
}: {
  documento: T | null
  etiqueta: string
  onCerrar: () => void
  onAnular: (motivo: string) => Promise<void>
}): React.JSX.Element {
  const notificar = useNotificar()
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function confirmar(): Promise<void> {
    setGuardando(true)
    try {
      await onAnular(motivo.trim())
      notificar.exito(`Documento anulado`)
      setMotivo('')
      onCerrar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={documento !== null}
      titulo={`Anular ${etiqueta} ${documento?.folio ?? ''}`}
      descripcion="El documento no se borra: queda marcado como anulado y su copia se vuelve a imprimir con el sello."
      onCerrar={() => {
        setMotivo('')
        onCerrar()
      }}
      pie={
        <>
          <Boton
            variante="fantasma"
            onClick={() => {
              setMotivo('')
              onCerrar()
            }}
          >
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            cargando={guardando}
            disabled={motivo.trim().length < 3}
            onClick={() => void confirmar()}
          >
            Anular
          </Boton>
        </>
      }
    >
      <AreaTexto
        etiqueta="Motivo de la anulación"
        requerido
        rows={3}
        placeholder="Por qué se anula este documento."
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
    </Modal>
  )
}
