import { AlertTriangle, Pencil, Pill, Activity, Phone } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Insignia } from '../../components/ui/Varios'
import { edadLegible, formatearIdentidad } from '@shared/lib/paciente'
import { formatearFecha } from '@shared/lib/fecha'
import type { ExpedienteResumen } from '@shared/types'

/**
 * Lo que el doctor necesita ver en los primeros segundos: quién es, a qué es
 * alérgico, qué padece de forma crónica y qué está tomando ahora.
 */
export function CabeceraPaciente({
  expediente,
  mostrarClinico = true,
  onEditar
}: {
  expediente: ExpedienteResumen
  mostrarClinico?: boolean
  onEditar: () => void
}): React.JSX.Element {
  const { paciente, alergias, cronicos, medicacionActual, contactos, responsable } = expediente
  const alergiasActivas = alergias.filter((a) => a.activa)
  const cronicosActivos = cronicos.filter((c) => c.activo)

  return (
    <div className="superficie overflow-hidden">
      <div className="flex items-start gap-4 border-b border-[var(--borde)] px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--tinta)]">
              {paciente.nombreCompleto}
            </h1>
            {!paciente.activo && <Insignia>Archivado</Insignia>}
          </div>
          <p className="mt-0.5 text-[0.875rem] text-[var(--tinta-suave)]">
            <span className="font-mono">{paciente.numeroExpediente}</span>
            {' · '}
            {edadLegible(paciente.fechaNacimiento)}
            {' · '}
            {paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}
            {' · '}
            {formatearIdentidad(paciente.numeroIdentidad)}
            {paciente.tipoSangre ? ` · ${paciente.tipoSangre}` : ''}
          </p>
          {responsable && (
            <p className="mt-1 text-[0.8125rem] text-[var(--tinta-tenue)]">
              Responsable: {responsable.nombreCompleto}
              {paciente.responsableParentesco ? ` (${paciente.responsableParentesco})` : ''}
            </p>
          )}
        </div>

        <Boton tamano="sm" iconoIzquierda={<Pencil size={14} />} onClick={onEditar}>
          Editar
        </Boton>
      </div>

      <div className={`grid grid-cols-3 divide-x divide-[var(--borde)] ${mostrarClinico ? '' : 'hidden'}`}>
        <Bloque
          icono={<AlertTriangle size={14} />}
          titulo="Alergias"
          critico={alergiasActivas.length > 0}
        >
          {alergiasActivas.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">Ninguna registrada</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {alergiasActivas.map((a) => (
                <li key={a.id} className="text-[0.875rem] leading-snug">
                  <span className="font-semibold text-red-700 oscuro:text-red-300">
                    {a.sustancia}
                  </span>
                  <span className="text-[var(--tinta-suave)]">
                    {' '}
                    · {a.gravedad}
                    {a.reaccion ? ` · ${a.reaccion}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque icono={<Activity size={14} />} titulo="Problemas crónicos">
          {cronicosActivos.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">Ninguno registrado</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {cronicosActivos.map((c) => (
                <li key={c.id} className="text-[0.875rem] leading-snug text-[var(--tinta)]">
                  {c.descripcion}
                  {c.desde && (
                    <span className="text-[var(--tinta-tenue)]"> · desde {formatearFecha(c.desde)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque icono={<Pill size={14} />} titulo="Medicación actual">
          {medicacionActual.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">
              Sin medicamentos en la última consulta
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {medicacionActual.map((m, indice) => (
                <li key={indice} className="text-[0.875rem] leading-snug text-[var(--tinta)]">
                  <span className="font-medium">
                    {m.nombre}
                    {m.concentracion ? ` ${m.concentracion}` : ''}
                  </span>
                  <span className="text-[var(--tinta-suave)]">
                    {' '}
                    · {m.dosis} {m.frecuencia}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloque>
      </div>

      {(paciente.telefono || contactos.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[var(--borde)] px-5 py-2.5 text-[0.8125rem] text-[var(--tinta-suave)]">
          <Phone size={13} className="text-[var(--tinta-tenue)]" />
          {paciente.telefono && <span>{paciente.telefono}</span>}
          {contactos.map((c) => (
            <span key={c.id}>
              {c.nombre}
              {c.parentesco ? ` (${c.parentesco})` : ''}: {c.telefono}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Bloque({
  icono,
  titulo,
  critico = false,
  children
}: {
  icono: React.ReactNode
  titulo: string
  critico?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className={`px-5 py-3.5 ${critico ? 'bg-red-50/70 oscuro:bg-red-950/25' : ''}`}>
      <div
        className={`mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider ${
          critico ? 'text-red-700 oscuro:text-red-300' : 'text-[var(--tinta-tenue)]'
        }`}
      >
        {icono}
        {titulo}
      </div>
      {children}
    </div>
  )
}
