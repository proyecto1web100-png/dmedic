import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Search as Lupa, X } from 'lucide-react'
import { Aviso, Insignia, Vacio } from '../../components/ui/Varios'
import { useSesion } from '../../app/Sesion'
import { api, pedir } from '../../lib/api'
import { MANUAL, textoDelTema, type Bloque, type Tema } from './contenido'

/**
 * Manual de uso dentro de la propia aplicación. Vive aquí y no en un PDF
 * aparte a propósito: en la clínica no hay red, y un manual que solo existe en
 * el escritorio de alguien deja de leerse el primer día.
 *
 * Cada tema declara el permiso que lo hace relevante, así que la guía se
 * ajusta sola a quien la lee, sin listas de "esto no es para usted".
 */
export function Manual(): React.JSX.Element {
  const { puede, estado } = useSesion()
  const [busqueda, setBusqueda] = useState('')
  const [soloLoMio, setSoloLoMio] = useState(true)
  const [version, setVersion] = useState<string | null>(null)
  const contenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void (async () => {
      try {
        setVersion(await pedir(api.config.version()))
      } catch {
        setVersion(null)
      }
    })()
  }, [])

  const termino = busqueda.trim().toLowerCase()

  const secciones = useMemo(
    () =>
      MANUAL.map((seccion) => ({
        ...seccion,
        temas: seccion.temas.filter((tema) => {
          if (soloLoMio && tema.permiso && !puede(tema.permiso)) return false
          if (termino.length < 2) return true
          return textoDelTema(tema).includes(termino)
        })
      })).filter((seccion) => seccion.temas.length > 0),
    [termino, soloLoMio, puede]
  )

  const totalTemas = secciones.reduce((suma, s) => suma + s.temas.length, 0)

  function irA(id: string): void {
    const destino = contenedor.current?.querySelector(`#tema-${id}`)
    destino?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 px-8 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marca-600 text-white">
            <BookOpen size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--tinta)]">Manual de uso</h1>
            <p className="text-[0.84375rem] text-[var(--tinta-suave)]">
              Cómo usar DMedic de principio a fin
              {version ? ` · versión ${version}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Lupa
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tinta-tenue)]"
            />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en el manual…"
              aria-label="Buscar en el manual"
              className="campo-base h-9 w-72 pl-9 pr-8 text-[0.875rem]"
            />
            {busqueda.length > 0 && (
              <button
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--tinta-tenue)] transition-colors hover:text-[var(--tinta)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      <label className="flex cursor-pointer items-center gap-2 text-[0.875rem] text-[var(--tinta-suave)]">
        <input
          type="checkbox"
          checked={soloLoMio}
          onChange={(e) => setSoloLoMio(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-marca-600)]"
        />
        Mostrar solo lo que puedo hacer con mi usuario
        {estado?.sesion && (
          <Insignia tono="marca">
            {estado.sesion.rol === 'doctor' ? 'Doctor' : 'Secretaria'}
            {estado.sesion.esAdministrador ? ' · Administrador' : ''}
          </Insignia>
        )}
      </label>

      {totalTemas === 0 ? (
        <div className="superficie">
          <Vacio
            titulo="Sin coincidencias en el manual"
            descripcion={`No se encontró ningún tema que hable de "${busqueda.trim()}". Pruebe con otra palabra, o desmarque el filtro de arriba para ver también los temas de otros roles.`}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-6">
          {/* Índice. Se queda a la vista mientras se lee el manual. */}
          <nav className="sticky top-8 hidden h-fit w-56 shrink-0 flex-col gap-4 lg:flex">
            {secciones.map((seccion) => (
              <div key={seccion.id}>
                <p className="mb-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
                  {seccion.titulo}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {seccion.temas.map((tema) => (
                    <li key={tema.id}>
                      <button
                        onClick={() => irA(tema.id)}
                        className="w-full rounded-md px-2 py-1 text-left text-[0.8125rem] leading-snug text-[var(--tinta-suave)] transition-colors hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_12%,transparent)] hover:text-[var(--tinta)]"
                      >
                        {tema.titulo}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div ref={contenedor} className="flex min-w-0 flex-1 flex-col gap-8">
            {secciones.map((seccion) => (
              <section key={seccion.id} className="flex flex-col gap-3">
                <h2 className="text-[1.0625rem] font-bold tracking-tight text-[var(--tinta)]">
                  {seccion.titulo}
                </h2>
                {seccion.temas.map((tema) => (
                  <TarjetaTema key={tema.id} tema={tema} />
                ))}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TarjetaTema({ tema }: { tema: Tema }): React.JSX.Element {
  return (
    <article id={`tema-${tema.id}`} className="superficie scroll-mt-6 px-5 py-4">
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[0.9375rem] font-semibold text-[var(--tinta)]">{tema.titulo}</h3>
          {tema.publico?.map((p) => (
            <Insignia key={p}>
              {p === 'doctor' ? 'Doctor' : p === 'secretaria' ? 'Secretaria' : 'Administrador'}
            </Insignia>
          ))}
        </div>
        <p className="mt-0.5 text-[0.84375rem] text-[var(--tinta-suave)]">{tema.resumen}</p>
      </div>
      <div className="flex flex-col gap-3.5">
        {tema.bloques.map((bloque, indice) => (
          <VistaBloque key={indice} bloque={bloque} />
        ))}
      </div>
    </article>
  )
}

function VistaBloque({ bloque }: { bloque: Bloque }): React.JSX.Element {
  switch (bloque.tipo) {
    case 'parrafo':
      return (
        <p className="text-[0.9375rem] leading-relaxed text-[var(--tinta)]">{bloque.texto}</p>
      )

    case 'aviso':
      return <Aviso tono={bloque.tono}>{bloque.texto}</Aviso>

    case 'pasos':
      return (
        <div>
          {bloque.titulo && <TituloBloque>{bloque.titulo}</TituloBloque>}
          <ol className="flex flex-col gap-2">
            {bloque.pasos.map((paso, indice) => (
              <li key={indice} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-marca-100 text-[0.6875rem] font-bold text-marca-800 oscuro:bg-marca-900 oscuro:text-marca-200">
                  {indice + 1}
                </span>
                <span className="text-[0.9375rem] leading-relaxed text-[var(--tinta)]">
                  {paso}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )

    case 'lista':
      return (
        <div>
          {bloque.titulo && <TituloBloque>{bloque.titulo}</TituloBloque>}
          <ul className="flex flex-col gap-1.5">
            {bloque.items.map((item, indice) => (
              <li key={indice} className="flex gap-2.5">
                <span
                  aria-hidden
                  className="mt-[0.5625rem] h-1.5 w-1.5 shrink-0 rounded-full bg-marca-500"
                />
                <span className="text-[0.9375rem] leading-relaxed text-[var(--tinta)]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )

    case 'tabla':
      return (
        <div className="desplazable overflow-x-auto rounded-lg border border-[var(--borde)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--borde)] text-[0.75rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
                {bloque.encabezados.map((encabezado) => (
                  <th key={encabezado} className="px-3.5 py-2 font-semibold">
                    {encabezado}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--borde)]">
              {bloque.filas.map((fila, indice) => (
                <tr key={indice}>
                  {fila.map((celda, columna) => (
                    <td
                      key={columna}
                      className={`px-3.5 py-2 text-[0.875rem] leading-relaxed ${
                        columna === 0
                          ? 'font-medium text-[var(--tinta)]'
                          : 'text-[var(--tinta-suave)]'
                      }`}
                    >
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'ficha':
      return (
        <div>
          {bloque.titulo && <TituloBloque>{bloque.titulo}</TituloBloque>}
          <dl className="flex flex-col divide-y divide-[var(--borde)] rounded-lg border border-[var(--borde)] px-3.5">
            {bloque.datos.map((dato) => (
              <div key={dato.termino} className="flex flex-col gap-0.5 py-2">
                <dt className="font-mono text-[0.8125rem] font-semibold text-marca-700 oscuro:text-marca-400">
                  {dato.termino}
                </dt>
                <dd className="text-[0.875rem] leading-relaxed text-[var(--tinta-suave)]">
                  {dato.detalle}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )
  }
}

function TituloBloque({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="mb-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
      {children}
    </p>
  )
}
