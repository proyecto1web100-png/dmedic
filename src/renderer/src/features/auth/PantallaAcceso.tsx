import { useState, type FormEvent } from 'react'
import { KeyRound, Lock, Stethoscope, UserRound } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Entrada } from '../../components/ui/Campo'
import { Aviso } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useSesion } from '../../app/Sesion'
import { CodigoRecuperacion } from './CodigoRecuperacion'
import type { UsuarioParaAcceso } from '@shared/types'

type Modo = 'entrar' | 'recuperar'

export function PantallaAcceso(): React.JSX.Element {
  const { estado, config, refrescar, refrescarConfig } = useSesion()
  const instalado = estado?.instalado ?? false

  const [modo, setModo] = useState<Modo>('entrar')
  const [codigoEmitido, setCodigoEmitido] = useState<string | null>(null)

  if (codigoEmitido) {
    return (
      <Marco>
        <CodigoRecuperacion
          codigo={codigoEmitido}
          onContinuar={async () => {
            setCodigoEmitido(null)
            await Promise.all([refrescar(), refrescarConfig()])
          }}
        />
      </Marco>
    )
  }

  return (
    <Marco nombreClinica={config?.nombreClinica}>
      {!instalado ? (
        <FormularioInstalacion onInstalado={setCodigoEmitido} />
      ) : modo === 'entrar' ? (
        <FormularioEntrar
          usuarios={estado?.usuarios ?? []}
          onRecuperar={() => setModo('recuperar')}
          onEntrado={refrescar}
        />
      ) : (
        <FormularioRecuperar onCancelar={() => setModo('entrar')} onRecuperado={setCodigoEmitido} />
      )}
    </Marco>
  )
}

function Marco({
  children,
  nombreClinica
}: {
  children: React.ReactNode
  nombreClinica?: string
}): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--lienzo)] p-6">
      <div className="w-full max-w-[26rem]">
        <div className="mb-7 flex flex-col items-center gap-2.5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-marca-600 text-white shadow-sm">
            <Stethoscope size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--tinta)]">
              {nombreClinica || 'DMedic'}
            </h1>
            <p className="text-[0.8125rem] text-[var(--tinta-suave)]">
              Sistema de gestión clínica
            </p>
          </div>
        </div>
        <div className="superficie p-6">{children}</div>
        <p className="mt-4 text-center text-[0.75rem] text-[var(--tinta-tenue)]">
          Toda la información se guarda únicamente en esta computadora.
        </p>
      </div>
    </div>
  )
}

function FormularioInstalacion({
  onInstalado
}: {
  onInstalado: (codigo: string) => void
}): React.JSX.Element {
  const [nombreDoctor, setNombreDoctor] = useState('')
  const [nombreClinica, setNombreClinica] = useState('DMedic')
  const [password, setPassword] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setError(null)

    if (nombreDoctor.trim().length < 3) {
      setError('Escriba el nombre del doctor')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== repetir) {
      setError('Las contraseñas no coinciden')
      return
    }

    setEnviando(true)
    try {
      const resultado = await pedir(
        api.auth.instalar({
          nombreDoctor: nombreDoctor.trim(),
          nombreClinica: nombreClinica.trim() || 'DMedic',
          password
        })
      )
      onInstalado(resultado.codigoRecuperacion)
    } catch (fallo) {
      setError(mensajeDeError(fallo))
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3.5">
      <div>
        <h2 className="text-[1.0625rem] font-semibold text-[var(--tinta)]">Configuración inicial</h2>
        <p className="mt-0.5 text-[0.84375rem] text-[var(--tinta-suave)]">
          Este paso se realiza una sola vez.
        </p>
      </div>

      <Entrada
        etiqueta="Nombre del doctor"
        requerido
        autoFocus
        value={nombreDoctor}
        onChange={(e) => setNombreDoctor(e.target.value)}
        placeholder="Dr. Nombre Apellido"
      />
      <Entrada
        etiqueta="Nombre de la clínica"
        requerido
        value={nombreClinica}
        onChange={(e) => setNombreClinica(e.target.value)}
      />
      <Entrada
        etiqueta="Contraseña"
        requerido
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        ayuda="Mínimo 8 caracteres."
      />
      <Entrada
        etiqueta="Repetir contraseña"
        requerido
        type="password"
        value={repetir}
        onChange={(e) => setRepetir(e.target.value)}
      />

      {error && <Aviso tono="critico">{error}</Aviso>}

      <Boton type="submit" variante="primario" tamano="lg" cargando={enviando} className="mt-1">
        Crear cuenta
      </Boton>
    </form>
  )
}

