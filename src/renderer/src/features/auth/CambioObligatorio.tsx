import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Entrada } from '../../components/ui/Campo'
import { Aviso } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useSesion } from '../../app/Sesion'

/**
 * Se interpone tras entrar con una contraseña asignada por el administrador.
 * Mientras no la cambie, quien la asignó conoce su clave y la auditoría no
 * podría atribuirle sus acciones con certeza.
 */
export function CambioObligatorio(): React.JSX.Element {
  const { estado, refrescar } = useSesion()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setError(null)

    if (nueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (nueva !== repetir) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (nueva === actual) {
      setError('La nueva contraseña debe ser distinta de la temporal')
      return
    }

    setEnviando(true)
    try {
      await pedir(api.auth.cambiarPassword(actual, nueva))
      await refrescar()
    } catch (fallo) {
      setError(mensajeDeError(fallo))
      setEnviando(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-[var(--lienzo)] p-6">
      <div className="w-full max-w-[26rem]">
        <div className="mb-7 flex flex-col items-center gap-2.5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-marca-600 text-white shadow-sm">
            <KeyRound size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--tinta)]">
              Elija su contraseña
            </h1>
            <p className="text-[0.875rem] text-[var(--tinta-suave)]">
              {estado?.sesion?.nombre}
            </p>
          </div>
        </div>

        <form onSubmit={enviar} className="superficie flex flex-col gap-3.5 p-6">
          <Aviso tono="info">
            Está usando la contraseña temporal que le asignó el administrador. Elija una propia
            antes de continuar: nadie más debe conocerla.
          </Aviso>

          <Entrada
            etiqueta="Contraseña temporal"
            requerido
            autoFocus
            type="password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
          <Entrada
            etiqueta="Nueva contraseña"
            requerido
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            ayuda="Mínimo 8 caracteres."
          />
          <Entrada
            etiqueta="Repetir nueva contraseña"
            requerido
            type="password"
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
          />

          {error && <Aviso tono="critico">{error}</Aviso>}

          <Boton type="submit" variante="primario" tamano="lg" cargando={enviando}>
            Guardar y continuar
          </Boton>
        </form>
      </div>
    </div>
  )
}
