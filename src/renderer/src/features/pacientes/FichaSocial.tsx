import { useEffect, useState } from 'react'
import { Boton } from '../../components/ui/Boton'
import { Entrada, Selector } from '../../components/ui/Campo'
import { api, pedir } from '../../lib/api'
import { ESTADOS_CIVILES, NIVELES_EDUCATIVOS, TIPOS_ANTECEDENTE } from '@shared/types'
import type {
  Empresa,
  EstadoCivil,
  GravedadAlergia,
  NivelEducativo,
  PacienteInput,
  TipoAntecedente
} from '@shared/types'

export type Actualizar = <C extends keyof PacienteInput>(
  campo: C,
  valor: PacienteInput[C]
) => void

/**
 * Escolaridad, ocupacion, estado civil, quien relata la historia y la empresa
 * con convenio. Son datos de la persona, no de una consulta, y condicionan
 * como se lee e interpreta todo el expediente.
 */
export function FichaSocial({
  datos,
  actualizar
}: {
  datos: PacienteInput
  actualizar: Actualizar
}): React.JSX.Element {
  const [empresas, setEmpresas] = useState<Empresa[]>([])

  useEffect(() => {
    // Sin permiso sobre convenios el campo simplemente no ofrece opciones: no
    // es un error, es que ese usuario no administra empresas.
    void (async () => {
      try {
        setEmpresas(await pedir(api.empresas.listar(true)))
      } catch {
        setEmpresas([])
      }
    })()
  }, [])

  return (
    <div className="rounded-lg border border-[var(--borde)] p-3">
      <span className="etiqueta mb-2 block">Datos sociales y laborales</span>

      <div className="grid grid-cols-3 gap-3">
        <Selector
          etiqueta="Nivel educativo"
          marcador="Sin especificar"
          opciones={NIVELES_EDUCATIVOS.map((n) => ({ valor: n.valor, etiqueta: n.etiqueta }))}
          value={datos.nivelEducativo ?? ''}
          onChange={(e) =>
            actualizar('nivelEducativo', (e.target.value || null) as NivelEducativo | null)
          }
        />
        <Selector
          etiqueta="Estado civil"
          marcador="Sin especificar"
          opciones={ESTADOS_CIVILES.map((n) => ({ valor: n.valor, etiqueta: n.etiqueta }))}
          value={datos.estadoCivil ?? ''}
          onChange={(e) =>
            actualizar('estadoCivil', (e.target.value || null) as EstadoCivil | null)
          }
        />
        <Entrada
          etiqueta="Ocupación"
          placeholder="Operaria de máquina"
          value={datos.ocupacion ?? ''}
          onChange={(e) => actualizar('ocupacion', e.target.value)}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Entrada
          etiqueta="Historiador"
          placeholder="El propio paciente"
          ayuda="Quién relata la historia clínica"
          value={datos.historiador ?? ''}
          onChange={(e) => actualizar('historiador', e.target.value)}
        />
        <Entrada
          etiqueta="Parentesco del historiador"
          placeholder="Madre, hijo, cuidador…"
          value={datos.historiadorParentesco ?? ''}
          onChange={(e) => actualizar('historiadorParentesco', e.target.value)}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Selector
          etiqueta="Empresa con convenio"
          marcador="Ninguna"
          opciones={empresas.map((e) => ({
            valor: String(e.id),
            etiqueta: `${e.codigo} · ${e.nombre}`
          }))}
          value={datos.empresaId ? String(datos.empresaId) : ''}
          onChange={(e) => actualizar('empresaId', e.target.value ? Number(e.target.value) : null)}
        />
        <Entrada
          etiqueta="Código de empleado"
          placeholder="EMP-0442"
          value={datos.codigoEmpleado ?? ''}
          onChange={(e) => actualizar('codigoEmpleado', e.target.value)}
        />
      </div>
    </div>
  )
}

const GRAVEDADES: { valor: GravedadAlergia; etiqueta: string }[] = [
  { valor: 'leve', etiqueta: 'Leve' },
  { valor: 'moderada', etiqueta: 'Moderada' },
  { valor: 'grave', etiqueta: 'Grave' }
]

