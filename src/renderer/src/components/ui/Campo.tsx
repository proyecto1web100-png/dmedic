import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from 'react'

interface Envoltura {
  etiqueta?: string
  error?: string | null
  ayuda?: string
  requerido?: boolean
  className?: string
}

function Envolver({
  etiqueta,
  error,
  ayuda,
  requerido,
  id,
  className = '',
  children
}: Envoltura & { id: string; children: ReactNode }): React.JSX.Element {
  return (
    <div className={className}>
      {etiqueta && (
        <label htmlFor={id} className="etiqueta">
          {etiqueta}
          {requerido && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-[0.78125rem] font-medium text-red-600 oscuro:text-red-400">
          {error}
        </p>
      ) : ayuda ? (
        <p className="mt-1 text-[0.78125rem] text-[var(--tinta-tenue)]">{ayuda}</p>
      ) : null}
    </div>
  )
}

type PropsEntrada = Envoltura & InputHTMLAttributes<HTMLInputElement>

export const Entrada = forwardRef<HTMLInputElement, PropsEntrada>(function Entrada(
  { etiqueta, error, ayuda, requerido, className, id, ...resto },
  ref
) {
  const generado = useId()
  const identificador = id ?? generado
  return (
    <Envolver
      etiqueta={etiqueta}
      error={error}
      ayuda={ayuda}
      requerido={requerido}
      id={identificador}
      className={className}
    >
      <input
        ref={ref}
        id={identificador}
        aria-invalid={error ? true : undefined}
        className={`campo-base ${error ? 'campo-invalido' : ''}`}
        {...resto}
      />
    </Envolver>
  )
})

type PropsArea = Envoltura & TextareaHTMLAttributes<HTMLTextAreaElement>

export const AreaTexto = forwardRef<HTMLTextAreaElement, PropsArea>(function AreaTexto(
  { etiqueta, error, ayuda, requerido, className, id, rows = 3, ...resto },
  ref
) {
  const generado = useId()
  const identificador = id ?? generado
  return (
    <Envolver
      etiqueta={etiqueta}
      error={error}
      ayuda={ayuda}
      requerido={requerido}
      id={identificador}
      className={className}
    >
      <textarea
        ref={ref}
        id={identificador}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={`campo-base resize-y leading-relaxed ${error ? 'campo-invalido' : ''}`}
        {...resto}
      />
    </Envolver>
  )
})

type PropsSelector = Envoltura &
  SelectHTMLAttributes<HTMLSelectElement> & {
    opciones: { valor: string; etiqueta: string }[]
    marcador?: string
  }

export const Selector = forwardRef<HTMLSelectElement, PropsSelector>(function Selector(
  { etiqueta, error, ayuda, requerido, className, id, opciones, marcador, ...resto },
  ref
) {
  const generado = useId()
  const identificador = id ?? generado
  return (
    <Envolver
      etiqueta={etiqueta}
      error={error}
      ayuda={ayuda}
      requerido={requerido}
      id={identificador}
      className={className}
    >
      <select
        ref={ref}
        id={identificador}
        aria-invalid={error ? true : undefined}
        className={`campo-base cursor-pointer appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8 ${error ? 'campo-invalido' : ''}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a9aa8' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"
        }}
        {...resto}
      >
        {marcador && <option value="">{marcador}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </Envolver>
  )
})
