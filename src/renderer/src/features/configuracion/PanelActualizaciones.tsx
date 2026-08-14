import { useEffect, useState } from 'react'
import { CheckCircle2, Download, RefreshCw, Rocket } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Aviso, Insignia } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import type { EstadoActualizacion } from '@shared/types'

export function PanelActualizaciones(): React.JSX.Element {
  const notificar = useNotificar()
  const [estado, setEstado] = useState<EstadoActualizacion | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        setEstado(await pedir(api.actualizaciones.estado()))
      } catch {
        setEstado(null)
      }
    })()
    // El proceso principal empuja el progreso; la interfaz no lo consulta en bucle.
    return api.actualizaciones.alCambiar(setEstado)
  }, [])

  async function ejecutar(operacion: Promise<unknown>): Promise<void> {
    setOcupado(true)
    try {
      await operacion
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setOcupado(false)
    }
  }

  const version = estado?.versionActual ?? '—'

  return (
    <section className="superficie px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
          <Rocket size={12} />
          Actualizaciones
        </h2>
        <Insignia>Versión {version}</Insignia>
      </div>

      {estado?.disponibleEnEsteEntorno === false ? (
        <p className="text-[0.875rem] text-[var(--tinta-suave)]">
          Está ejecutando DMedic en modo desarrollo. Las actualizaciones solo funcionan en la
          versión instalada.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {estado?.fase === 'error' && estado.error && (
            <Aviso tono="alerta">{estado.error}</Aviso>
          )}

          {estado?.fase === 'sin_novedades' && (
            <p className="flex items-center gap-2 text-[0.875rem] text-[var(--tinta-suave)]">
              <CheckCircle2 size={15} className="text-emerald-600 oscuro:text-emerald-400" />
              DMedic está actualizado.
            </p>
          )}

          {estado?.fase === 'disponible' && (
            <Aviso tono="info">
              <p className="font-semibold">Versión {estado.versionDisponible} disponible.</p>
              {estado.notas && (
                <p className="mt-1 whitespace-pre-wrap text-[0.8125rem]">{estado.notas}</p>
              )}
            </Aviso>
          )}

          {estado?.fase === 'descargando' && (
            <div>
              <p className="mb-1 text-[0.875rem] text-[var(--tinta-suave)]">
                Descargando… {estado.porcentaje}%
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--borde)]">
                <div
                  className="h-full rounded-full bg-marca-600 transition-[width] duration-300"
                  style={{ width: `${estado.porcentaje}%` }}
                />
              </div>
            </div>
          )}

          {estado?.fase === 'lista' && (
            <Aviso tono="info">
              La versión {estado.versionDisponible} está lista para instalarse. DMedic se cerrará,
              hará una copia de seguridad y se actualizará. <strong>Guarde primero cualquier
              consulta en curso.</strong>
            </Aviso>
          )}

          <div className="flex flex-wrap gap-2">
            <Boton
              tamano="sm"
              iconoIzquierda={<RefreshCw size={14} />}
              cargando={ocupado || estado?.fase === 'buscando'}
              onClick={() => void ejecutar(pedir(api.actualizaciones.buscar()))}
            >
              Buscar actualizaciones
            </Boton>

            {estado?.fase === 'disponible' && (
              <Boton
                tamano="sm"
                variante="primario"
                iconoIzquierda={<Download size={14} />}
                cargando={ocupado}
                onClick={() => void ejecutar(pedir(api.actualizaciones.descargar()))}
              >
                Descargar
              </Boton>
            )}

            {estado?.fase === 'lista' && (
              <Boton
                tamano="sm"
                variante="primario"
                cargando={ocupado}
                onClick={() => void ejecutar(pedir(api.actualizaciones.instalar()))}
              >
                Cerrar e instalar ahora
              </Boton>
            )}
          </div>

          <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">
            La actualización solo descarga el programa. La información de los pacientes nunca sale
            de esta computadora, y el sistema sigue funcionando sin internet.
          </p>
        </div>
      )}
    </section>
  )
}