/**
 * Alergias y antecedentes recogidos durante el alta. Solo aparece al crear:
 * una vez abierto el expediente se administran desde el, que es donde cada
 * cambio queda fechado.
 */
export function HistoriaInicial({
  datos,
  actualizar
}: {
  datos: PacienteInput
  actualizar: Actualizar
}): React.JSX.Element {
  const alergias = datos.alergiasIniciales ?? []
  const antecedentes = datos.antecedentesIniciales ?? []

  return (
    <div className="rounded-lg border border-[var(--borde)] p-3">
      <span className="etiqueta mb-2 block">Historia clínica inicial</span>
      <p className="mb-3 text-[0.78125rem] text-[var(--tinta-tenue)]">
        Opcional. Puede registrarla ahora o después, desde el expediente.
      </p>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.8125rem] font-medium text-[var(--tinta-suave)]">Alergias</span>
        <Boton
          tamano="sm"
          variante="fantasma"
          onClick={() =>
            actualizar('alergiasIniciales', [
              ...alergias,
              { sustancia: '', reaccion: '', gravedad: 'moderada' }
            ])
          }
        >
          Agregar alergia
        </Boton>
      </div>

      {alergias.length === 0 ? (
        <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">Sin alergias registradas.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {alergias.map((a, indice) => (
            <div key={indice} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
              <Entrada
                placeholder="Sustancia"
                value={a.sustancia}
                onChange={(e) =>
                  actualizar(
                    'alergiasIniciales',
                    alergias.map((x, i) =>
                      i === indice ? { ...x, sustancia: e.target.value } : x
                    )
                  )
                }
              />
              <Entrada
                placeholder="Reacción"
                value={a.reaccion ?? ''}
                onChange={(e) =>
                  actualizar(
                    'alergiasIniciales',
                    alergias.map((x, i) => (i === indice ? { ...x, reaccion: e.target.value } : x))
                  )
                }
              />
              <Selector
                opciones={GRAVEDADES}
                value={a.gravedad}
                onChange={(e) =>
                  actualizar(
                    'alergiasIniciales',
                    alergias.map((x, i) =>
                      i === indice ? { ...x, gravedad: e.target.value as GravedadAlergia } : x
                    )
                  )
                }
              />
              <Boton
                tamano="sm"
                variante="fantasma"
                onClick={() =>
                  actualizar(
                    'alergiasIniciales',
                    alergias.filter((_, i) => i !== indice)
                  )
                }
              >
                Quitar
              </Boton>
            </div>
          ))}
        </div>
      )}

      <div className="mb-2 mt-4 flex items-center justify-between">
        <span className="text-[0.8125rem] font-medium text-[var(--tinta-suave)]">Antecedentes</span>
        <Boton
          tamano="sm"
          variante="fantasma"
          onClick={() =>
            actualizar('antecedentesIniciales', [
              ...antecedentes,
              { tipo: 'personal_patologico', descripcion: '' }
            ])
          }
        >
          Agregar antecedente
        </Boton>
      </div>

      {antecedentes.length === 0 ? (
        <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">Sin antecedentes registrados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {antecedentes.map((a, indice) => (
            <div key={indice} className="grid grid-cols-[auto_1fr_auto] items-end gap-2">
              <Selector
                opciones={TIPOS_ANTECEDENTE.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))}
                value={a.tipo}
                onChange={(e) =>
                  actualizar(
                    'antecedentesIniciales',
                    antecedentes.map((x, i) =>
                      i === indice ? { ...x, tipo: e.target.value as TipoAntecedente } : x
                    )
                  )
                }
              />
              <Entrada
                placeholder="Descripción"
                value={a.descripcion}
                onChange={(e) =>
                  actualizar(
                    'antecedentesIniciales',
                    antecedentes.map((x, i) =>
                      i === indice ? { ...x, descripcion: e.target.value } : x
                    )
                  )
                }
              />
              <Boton
                tamano="sm"
                variante="fantasma"
                onClick={() =>
                  actualizar(
                    'antecedentesIniciales',
                    antecedentes.filter((_, i) => i !== indice)
                  )
                }
              >
                Quitar
              </Boton>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
