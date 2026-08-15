import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Pencil, ShieldCheck, Stethoscope, UserPlus, UserRound } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Entrada, Selector } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Aviso, Cargando, Insignia } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { useSesion } from '../../app/Sesion'
import { ROLES } from '@shared/types'
import type { Rol, Usuario, UsuarioInput } from '@shared/types'

export function Usuarios(): React.JSX.Element {
  const notificar = useNotificar()
  const { estado } = useSesion()
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null)
  const [formulario, setFormulario] = useState<{ usuario?: Usuario } | null>(null)
  const [reiniciando, setReiniciando] = useState<Usuario | null>(null)

  const cargar = useCallback(async () => {
    try {
      setUsuarios(await pedir(api.usuarios.listar()))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }, [notificar])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function alternar(usuario: Usuario): Promise<void> {
    try {
      await pedir(api.usuarios.alternar(usuario.id, !usuario.activo))
      notificar.exito(usuario.activo ? 'Usuario desactivado' : 'Usuario reactivado')
      await cargar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  if (!usuarios) return <Cargando />

  const secretarias = usuarios.filter((u) => u.rol === 'secretaria' && u.activo)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-5 px-8 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--tinta)]">Equipo</h1>
          <p className="text-[0.875rem] text-[var(--tinta-suave)]">
            {usuarios.filter((u) => u.activo).length} usuarios activos
          </p>
        </div>
        <Boton
          variante="primario"
          iconoIzquierda={<UserPlus size={16} />}
          onClick={() => setFormulario({})}
        >
          Nuevo usuario
        </Boton>
      </header>

      {secretarias.length === 0 && (
        <Aviso tono="alerta">
          No hay ninguna secretaria activa. Solo el rol de secretaria puede crear y mover citas,
          así que en este momento nadie puede gestionar la agenda.
        </Aviso>
      )}

      <div className="superficie overflow-hidden">
        <ul className="divide-y divide-[var(--borde)]">
          {usuarios.map((usuario) => (
            <li
              key={usuario.id}
              className={`flex items-center gap-3 px-4 py-3 ${usuario.activo ? '' : 'opacity-55'}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca-100 text-marca-700 oscuro:bg-marca-900 oscuro:text-marca-300">
                {usuario.rol === 'doctor' ? <Stethoscope size={17} /> : <UserRound size={17} />}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-[var(--tinta)]">{usuario.nombre}</span>
                  {usuario.esAdministrador && (
                    <Insignia tono="marca">
                      <ShieldCheck size={11} />
                      Administrador
                    </Insignia>
                  )}
                  {!usuario.activo && <Insignia>Desactivado</Insignia>}
                  {usuario.debeCambiarPassword && (
                    <Insignia tono="alerta">Debe cambiar contraseña</Insignia>
                  )}
                  {usuario.id === estado?.sesion?.usuarioId && <Insignia tono="exito">Usted</Insignia>}
                </div>
                <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">
                  {usuario.rol === 'doctor'
                    ? 'Consultas y expedientes completos'
                    : 'Agenda y datos de contacto'}
                </p>
              </div>

              <Boton
                tamano="sm"
                variante="fantasma"
                iconoIzquierda={<KeyRound size={14} />}
                onClick={() => setReiniciando(usuario)}
              >
                Contraseña
              </Boton>
              <Boton
                tamano="sm"
                variante="fantasma"
                iconoIzquierda={<Pencil size={14} />}
                onClick={() => setFormulario({ usuario })}
              >
                Editar
              </Boton>
              <Boton
                tamano="sm"
                variante="fantasma"
                disabled={usuario.id === estado?.sesion?.usuarioId}
                onClick={() => void alternar(usuario)}
              >
                {usuario.activo ? 'Desactivar' : 'Reactivar'}
              </Boton>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">
        Los usuarios no se eliminan: se desactivan. Así las consultas y las citas que registraron
        conservan su autor y el historial no queda con huecos.
      </p>

      {formulario && (
        <FormularioUsuario
          usuario={formulario.usuario}
          onCerrar={() => setFormulario(null)}
          onGuardado={async () => {
            setFormulario(null)
            await cargar()
          }}
        />
      )}

      {reiniciando && (
        <ModalPassword
          usuario={reiniciando}
          onCerrar={() => setReiniciando(null)}
          onGuardado={async () => {
            setReiniciando(null)
            await cargar()
          }}
        />
      )}
    </div>
  )
}

function FormularioUsuario({
  usuario,
  onCerrar,
  onGuardado
}: {
  usuario?: Usuario
  onCerrar: () => void
  onGuardado: () => Promise<void>
}): React.JSX.Element {
  const notificar = useNotificar()
  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? 'doctor')
  const [esAdministrador, setEsAdministrador] = useState(usuario?.esAdministrador ?? false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const editando = usuario !== undefined

  async function guardar(): Promise<void> {
    setError(null)
    setGuardando(true)
    try {
      const datos: UsuarioInput = { nombre: nombre.trim(), rol, esAdministrador }
      if (editando && usuario) {
        await pedir(api.usuarios.actualizar(usuario.id, datos))
        notificar.exito('Usuario actualizado')
      } else {
        await pedir(api.usuarios.crear({ ...datos, password }))
        notificar.exito('Usuario creado')
      }
      await onGuardado()
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto
      titulo={editando ? 'Editar usuario' : 'Nuevo usuario'}
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
            disabled={nombre.trim().length < 3 || (!editando && password.length < 8)}
            onClick={() => void guardar()}
          >
            {editando ? 'Guardar' : 'Crear usuario'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        {error && <Aviso tono="critico">{error}</Aviso>}

        <Entrada
          etiqueta="Nombre"
          requerido
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Doctor 2"
          ayuda="Aparece en las recetas que firme y en el historial de sus consultas."
        />

        <Selector
          etiqueta="Rol"
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
          opciones={ROLES.map((r) => ({ valor: r.valor, etiqueta: r.etiqueta }))}
          ayuda={ROLES.find((r) => r.valor === rol)?.descripcion}
        />

        {!editando && (
          <Entrada
            etiqueta="Contraseña inicial"
            requerido
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            ayuda="Mínimo 8 caracteres. Se le pedirá cambiarla al entrar por primera vez."
          />
        )}

        <label className="flex cursor-pointer items-start gap-2.5 text-[0.875rem] text-[var(--tinta)]">
          <input
            type="checkbox"
            checked={esAdministrador}
            onChange={(e) => setEsAdministrador(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-marca-600)]"
          />
          <span>
            Administrador
            <span className="block text-[0.8125rem] text-[var(--tinta-tenue)]">
              Puede gestionar usuarios, restaurar copias de seguridad, editar los datos de la
              clínica y eliminar expedientes de forma definitiva.
            </span>
          </span>
        </label>

        {rol === 'secretaria' && esAdministrador && (
          <Aviso tono="alerta">
            Una secretaria administradora podría restaurar copias de seguridad y eliminar
            expedientes, aunque no pueda abrirlos. Conviene reservar este permiso a un doctor.
          </Aviso>
        )}
      </div>
    </Modal>
  )
}

function ModalPassword({
  usuario,
  onCerrar,
  onGuardado
}: {
  usuario: Usuario
  onCerrar: () => void
  onGuardado: () => Promise<void>
}): React.JSX.Element {
  const notificar = useNotificar()
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(): Promise<void> {
    setGuardando(true)
    try {
      await pedir(api.usuarios.reiniciarPassword(usuario.id, password))
      notificar.exito(`Contraseña asignada a ${usuario.nombre}`)
      await onGuardado()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto
      titulo="Asignar contraseña"
      descripcion={usuario.nombre}
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
            disabled={password.length < 8}
            onClick={() => void guardar()}
          >
            Asignar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Entrada
          etiqueta="Contraseña temporal"
          requerido
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          ayuda="Mínimo 8 caracteres."
        />
        <Aviso tono="info">
          Comuníquesela en persona, no por mensaje. El sistema le pedirá cambiarla la próxima vez
          que entre, de modo que usted no conocerá su contraseña definitiva.
        </Aviso>
      </div>
    </Modal>
  )
}
