import { FileText, Printer } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Insignia } from '../../components/ui/Varios'
import { formatearFechaHora, formatearFechaLarga } from '@shared/lib/fecha'
import { clasificarImc, evaluarVital } from '@shared/lib/vitales'
import type { ConsultaCompleta, SignosVitales } from '@shared/types'

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
  compacto = false
}: {
  consulta: ConsultaCompleta
  onImprimir?: (tipo: 'receta' | 'resumen_consulta') => void
  compacto?: boolean
}): React.JSX.Element {
  const s = consulta.signos
  const imc = s.imc
  const anulada = consulta.estado === 'anulada'

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
          {onImprimir && !anulada && (
            <>
              {consulta.medicamentos.length > 0 && (
                <Boton
                  tamano="sm"
                  iconoIzquierda={<Printer size={14} />}
                  onClick={() => onImprimir('receta')}
                >
                  Receta
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
    </article>
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
