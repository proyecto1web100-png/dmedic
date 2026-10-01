import { useCallback, useEffect, useState } from 'react'
import { Building2, FileBarChart, Pencil, Plus, Printer, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Boton } from '../../components/ui/Boton'
import { AreaTexto, Entrada } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Cargando, Insignia, Vacio } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { useSesion } from '../../app/Sesion'
import { formatearFecha } from '@shared/lib/fecha'
import type { Empresa, PacienteConResumen, ReporteEmpresa } from '@shared/types'

/**
 * Empresas con convenio. Sirven para identificar al paciente como empleado de
 * una empresa, listarlos por empresa y entregarle a cada una el detalle de las
 * atenciones de su gente.
 */
export function PanelEmpresas(): React.JSX.Element {
  const notificar = useNotificar()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<Empresa | 'nueva' | null>(null)
  const [viendo, setViendo] = useState<Empresa | null>(null)
  const [reportando, setReportando] = useState<Empresa | null>(null)

  const cargar = useCallback(async () => {
    try {
      setEmpresas(await pedir(api.empresas.listar()))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setCargando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function alternar(empresa: Empresa): Promise<void> {
    try {
      await pedir(api.empresas.alternar(empresa.id, !empresa.activa))
      await cargar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  if (cargando) return <Cargando texto="Cargando empresas…" />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.875rem] text-[var(--tinta-suave)]">
          Cada empresa tiene su código. Los pacientes se asignan desde su ficha.
        </p>
        <Boton
          variante="primario"
          tamano="sm"
          iconoIzquierda={<Plus size={15} />}
          onClick={() => setEditando('nueva')}
        >
          Nueva empresa
        </Boton>
      </div>

      {empresas.length === 0 ? (
        <Vacio
          icono={<Building2 size={28} />}
          titulo="Sin empresas registradas"
          descripcion="Registre las empresas con las que la clínica tiene convenio."
        />
      ) : (
        <div className="grid gap-2">
          {empresas.map((e) => (
            <div
              key={e.id}
              className={`superficie flex flex-wrap items-center gap-3 px-3.5 py-3 ${e.activa ? '' : 'opacity-55'}`}
            >
              <span className="font-mono text-[0.8125rem] font-semibold text-marca-700 oscuro:text-marca-300">
                {e.codigo}
              </span>
              <span className="text-[0.9375rem] font-medium text-[var(--tinta)]">{e.nombre}</span>
              {!e.activa && <Insignia tono="neutro">Inactiva</Insignia>}
              <span className="text-[0.8125rem] text-[var(--tinta-tenue)]">
                {e.totalPacientes} {e.totalPacientes === 1 ? 'paciente' : 'pacientes'}
                {e.contacto ? ` · ${e.contacto}` : ''}
                {e.telefono ? ` · ${e.telefono}` : ''}
              </span>

              <div className="ml-auto flex gap-1">
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  iconoIzquierda={<Users size={14} />}
                  onClick={() => setViendo(e)}
                >
                  Pacientes
                </Boton>
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  iconoIzquierda={<FileBarChart size={14} />}
                  onClick={() => setReportando(e)}
                >
                  Reporte
                </Boton>
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  iconoIzquierda={<Pencil size={14} />}
                  onClick={() => setEditando(e)}
                >
                  Editar
                </Boton>
                <Boton tamano="sm" variante="fantasma" onClick={() => void alternar(e)}>
                  {e.activa ? 'Desactivar' : 'Reactivar'}
                </Boton>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormularioEmpresa
        estado={editando}
        onCerrar={() => setEditando(null)}
        onGuardado={cargar}
      />
      <PacientesDeEmpresa empresa={viendo} onCerrar={() => setViendo(null)} />
      <ReporteDeEmpresa empresa={reportando} onCerrar={() => setReportando(null)} />
    </div>
  )
}

function FormularioEmpresa({
  estado,
  onCerrar,
  onGuardado
}: {
  estado: Empresa | 'nueva' | null
  onCerrar: () => void
  onGuardado: () => Promise<void> | void
}): React.JSX.Element {
  const notificar = useNotificar()
  const editando = estado !== null && estado !== 'nueva' ? estado : null

  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (estado === null) return
    setCodigo(editando?.codigo ?? '')
    setNombre(editando?.nombre ?? '')
    setContacto(editando?.contacto ?? '')
    setTelefono(editando?.telefono ?? '')
    setCorreo(editando?.correo ?? '')
    setNotas(editando?.notas ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  const valido = codigo.trim().length >= 2 && nombre.trim().length >= 2

  async function guardar(): Promise<void> {
    setGuardando(true)
    try {
      const datos = {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        contacto: contacto.trim() || null,
        telefono: telefono.trim() || null,
        correo: correo.trim() || null,
        notas: notas.trim() || null
      }
      if (editando) await pedir(api.empresas.actualizar(editando.id, datos))
      else await pedir(api.empresas.crear(datos))

      notificar.exito(editando ? 'Empresa actualizada' : 'Empresa registrada')
      await onGuardado()
      onCerrar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={estado !== null}
      titulo={editando ? 'Editar empresa' : 'Nueva empresa con convenio'}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            cargando={guardando}
            disabled={!valido}
            onClick={() => void guardar()}
          >
            Guardar
          </Boton>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Entrada
            etiqueta="Código"
            requerido
            placeholder="ACME"
            ayuda="Se guarda en mayúsculas"
            className="w-32"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <Entrada
            etiqueta="Nombre de la empresa"
            requerido
            placeholder="Textiles ACME S. de R.L."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Entrada
            etiqueta="Contacto"
            placeholder="Recursos Humanos"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
          />
          <Entrada
            etiqueta="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
          <Entrada
            etiqueta="Correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </div>
        <AreaTexto
          etiqueta="Notas del convenio"
          rows={3}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>
    </Modal>
  )
}

function PacientesDeEmpresa({
  empresa,
  onCerrar
}: {
  empresa: Empresa | null
  onCerrar: () => void
}): React.JSX.Element {
  const notificar = useNotificar()
  const navegar = useNavigate()
  const [pacientes, setPacientes] = useState<PacienteConResumen[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!empresa) return
    setCargando(true)
    void (async () => {
      try {
        setPacientes(await pedir(api.empresas.pacientes(empresa.id)))
      } catch (error) {
        notificar.error(mensajeDeError(error))
      } finally {
        setCargando(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa])

  return (
    <Modal
      abierto={empresa !== null}
      titulo={`Pacientes de ${empresa?.nombre ?? ''}`}
      ancho="lg"
      onCerrar={onCerrar}
    >
      {cargando ? (
        <Cargando />
      ) : pacientes.length === 0 ? (
        <Vacio
          titulo="Sin pacientes asignados"
          descripcion="Asigne la empresa desde la ficha de cada paciente."
        />
      ) : (
        <table className="w-full border-collapse text-left text-[0.875rem]">
          <thead>
            <tr className="border-b border-[var(--borde)] text-[0.75rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
              <th className="py-2 font-semibold">Código</th>
              <th className="py-2 font-semibold">Paciente</th>
              <th className="py-2 font-semibold">Expediente</th>
              <th className="py-2 text-right font-semibold">Consultas</th>
              <th className="py-2 font-semibold">Última</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr
                key={p.id}
                onClick={() => {
                  onCerrar()
                  navegar(`/pacientes/${p.id}`)
                }}
                className="cursor-pointer border-b border-[var(--borde)] last:border-0 hover:bg-[var(--lienzo)]"
              >
                <td className="py-2 font-mono text-[0.8125rem]">{p.codigoEmpleado ?? '—'}</td>
                <td className="py-2 font-medium text-[var(--tinta)]">{p.nombreCompleto}</td>
                <td className="py-2 text-[var(--tinta-tenue)]">{p.numeroExpediente}</td>
                <td className="py-2 text-right tabular-nums">{p.totalConsultas}</td>
                <td className="py-2 text-[var(--tinta-tenue)]">
                  {p.ultimaConsultaEn ? formatearFecha(p.ultimaConsultaEn) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}

/** Primer día del mes en curso, que es el rango que la clínica pide casi siempre. */
function inicioDeMes(): string {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10)
}

function ReporteDeEmpresa({
  empresa,
  onCerrar
}: {
  empresa: Empresa | null
  onCerrar: () => void
}): React.JSX.Element {
  const notificar = useNotificar()
  const { puede } = useSesion()
  const verClinico = puede('pacientes.ver_clinico')

  const [desde, setDesde] = useState(inicioDeMes())
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10))
  const [reporte, setReporte] = useState<ReporteEmpresa | null>(null)
  const [cargando, setCargando] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)

  const consultar = useCallback(async () => {
    if (!empresa) return
    setCargando(true)
    try {
      setReporte(await pedir(api.empresas.reporte(empresa.id, desde, hasta)))
    } catch (error) {
      notificar.error(mensajeDeError(error))
      setReporte(null)
    } finally {
      setCargando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa, desde, hasta])

  useEffect(() => {
    if (empresa && verClinico) void consultar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa])

  async function imprimir(): Promise<void> {
    if (!empresa) return
    setImprimiendo(true)
    try {
      const { ruta } = await pedir(api.empresas.imprimirReporte(empresa.id, desde, hasta))
      await pedir(api.documentos.abrir(ruta))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <Modal
      abierto={empresa !== null}
      titulo={`Atenciones de ${empresa?.nombre ?? ''}`}
      descripcion="Lo que se le entrega a la empresa para facturarle el periodo."
      ancho="xl"
      onCerrar={onCerrar}
      pie={
        verClinico ? (
          <Boton
            variante="primario"
            cargando={imprimiendo}
            iconoIzquierda={<Printer size={16} />}
            disabled={!reporte}
            onClick={() => void imprimir()}
          >
            Imprimir reporte
          </Boton>
        ) : undefined
      }
    >
      {!verClinico ? (
        <p className="text-[0.9375rem] text-[var(--tinta-suave)]">
          El detalle de atenciones incluye diagnósticos, así que solo pueden verlo los doctores.
        </p>
      ) : (
        <div className="grid gap-3">
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
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
            <Boton variante="secundario" onClick={() => void consultar()}>
              Consultar
            </Boton>
          </div>

          {cargando ? (
            <Cargando />
          ) : !reporte ? null : reporte.atenciones.length === 0 ? (
            <Vacio titulo="Sin atenciones en el periodo" />
          ) : (
            <>
              <div className="flex gap-4 text-[0.875rem]">
                <span>
                  <strong className="tabular-nums">{reporte.totalAtenciones}</strong> atenciones
                </span>
                <span>
                  <strong className="tabular-nums">{reporte.totalPacientes}</strong> empleados
                </span>
              </div>
              <div className="max-h-[45vh] overflow-y-auto">
                <table className="w-full border-collapse text-left text-[0.875rem]">
                  <thead className="sticky top-0 bg-[var(--superficie)]">
                    <tr className="border-b border-[var(--borde)] text-[0.75rem] uppercase tracking-wider text-[var(--tinta-tenue)]">
                      <th className="py-2 font-semibold">Fecha</th>
                      <th className="py-2 font-semibold">Código</th>
                      <th className="py-2 font-semibold">Empleado</th>
                      <th className="py-2 font-semibold">Diagnóstico</th>
                      <th className="py-2 font-semibold">Atendió</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.atenciones.map((a) => (
                      <tr
                        key={a.consultaId}
                        className="border-b border-[var(--borde)] last:border-0"
                      >
                        <td className="py-2 text-[var(--tinta-suave)]">
                          {formatearFecha(a.fecha)}
                        </td>
                        <td className="py-2 font-mono text-[0.8125rem]">
                          {a.codigoEmpleado ?? '—'}
                        </td>
                        <td className="py-2 font-medium text-[var(--tinta)]">{a.nombreCompleto}</td>
                        <td className="py-2 text-[var(--tinta-suave)]">
                          {a.diagnosticoPrincipal ?? a.motivo}
                        </td>
                        <td className="py-2 text-[var(--tinta-tenue)]">{a.nombreDoctor ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
