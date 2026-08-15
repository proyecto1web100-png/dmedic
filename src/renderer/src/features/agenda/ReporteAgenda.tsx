import { useEffect, useState } from 'react'
import { FileDown, Printer } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Entrada, Selector } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Cargando, Insignia } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { useSesion } from '../../app/Sesion'
import { formatearFecha, formatearFechaLarga, hoyIso } from '@shared/lib/fecha'
import type { PeriodoReporte, ReporteCitas } from '@shared/types'

const PERIODOS: { valor: PeriodoReporte; etiqueta: string }[] = [
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' }
]

/**
 * La secretaria imprime la agenda de cada doctor y se la entrega. Al no haber
 * red entre las computadoras, el papel es el canal.
 */
export function ReporteAgenda({
  fechaInicial,
  onCerrar
}: {
  fechaInicial: string
  onCerrar: () => void
}): React.JSX.Element {
  const notificar = useNotificar()
  const { puede } = useSesion()
  const eligeDoctor = puede('citas.gestionar_todas')

  const [periodo, setPeriodo] = useState<PeriodoReporte>('dia')
  const [referencia, setReferencia] = useState(fechaInicial || hoyIso())
  const [doctorId, setDoctorId] = useState<number | null>(null)
  const [doctores, setDoctores] = useState<{ id: number; nombre: string }[]>([])
  const [reporte, setReporte] = useState<ReporteCitas | null>(null)
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    if (!eligeDoctor) return
    void (async () => {
      try {
        setDoctores(await pedir(api.citas.doctores()))
      } catch {
        setDoctores([])
      }
    })()
  }, [eligeDoctor])

  useEffect(() => {
    let vigente = true
    void (async () => {
      try {
        const datos = await pedir(api.citas.reporte(periodo, referencia, doctorId))
        if (vigente) setReporte(datos)
      } catch (error) {
        if (vigente) notificar.error(mensajeDeError(error))
      }
    })()
    return () => {
      vigente = false
    }
  }, [periodo, referencia, doctorId, notificar])

  async function imprimir(): Promise<void> {
    setGenerando(true)
    try {
      const documento = await pedir(api.documentos.reporteCitas(periodo, referencia, doctorId))
      notificar.exito('Reporte generado')
      await pedir(api.documentos.abrir(documento.ruta))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Modal
      abierto
      titulo="Reporte de agenda"
      descripcion="Genera un PDF en tamaño carta, listo para imprimir y entregar."
      ancho="lg"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cerrar
          </Boton>
          <Boton
            variante="primario"
            cargando={generando}
            iconoIzquierda={<Printer size={15} />}
            onClick={() => void imprimir()}
          >
            Generar PDF
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className={`grid gap-3 ${eligeDoctor ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <Selector
            etiqueta="Período"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoReporte)}
            opciones={PERIODOS.map((p) => ({ valor: p.valor, etiqueta: p.etiqueta }))}
          />
          <Entrada
            etiqueta="Fecha de referencia"
            type="date"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            ayuda={
              periodo === 'dia'
                ? 'Ese día'
                : periodo === 'semana'
                  ? 'La semana que la contiene'
                  : 'El mes que la contiene'
            }
          />
          {eligeDoctor && (
            <Selector
              etiqueta="Doctor"
              value={doctorId === null ? '' : String(doctorId)}
              onChange={(e) => setDoctorId(e.target.value ? Number(e.target.value) : null)}
              opciones={doctores.map((d) => ({ valor: String(d.id), etiqueta: d.nombre }))}
              marcador="Todos los doctores"
            />
          )}
        </div>

        {!reporte ? (
          <Cargando texto="Calculando…" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.875rem] font-medium text-[var(--tinta)]">
                {reporte.desde === reporte.hasta
                  ? formatearFechaLarga(reporte.desde)
                  : `${formatearFecha(reporte.desde)} — ${formatearFecha(reporte.hasta)}`}
              </span>
              <Insignia tono="marca">{reporte.totales.agendadas} agendadas</Insignia>
              <Insignia tono="exito">{reporte.totales.atendidas} atendidas</Insignia>
              <Insignia tono="alerta">{reporte.totales.noAsistio} no asistió</Insignia>
              <Insignia>{reporte.totales.canceladas} canceladas</Insignia>
            </div>

            <div className="superficie max-h-72 overflow-auto">
              {reporte.citas.length === 0 ? (
                <p className="px-4 py-6 text-center text-[0.875rem] text-[var(--tinta-tenue)]">
                  No hay citas en este período.
                </p>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-[var(--superficie)]">
                    <tr className="border-b border-[var(--borde)] text-[0.6875rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
                      <th className="px-3 py-2 font-semibold">Fecha</th>
                      <th className="px-3 py-2 font-semibold">Hora</th>
                      <th className="px-3 py-2 font-semibold">Paciente</th>
                      {reporte.doctorId === null && (
                        <th className="px-3 py-2 font-semibold">Doctor</th>
                      )}
                      <th className="px-3 py-2 font-semibold">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--borde)]">
                    {reporte.citas.map((c) => (
                      <tr key={c.id} className={c.estado === 'cancelada' ? 'opacity-50' : ''}>
                        <td className="whitespace-nowrap px-3 py-1.5 text-[0.8125rem] text-[var(--tinta-suave)]">
                          {formatearFecha(c.fecha)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-[0.8125rem] tabular-nums">
                          {c.hora ?? '—'}
                        </td>
                        <td className="px-3 py-1.5 text-[0.875rem] text-[var(--tinta)]">
                          {c.nombre}
                        </td>
                        {reporte.doctorId === null && (
                          <td className="px-3 py-1.5 text-[0.8125rem] text-[var(--tinta-suave)]">
                            {c.nombreDoctor ?? '—'}
                          </td>
                        )}
                        <td className="px-3 py-1.5 text-[0.8125rem] text-[var(--tinta-suave)]">
                          {c.motivo ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <p className="flex items-center gap-1.5 text-[0.8125rem] text-[var(--tinta-tenue)]">
              <FileDown size={13} />
              El PDF se guarda en la carpeta «reportes» dentro de los datos de DMedic.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
