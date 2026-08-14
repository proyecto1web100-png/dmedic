import { useState } from 'react'
import { Check, Copy, KeyRound } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Aviso } from '../../components/ui/Varios'

/**
 * El codigo se muestra UNA sola vez. Al no haber servidor ni correo, no existe
 * ninguna forma de reemitirlo: por eso la pantalla obliga a confirmar que se
 * guardo antes de continuar.
 */
export function CodigoRecuperacion({
  codigo,
  onContinuar
}: {
  codigo: string
  onContinuar: () => void | Promise<void>
}): React.JSX.Element {
  const [copiado, setCopiado] = useState(false)
  const [confirmado, setConfirmado] = useState(false)

  async function copiar(): Promise<void> {
    await navigator.clipboard.writeText(codigo)
    setCopiado(true)
    window.setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marca-100 text-marca-700 oscuro:bg-marca-900 oscuro:text-marca-300">
          <KeyRound size={18} />
        </span>
        <div>
          <h2 className="text-[1.0625rem] font-semibold text-[var(--tinta)]">
            Código de recuperación
          </h2>
          <p className="text-[0.84375rem] text-[var(--tinta-suave)]">
            Se muestra una sola vez.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-marca-400 bg-marca-50 px-4 py-4 text-center oscuro:bg-marca-900/40">
        <code className="select-all font-mono text-[1.0625rem] font-bold tracking-wider text-marca-800 oscuro:text-marca-200">
          {codigo}
        </code>
      </div>

      <Boton
        variante="secundario"
        onClick={copiar}
        iconoIzquierda={copiado ? <Check size={15} /> : <Copy size={15} />}
      >
        {copiado ? 'Copiado' : 'Copiar código'}
      </Boton>

      <Aviso tono="alerta">
        Guárdelo impreso o en un lugar seguro fuera de esta computadora. Es la única forma de
        recuperar el acceso si olvida la contraseña. Si lo pierde, no habrá manera de entrar al
        sistema ni de leer los expedientes.
      </Aviso>

      <label className="flex cursor-pointer items-start gap-2.5 text-[0.875rem] text-[var(--tinta)]">
        <input
          type="checkbox"
          checked={confirmado}
          onChange={(e) => setConfirmado(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-marca-600)]"
        />
        <span>He guardado el código en un lugar seguro.</span>
      </label>

      <Boton
        variante="primario"
        tamano="lg"
        disabled={!confirmado}
        onClick={() => void onContinuar()}
      >
        Continuar
      </Boton>
    </div>
  )
}
