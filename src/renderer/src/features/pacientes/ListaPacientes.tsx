import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Cargando, Insignia, Vacio } from '../../components/ui/Varios'
import { formatearFecha } from '@shared/lib/fecha'
import { formatearIdentidad } from '@shared/lib/paciente'
import { useBusquedaPacientes } from './useBusquedaPacientes'
import { FormularioPaciente } from './FormularioPaciente'

export function ListaPacientes(): React.JSX.Element {
  const navegar = useNavigate()
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [nuevo, setNuevo] = useState(false)
  const { texto, setTexto, resultados, buscando, recargar } = useBusquedaPacientes({
    incluirInactivos
  })

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-8 py-8">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--tinta)]">Pacientes</h1>
          <p className="text-[0.875rem] text-[var(--tinta-suave)]">
            {resultados.length} {resultados.length === 1 ? 'paciente' : 'pacientes'}
            {texto.trim() ? ' encontrados' : ''}
          </p>
        </div>
        <Boton
          variante="primario"
          iconoIzquierda={<UserPlus size={16} />}
          onClick={() => setNuevo(true)}
        >
          Nuevo paciente
        </Boton>
      </header>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--tinta-tenue)]"
          />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por nombre, identidad, expediente o teléfono…"
            className="campo-base h-11 pl-10"
            aria-label="Buscar paciente"
          />
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[0.875rem] text-[var(--tinta-suave)]">
          <input
            type="checkbox"
            checked={incluirInactivos}
            onChange={(e) => setIncluirInactivos(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-marca-600)]"
          />
          Mostrar archivados
        </label>
      </div>

      <div className="superficie flex-1 overflow-hidden">
        {buscando && resultados.length === 0 ? (
          <Cargando />
        ) : resultados.length === 0 ? (
          <Vacio
            titulo={texto.trim() ? 'Sin coincidencias' : 'Todavía no hay pacientes'}
            descripcion={
              texto.trim()
                ? 'Pruebe con otro nombre, número de identidad o expediente.'
                : 'Registre el primer paciente para comenzar a usar el sistema.'
            }
            accion={
              <Boton
                variante="primario"
                iconoIzquierda={<UserPlus size={16} />}
                onClick={() => setNuevo(true)}
              >
                Nuevo paciente
              </Boton>
            }
          />
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--borde)] text-[0.75rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
                <th className="px-4 py-2.5 font-semibold">Expediente</th>
                <th className="px-4 py-2.5 font-semibold">Paciente</th>
                <th className="px-4 py-2.5 font-semibold">Identidad</th>
                <th className="px-4 py-2.5 text-right font-semibold">Edad</th>
                <th className="px-4 py-2.5 font-semibold">Teléfono</th>
                <th className="px-4 py-2.5 font-semibold">Última consulta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--borde)]">
              {resultados.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navegar(`/pacientes/${p.id}`)}
                  className="cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_8%,transparent)]"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[0.8125rem] text-[var(--tinta-suave)]">
                    {p.numeroExpediente}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-[var(--tinta)]">{p.nombreCompleto}</span>
                    {!p.activo && (
                      <span className="ml-2">
                        <Insignia>Archivado</Insignia>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[0.875rem] text-[var(--tinta-suave)]">
                    {formatearIdentidad(p.numeroIdentidad)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-[0.875rem] tabular-nums text-[var(--tinta-suave)]">
                    {p.edad}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[0.875rem] text-[var(--tinta-suave)]">
                    {p.telefono ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[0.875rem] text-[var(--tinta-suave)]">
                    {p.ultimaConsultaEn ? formatearFecha(p.ultimaConsultaEn) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FormularioPaciente
        abierto={nuevo}
        onCerrar={() => setNuevo(false)}
        onGuardado={(id) => {
          setNuevo(false)
          recargar()
          navegar(`/pacientes/${id}`)
        }}
      />
    </div>
  )
}