function FormularioEntrar({
  usuarios,
  onRecuperar,
  onEntrado
}: {
  usuarios: UsuarioParaAcceso[]
  onRecuperar: () => void
  onEntrado: () => Promise<void>
}): React.JSX.Element {
  // Con un solo usuario no tiene sentido hacerle elegir.
  const [elegido, setElegido] = useState<UsuarioParaAcceso | null>(
    usuarios.length === 1 ? usuarios[0] : null
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    if (!elegido) return
    setError(null)
    setEnviando(true)
    try {
      await pedir(api.auth.entrar(elegido.id, password))
      setPassword('')
      await onEntrado()
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    } finally {
      setEnviando(false)
    }
  }

  if (!elegido) {
    return (
      <div className="flex flex-col gap-2">
        <p className="mb-1 text-[0.875rem] text-[var(--tinta-suave)]">¿Quién va a entrar?</p>
        {usuarios.map((usuario) => (
          <button
            key={usuario.id}
            onClick={() => setElegido(usuario)}
            className="flex items-center gap-3 rounded-lg border border-[var(--borde)] px-3.5 py-3 text-left transition-colors hover:border-marca-400 hover:bg-marca-50 oscuro:hover:bg-marca-900/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca-100 text-marca-700 oscuro:bg-marca-900 oscuro:text-marca-300">
              {usuario.rol === 'doctor' ? <Stethoscope size={17} /> : <UserRound size={17} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-[var(--tinta)]">
                {usuario.nombre}
              </span>
              <span className="block text-[0.8125rem] text-[var(--tinta-tenue)]">
                {usuario.rol === 'doctor' ? 'Doctor' : 'Secretaria'}
                {usuario.bloqueadoHasta ? ' · bloqueado temporalmente' : ''}
              </span>
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca-100 text-marca-700 oscuro:bg-marca-900 oscuro:text-marca-300">
          {elegido.rol === 'doctor' ? <Stethoscope size={17} /> : <UserRound size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[var(--tinta)]">{elegido.nombre}</p>
          <p className="text-[0.8125rem] text-[var(--tinta-tenue)]">
            {elegido.rol === 'doctor' ? 'Doctor' : 'Secretaria'}
          </p>
        </div>
        {usuarios.length > 1 && (
          <Boton
            tamano="sm"
            variante="fantasma"
            onClick={() => {
              setElegido(null)
              setPassword('')
              setError(null)
            }}
          >
            Cambiar
          </Boton>
        )}
      </div>

      <Entrada
        etiqueta="Contraseña"
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Ingrese su contraseña"
      />

      {error && <Aviso tono="critico">{error}</Aviso>}

      <Boton
        type="submit"
        variante="primario"
        tamano="lg"
        cargando={enviando}
        iconoIzquierda={<Lock size={16} />}
      >
        Entrar
      </Boton>

      <button
        type="button"
        onClick={onRecuperar}
        className="mt-0.5 text-center text-[0.8125rem] font-medium text-marca-700 transition-colors hover:text-marca-800 oscuro:text-marca-400 oscuro:hover:text-marca-300"
      >
        Olvidé mi contraseña
      </button>
    </form>
  )
}

function FormularioRecuperar({
  onCancelar,
  onRecuperado
}: {
  onCancelar: () => void
  onRecuperado: (codigo: string) => void
}): React.JSX.Element {
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== repetir) {
      setError('Las contraseñas no coinciden')
      return
    }

    setEnviando(true)
    try {
      const resultado = await pedir(api.auth.recuperar(codigo, password))
      onRecuperado(resultado.codigoRecuperacion)
    } catch (fallo) {
      setError(mensajeDeError(fallo))
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3.5">
      <div>
        <h2 className="text-[1.0625rem] font-semibold text-[var(--tinta)]">Recuperar acceso</h2>
        <p className="mt-0.5 text-[0.84375rem] text-[var(--tinta-suave)]">
          Use el código que se le entregó al instalar el sistema.
        </p>
      </div>

      <Entrada
        etiqueta="Código de recuperación"
        requerido
        autoFocus
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
        className="font-mono"
      />
      <Entrada
        etiqueta="Nueva contraseña"
        requerido
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Entrada
        etiqueta="Repetir nueva contraseña"
        requerido
        type="password"
        value={repetir}
        onChange={(e) => setRepetir(e.target.value)}
      />

      {error && <Aviso tono="critico">{error}</Aviso>}

      <Boton
        type="submit"
        variante="primario"
        tamano="lg"
        cargando={enviando}
        iconoIzquierda={<KeyRound size={16} />}
      >
        Restablecer contraseña
      </Boton>
      <Boton type="button" variante="fantasma" onClick={onCancelar}>
        Volver
      </Boton>
    </form>
  )
}

