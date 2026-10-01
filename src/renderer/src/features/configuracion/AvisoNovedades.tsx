import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Modal } from '../../components/ui/Modal'
import { api, pedir } from '../../lib/api'
import type { NovedadesVersion } from '@shared/types'

/**
 * Se muestra una sola vez, la primera vez que se abre una version nueva. El
 * texto es exactamente el que el administrador escribio al publicarla: el
 * sistema no resume ni reinterpreta lo que se le entrego.
 */
export function AvisoNovedades(): React.JSX.Element | null {
  const [novedades, setNovedades] = useState<NovedadesVersion | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setNovedades(await pedir(api.actualizaciones.novedades()))
      } catch {
        // Que no se pueda anunciar una version nueva jamas debe estorbar el
        // trabajo del dia: si falla, simplemente no se muestra nada.
        setNovedades(null)
      }
    })()
  }, [])

  async function cerrar(): Promise<void> {
    setNovedades(null)
    try {
      await pedir(api.actualizaciones.novedadesVistas())
    } catch {
      // Si no se pudo anotar, lo peor que pasa es que el aviso vuelva a salir.
    }
  }

  if (!novedades) return null

  return (
    <Modal
      abierto
      titulo={`DMedic se actualizó a la versión ${novedades.version}`}
      ancho="sm"
      onCerrar={() => void cerrar()}
      pie={
        <Boton variante="primario" onClick={() => void cerrar()}>
          Entendido
        </Boton>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marca-100 text-marca-700 oscuro:bg-marca-900 oscuro:text-marca-300">
            <Sparkles size={18} />
          </span>
          <p className="text-[0.875rem] text-[var(--tinta-suave)]">
            {novedades.notas
              ? 'Esto es lo que cambió en esta versión:'
              : 'La actualización se instaló correctamente.'}
          </p>
        </div>

        {novedades.notas && (
          <div className="desplazable max-h-[22rem] rounded-lg border border-[var(--borde)] px-3.5 py-3">
            <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-[var(--tinta)]">
              {novedades.notas}
            </p>
          </div>
        )}

        <p className="text-[0.78125rem] text-[var(--tinta-tenue)]">
          Sus expedientes, citas y copias de seguridad no se tocaron: viven en una carpeta aparte
          que ninguna actualización modifica.
        </p>
      </div>
    </Modal>
  )
}
