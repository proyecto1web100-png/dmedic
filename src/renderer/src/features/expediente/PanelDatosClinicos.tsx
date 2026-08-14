import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { AreaTexto, Entrada, Selector } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { TIPOS_ANTECEDENTE } from '@shared/types'
import type { ExpedienteResumen, TipoAntecedente } from '@shared/types'

type Formulario = 'alergia' | 'antecedente' | 'cronico' | null

/**
 * Alergias, antecedentes y problemas crónicos pertenecen al paciente, no a una
 * consulta: se mantienen aquí y reflejan siempre su estado actual.
 */
export function PanelDatosClinicos({
  expediente,
  onCambio
}: {
  expediente: ExpedienteResumen
  onCambio: () => Promise<void> | void
}): React.JSX.Element {
  const notificar = useNotificar()
  const [formulario, setFormulario] = useState<Formulario>(null)

  async function ejecutar(operacion: Promise<unknown>, exito: string): Promise<void> {
    try {
      await operacion
      notificar.exito(exito)
      await onCambio()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Columna
          titulo="Alergias"
          onAgregar={() => setFormulario('alergia')}
          vacio="Sin alergias registradas"
          hayContenido={expediente.alergias.length > 0}
        >
          {expediente.alergias.map((a) => (
            <Fila
              key={a.id}
              onQuitar={() =>
                void ejecutar(pedir(api.pacientes.eliminarAlergia(a.id)), 'Alergia eliminada')
              }
              atenuado={!a.activa}
            >
              <span className="font-medium">{a.sustancia}</span>
              <span className="text-[var(--tinta-tenue)]">
                {' '}
                · {a.gravedad}
                {a.reaccion ? ` · ${a.reaccion}` : ''}
              </span>
            </Fila>
          ))}
        </Columna>

        <Columna
          titulo="Antecedentes"
          onAgregar={() => setFormulario('antecedente')}
          vacio="Sin antecedentes registrados"
          hayContenido={expediente.antecedentes.length > 0}
        >
          {TIPOS_ANTECEDENTE.map((tipo) => {
            const items = expediente.antecedentes.filter((a) => a.tipo === tipo.valor)
            if (items.length === 0) return null
            return (
              <div key={tipo.valor} className="mb-1.5">
                <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--tinta-tenue)]">
                  {tipo.etiqueta}
                </p>
                {items.map((a) => (
                  <Fila
                    key={a.id}
                    onQuitar={() =>
                      void ejecutar(
                        pedir(api.pacientes.eliminarAntecedente(a.id)),
                        'Antecedente eliminado'
                      )
                    }
                  >
                    {a.descripcion}
                  </Fila>
                ))}
              </div>
            )
          })}
        </Columna>

        <Columna
          titulo="Problemas crónicos"
          onAgregar={() => setFormulario('cronico')}
          vacio="Sin problemas crónicos registrados"
          hayContenido={expediente.cronicos.length > 0}
        >
          {expediente.cronicos.map((c) => (
            <Fila
              key={c.id}
              onQuitar={() =>
                void ejecutar(pedir(api.pacientes.eliminarCronico(c.id)), 'Problema eliminado')
              }
              atenuado={!c.activo}
            >
              {c.descripcion}
              {c.codigoCie10 && (
                <span className="ml-1 font-mono text-[0.75rem] text-marca-700 oscuro:text-marca-400">
                  {c.codigoCie10}
                </span>
              )}
            </Fila>
          ))}
        </Columna>
      </div>

      <FormularioAlergia
        abierto={formulario === 'alergia'}
        pacienteId={expediente.paciente.id}
        onCerrar={() => setFormulario(null)}
        onGuardado={onCambio}
      />
      <FormularioAntecedente
        abierto={formulario === 'antecedente'}
        pacienteId={expediente.paciente.id}
        onCerrar={() => setFormulario(null)}
        onGuardado={onCambio}
      />
      <FormularioCronico
        abierto={formulario === 'cronico'}
        pacienteId={expediente.paciente.id}
        onCerrar={() => setFormulario(null)}
        onGuardado={onCambio}
      />
    </>
  )
}

function Columna({
  titulo,
  onAgregar,
  vacio,
  hayContenido,
  children
}: {
  titulo: string
  onAgregar: () => void
  vacio: string
  hayContenido: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="superficie px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
          {titulo}
        </h3>
        <Boton tamano="sm" variante="fantasma" onClick={onAgregar} aria-label={`Agregar en ${titulo}`}>
          <Plus size={14} />
        </Boton>
      </div>
      {hayContenido ? (
        <div className="flex flex-col">{children}</div>
      ) : (
        <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">{vacio}</p>
      )}
    </div>
  )
}

