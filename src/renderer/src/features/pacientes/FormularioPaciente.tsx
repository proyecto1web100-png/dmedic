import { useEffect, useState } from 'react'
import { Boton } from '../../components/ui/Boton'
import { AreaTexto, Entrada, Selector } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Aviso } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { calcularEdad } from '@shared/lib/paciente'
import type { ContactoEmergencia, Paciente, PacienteConResumen, PacienteInput } from '@shared/types'

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({
  valor: v,
  etiqueta: v
}))

const CONTACTO_VACIO: ContactoEmergencia = { nombre: '', telefono: '', parentesco: '' }

function estadoInicial(): PacienteInput {
  return {
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    fechaNacimiento: '',
    sexo: 'M',
    numeroIdentidad: '',
    telefono: '',
    correo: '',
    direccion: '',
    tipoSangre: null,
    aseguradora: '',
    referidoPor: '',
    notas: '',
    responsableId: null,
    responsableParentesco: '',
    contactos: []
  }
}

interface Props {
  abierto: boolean
  paciente?: Paciente & { contactos?: ContactoEmergencia[] }
  onCerrar: () => void
  onGuardado: (id: number) => void
}

export function FormularioPaciente({
  abierto,
  paciente,
  onCerrar,
  onGuardado
}: Props): React.JSX.Element {
  const notificar = useNotificar()
  const [datos, setDatos] = useState<PacienteInput>(estadoInicial)
  const [error, setError] = useState<string | null>(null)
  const [duplicados, setDuplicados] = useState<PacienteConResumen[]>([])
  const [guardando, setGuardando] = useState(false)

  const editando = paciente !== undefined

  useEffect(() => {
    if (!abierto) return
    setError(null)
    setDuplicados([])
    if (paciente) {
      setDatos({
        primerNombre: paciente.primerNombre,
        segundoNombre: paciente.segundoNombre ?? '',
        primerApellido: paciente.primerApellido,
        segundoApellido: paciente.segundoApellido ?? '',
        fechaNacimiento: paciente.fechaNacimiento,
        sexo: paciente.sexo,
        numeroIdentidad: paciente.numeroIdentidad ?? '',
        telefono: paciente.telefono ?? '',
        correo: paciente.correo ?? '',
        direccion: paciente.direccion ?? '',
        tipoSangre: paciente.tipoSangre,
        aseguradora: paciente.aseguradora ?? '',
        referidoPor: paciente.referidoPor ?? '',
        notas: paciente.notas ?? '',
        responsableId: paciente.responsableId,
        responsableParentesco: paciente.responsableParentesco ?? '',
        contactos: paciente.contactos ?? []
      })
    } else {
      setDatos(estadoInicial())
    }
  }, [abierto, paciente])

  // Aviso temprano de posible alta repetida: mismo nombre y misma fecha de nacimiento.
  useEffect(() => {
    if (!abierto) return
    const { primerNombre, primerApellido, fechaNacimiento } = datos
    if (!primerNombre || !primerApellido || !fechaNacimiento) {
      setDuplicados([])
      return
    }
    let vigente = true
    const temporizador = window.setTimeout(async () => {
      try {
        const encontrados = await pedir(
          api.pacientes.revisarDuplicados({
            primerNombre,
            primerApellido,
            fechaNacimiento,
            excluirId: paciente?.id
          })
        )
        if (vigente) setDuplicados(encontrados)
      } catch {
        if (vigente) setDuplicados([])
      }
    }, 350)
    return () => {
      vigente = false
      window.clearTimeout(temporizador)
    }
  }, [abierto, datos.primerNombre, datos.primerApellido, datos.fechaNacimiento, paciente?.id])

  function actualizar<C extends keyof PacienteInput>(campo: C, valor: PacienteInput[C]): void {
    setDatos((actual) => ({ ...actual, [campo]: valor }))
  }

  function actualizarContacto(indice: number, campo: keyof ContactoEmergencia, valor: string): void {
    setDatos((actual) => {
      const contactos = [...(actual.contactos ?? [])]
      contactos[indice] = { ...contactos[indice], [campo]: valor }
      return { ...actual, contactos }
    })
  }

  async function guardar(): Promise<void> {
    setError(null)
    setGuardando(true)
    try {
      // Los contactos en blanco no se envían: evitan validaciones inútiles.
      const contactos = (datos.contactos ?? []).filter(
        (c) => c.nombre.trim().length > 0 || c.telefono.trim().length > 0
      )
      const carga: PacienteInput = { ...datos, contactos }

      if (editando && paciente) {
        await pedir(api.pacientes.actualizar(paciente.id, carga))
        notificar.exito('Paciente actualizado')
        onGuardado(paciente.id)
      } else {
        const id = await pedir(api.pacientes.crear(carga))
        notificar.exito('Paciente registrado')
        onGuardado(id)
      }
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    } finally {
      setGuardando(false)
    }
  }

  const edad = datos.fechaNacimiento ? calcularEdad(datos.fechaNacimiento) : null
  const contactos = datos.contactos ?? []

  return (
    <Modal
      abierto={abierto}
      titulo={editando ? 'Editar paciente' : 'Nuevo paciente'}
      descripcion={
        editando
          ? 'Los datos personales son permanentes del paciente, no de una consulta.'
          : 'Registre los datos permanentes. Lo clínico se captura en cada consulta.'
      }
      ancho="lg"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="primario" cargando={guardando} onClick={() => void guardar()}>
            {editando ? 'Guardar cambios' : 'Registrar paciente'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Aviso tono="critico">{error}</Aviso>}

        {duplicados.length > 0 && (
          <Aviso tono="alerta">
            Ya existe {duplicados.length === 1 ? 'un paciente' : `${duplicados.length} pacientes`}{' '}
            con ese nombre y fecha de nacimiento:{' '}
            {duplicados.map((d) => `${d.nombreCompleto} (${d.numeroExpediente})`).join(', ')}.
            Verifique que no se trate del mismo paciente antes de continuar.
          </Aviso>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Entrada
            etiqueta="Primer nombre"
            requerido
            value={datos.primerNombre}
            onChange={(e) => actualizar('primerNombre', e.target.value)}
          />
          <Entrada
            etiqueta="Segundo nombre"
            value={datos.segundoNombre ?? ''}
            onChange={(e) => actualizar('segundoNombre', e.target.value)}
          />
          <Entrada
            etiqueta="Primer apellido"
            requerido
            value={datos.primerApellido}
            onChange={(e) => actualizar('primerApellido', e.target.value)}
          />
          <Entrada
            etiqueta="Segundo apellido"
            value={datos.segundoApellido ?? ''}
            onChange={(e) => actualizar('segundoApellido', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Entrada
            etiqueta="Fecha de nacimiento"
            requerido
            type="date"
            value={datos.fechaNacimiento}
            onChange={(e) => actualizar('fechaNacimiento', e.target.value)}
            ayuda={edad !== null ? `${edad} años` : undefined}
          />
          <Selector
            etiqueta="Sexo"
            requerido
            value={datos.sexo}
            onChange={(e) => actualizar('sexo', e.target.value as 'M' | 'F')}
            opciones={[
              { valor: 'M', etiqueta: 'Masculino' },
              { valor: 'F', etiqueta: 'Femenino' }
            ]}
          />
          <Selector
            etiqueta="Tipo de sangre"
            value={datos.tipoSangre ?? ''}
            onChange={(e) => actualizar('tipoSangre', e.target.value || null)}
            opciones={TIPOS_SANGRE}
            marcador="No registrado"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Entrada
            etiqueta="Número de identidad"
            value={datos.numeroIdentidad ?? ''}
            onChange={(e) => actualizar('numeroIdentidad', e.target.value)}
            placeholder="0801199012345"
            ayuda="13 dígitos. Puede dejarse vacío en menores vinculados a un responsable."
          />
          <Entrada
            etiqueta="Teléfono"
            value={datos.telefono ?? ''}
            onChange={(e) => actualizar('telefono', e.target.value)}
            placeholder="9999-9999"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Entrada
            etiqueta="Correo electrónico"
            type="email"
            value={datos.correo ?? ''}
            onChange={(e) => actualizar('correo', e.target.value)}
          />
          <Entrada
            etiqueta="Aseguradora"
            value={datos.aseguradora ?? ''}
            onChange={(e) => actualizar('aseguradora', e.target.value)}
          />
        </div>

        <Entrada
          etiqueta="Dirección"
          value={datos.direccion ?? ''}
          onChange={(e) => actualizar('direccion', e.target.value)}
        />

        <Entrada
          etiqueta="Referido por"
          value={datos.referidoPor ?? ''}
          onChange={(e) => actualizar('referidoPor', e.target.value)}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="etiqueta mb-0">Contactos de emergencia</span>
            {contactos.length < 3 && (
              <Boton
                tamano="sm"
                variante="fantasma"
                onClick={() => actualizar('contactos', [...contactos, { ...CONTACTO_VACIO }])}
              >
                Agregar contacto
              </Boton>
            )}
          </div>

          {contactos.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">
              Sin contactos registrados. Puede agregar hasta 3.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {contactos.map((contacto, indice) => (
                <div key={indice} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                  <Entrada
                    placeholder="Nombre"
                    value={contacto.nombre}
                    onChange={(e) => actualizarContacto(indice, 'nombre', e.target.value)}
                  />
                  <Entrada
                    placeholder="Teléfono"
                    value={contacto.telefono}
                    onChange={(e) => actualizarContacto(indice, 'telefono', e.target.value)}
                  />
                  <Entrada
                    placeholder="Parentesco"
                    value={contacto.parentesco ?? ''}
                    onChange={(e) => actualizarContacto(indice, 'parentesco', e.target.value)}
                  />
                  <Boton
                    tamano="sm"
                    variante="fantasma"
                    onClick={() =>
                      actualizar(
                        'contactos',
                        contactos.filter((_, i) => i !== indice)
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

        <AreaTexto
          etiqueta="Notas del paciente"
          value={datos.notas ?? ''}
          onChange={(e) => actualizar('notas', e.target.value)}
          ayuda="Información general permanente. Lo clínico de cada visita va en la consulta."
        />
      </div>
    </Modal>
  )
}
