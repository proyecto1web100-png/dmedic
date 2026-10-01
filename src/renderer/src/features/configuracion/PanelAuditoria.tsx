import { useCallback, useEffect, useState } from 'react'
import { ScrollText, Search as Lupa } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Entrada } from '../../components/ui/Campo'
import { Cargando, Insignia, Vacio } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { formatearFechaHora } from '@shared/lib/fecha'
import type { EntradaAuditoriaPublica } from '@shared/types'

/**
 * Ventana de lectura sobre el registro de auditoria. Escribirlo sin poder
 * revisarlo no protege a nadie: es aqui donde el administrador comprueba quien
 * abrio un expediente o quien anulo una consulta.
 */

/** Etiquetas legibles: el administrador no tiene por que leer claves internas. */
const ACCIONES: Record<string, string> = {
  'sesion.inicio': 'Inicio de sesión',
  'sesion.inicio_fallido': 'Intento fallido',
  'sesion.cierre': 'Cierre de sesión',
  'sesion.password_cambiada': 'Contraseña cambiada',
  'paciente.creado': 'Paciente registrado',
  'paciente.editado': 'Paciente editado',
  'paciente.consultado': 'Expediente abierto',
  'paciente.archivado': 'Paciente archivado',
  'paciente.reactivado': 'Paciente reactivado',
  'paciente.eliminado': 'Paciente eliminado',
  'consulta.creada': 'Consulta registrada',
  'consulta.editada': 'Consulta editada',
  'consulta.anulada': 'Consulta anulada',
  'consulta.adenda': 'Adenda agregada',
  'cita.creada': 'Cita agendada',
  'cita.editada': 'Cita modificada',
  'cita.eliminada': 'Cita eliminada',
  'usuario.creado': 'Usuario creado',
  'usuario.editado': 'Usuario editado',
  'usuario.desactivado': 'Usuario desactivado',
  'usuario.reactivado': 'Usuario reactivado',
  'usuario.password_reiniciada': 'Contraseña reiniciada',
  'documento.impreso': 'Documento generado',
  'backup.creado': 'Copia creada',
  'backup.restaurado': 'Copia restaurada'
}

/** Las acciones que merecen destacarse al recorrer la lista de un vistazo. */
const TONO: Record<string, 'critico' | 'alerta'> = {
  'paciente.eliminado': 'critico',
  'backup.restaurado': 'critico',
  'consulta.anulada': 'alerta',
  'sesion.inicio_fallido': 'alerta',
  'usuario.password_reiniciada': 'alerta',
  'paciente.consultado': 'alerta'
}

export function PanelAuditoria(): React.JSX.Element {
  const notificar = useNotificar()
  const [entradas, setEntradas] = useState<EntradaAuditoriaPublica[] | null>(null)
  const [texto, setTexto] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [abierto, setAbierto] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setEntradas(
        await pedir(
          api.auditoria.listar({
            texto: texto.trim() || null,
            desde: desde || null,
            hasta: hasta || null,
            limite: 200
          })
        )
      )
    } catch (error) {
      notificar.error(mensajeDeError(error))
      setEntradas([])
    }
  }, [texto, desde, hasta, notificar])

  useEffect(() => {
    if (!abierto) return
    // Se espera un momento para no consultar en cada tecla del buscador.
    const temporizador = window.setTimeout(() => void cargar(), 300)
    return () => window.clearTimeout(temporizador)
  }, [abierto, cargar])

  return (
    <section className="superficie px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
          <ScrollText size={12} />
          Registro de auditoría
        </h2>
        <Boton tamano="sm" variante="fantasma" onClick={() => setAbierto((a) => !a)}>
          {abierto ? 'Ocultar' : 'Ver registro'}
        </Boton>
      </div>

      <p className="text-[0.875rem] text-[var(--tinta-suave)]">
        Quién entró, qué expedientes se abrieron y qué se registró, editó, anuló o imprimió. Se
        muestran los 200 movimientos más recientes que coincidan con el filtro.
      </p>

      {abierto && (
        <>
          <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-3">
            <div className="relative">
              <Lupa
                size={14}
                className="pointer-events-none absolute left-2.5 top-[2.05rem] -translate-y-1/2 text-[var(--tinta-tenue)]"
              />
              <Entrada
                etiqueta="Buscar"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Nombre del usuario, expediente, acción…"
                className="[&_input]:pl-8"
              />
            </div>
            <Entrada
              etiqueta="Desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
            <Entrada
              etiqueta="Hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>

          {entradas === null ? (
            <Cargando texto="Leyendo el registro…" />
          ) : entradas.length === 0 ? (
            <Vacio
              titulo="Sin movimientos"
              descripcion="No hay registros que coincidan con el filtro."
            />
          ) : (
            <div className="desplazable mt-3 max-h-[26rem] overflow-x-auto rounded-lg border border-[var(--borde)]">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-[var(--superficie)]">
                  <tr className="border-b border-[var(--borde)] text-[0.75rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
                    <th className="px-3.5 py-2 font-semibold">Fecha</th>
                    <th className="px-3.5 py-2 font-semibold">Usuario</th>
                    <th className="px-3.5 py-2 font-semibold">Acción</th>
                    <th className="px-3.5 py-2 font-semibold">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--borde)]">
                  {entradas.map((entrada) => (
                    <tr key={entrada.id}>
                      <td className="whitespace-nowrap px-3.5 py-2 text-[0.8125rem] tabular-nums text-[var(--tinta-suave)]">
                        {formatearFechaHora(entrada.fecha)}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2 text-[0.875rem] text-[var(--tinta)]">
                        {entrada.usuarioNombre ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2 text-[0.875rem]">
                        {TONO[entrada.accion] ? (
                          <Insignia tono={TONO[entrada.accion]}>
                            {ACCIONES[entrada.accion] ?? entrada.accion}
                          </Insignia>
                        ) : (
                          <span className="text-[var(--tinta-suave)]">
                            {ACCIONES[entrada.accion] ?? entrada.accion}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-[0.8125rem] text-[var(--tinta-suave)]">
                        {entrada.detalle ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-2 text-[0.75rem] text-[var(--tinta-tenue)]">
            El registro no se puede editar ni borrar desde la aplicación, y se guarda además en
            un archivo de texto aparte que sobrevive a una restauración.
          </p>
        </>
      )}
    </section>
  )
}