function Fila({
  children,
  onQuitar,
  atenuado = false
}: {
  children: React.ReactNode
  onQuitar: () => void
  atenuado?: boolean
}): React.JSX.Element {
  return (
    <div
      className={`group flex items-start justify-between gap-2 py-0.5 text-[0.875rem] leading-snug ${
        atenuado ? 'opacity-50' : ''
      }`}
    >
      <span className="min-w-0 text-[var(--tinta)]">{children}</span>
      <button
        onClick={onQuitar}
        aria-label="Quitar"
        className="shrink-0 rounded p-0.5 text-[var(--tinta-tenue)] opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
      >
        <X size={13} />
      </button>
    </div>
  )
}

function FormularioAlergia({
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
  const [sustancia, setSustancia] = useState('')
  const [reaccion, setReaccion] = useState('')
  const [gravedad, setGravedad] = useState<'leve' | 'moderada' | 'grave'>('moderada')
  const [guardando, setGuardando] = useState(false)

  async function guardar(): Promise<void> {
    setGuardando(true)
    try {
      await pedir(
        api.pacientes.agregarAlergia(pacienteId, {
          sustancia: sustancia.trim(),
          reaccion: reaccion.trim() || null,
          gravedad
        })
      )
      notificar.exito('Alergia registrada')
      setSustancia('')
      setReaccion('')
      onCerrar()
      await onGuardado()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Registrar alergia"
      ancho="sm"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={sustancia.trim().length < 2}
            onClick={() => void guardar()}
          >
            Registrar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Entrada
          etiqueta="Sustancia"
          requerido
          autoFocus
          value={sustancia}
          onChange={(e) => setSustancia(e.target.value)}
          placeholder="Penicilina, mariscos, polen…"
        />
        <Entrada
          etiqueta="Reacción"
          value={reaccion}
          onChange={(e) => setReaccion(e.target.value)}
          placeholder="Urticaria, edema, dificultad respiratoria…"
        />
        <Selector
          etiqueta="Gravedad"
          value={gravedad}
          onChange={(e) => setGravedad(e.target.value as 'leve' | 'moderada' | 'grave')}
          opciones={[
            { valor: 'leve', etiqueta: 'Leve' },
            { valor: 'moderada', etiqueta: 'Moderada' },
            { valor: 'grave', etiqueta: 'Grave' }
          ]}
        />
      </div>
    </Modal>
  )
}

function FormularioAntecedente({
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
  const [tipo, setTipo] = useState<TipoAntecedente>('personal_patologico')
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(): Promise<void> {
    setGuardando(true)
    try {
      await pedir(
        api.pacientes.agregarAntecedente(pacienteId, { tipo, descripcion: descripcion.trim() })
      )
      notificar.exito('Antecedente registrado')
      setDescripcion('')
      onCerrar()
      await onGuardado()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Registrar antecedente"
      ancho="sm"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={descripcion.trim().length < 2}
            onClick={() => void guardar()}
          >
            Registrar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Selector
          etiqueta="Tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoAntecedente)}
          opciones={TIPOS_ANTECEDENTE.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))}
        />
        <AreaTexto
          etiqueta="Descripción"
          requerido
          autoFocus
          rows={4}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>
    </Modal>
  )
}

function FormularioCronico({
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
  const [descripcion, setDescripcion] = useState('')
  const [codigo, setCodigo] = useState('')
  const [desde, setDesde] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(): Promise<void> {
    setGuardando(true)
    try {
      await pedir(
        api.pacientes.agregarCronico(pacienteId, {
          codigoCie10: codigo.trim() || null,
          descripcion: descripcion.trim(),
          desde: desde || null
        })
      )
      notificar.exito('Problema crónico registrado')
      setDescripcion('')
      setCodigo('')
      setDesde('')
      onCerrar()
      await onGuardado()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Registrar problema crónico"
      ancho="sm"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={descripcion.trim().length < 2}
            onClick={() => void guardar()}
          >
            Registrar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Entrada
          etiqueta="Descripción"
          requerido
          autoFocus
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Diabetes mellitus tipo 2"
        />
        <div className="grid grid-cols-2 gap-3">
          <Entrada
            etiqueta="Código CIE-10"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="E11.9"
            className="font-mono"
          />
          <Entrada
            etiqueta="Desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
