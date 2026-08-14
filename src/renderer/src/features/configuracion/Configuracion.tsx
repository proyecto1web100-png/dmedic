import { useEffect, useRef, useState } from 'react'
import { Database, HardDriveDownload, Image, Lock, RotateCcw, Save, Upload } from 'lucide-react'
import { Boton } from '../../components/ui/Boton'
import { Entrada, Selector } from '../../components/ui/Campo'
import { Modal } from '../../components/ui/Modal'
import { Aviso, Cargando, Insignia } from '../../components/ui/Varios'
import { api, mensajeDeError, pedir } from '../../lib/api'
import { useNotificar } from '../../app/Notificaciones'
import { useSesion } from '../../app/Sesion'
import { formatearFechaHora } from '@shared/lib/fecha'
import { PanelActualizaciones } from './PanelActualizaciones'
import type { ArchivoBackupPublico, ConfiguracionClinica } from '@shared/types'

const LOGO_MAXIMO_BYTES = 512 * 1024

export function Configuracion(): React.JSX.Element {
  const { config, refrescarConfig } = useSesion()
  const notificar = useNotificar()
  const [datos, setDatos] = useState<ConfiguracionClinica | null>(null)
  const [guardando, setGuardando] = useState(false)
  const archivoLogo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (config) setDatos(config)
  }, [config])

  if (!datos) return <Cargando />

  function cambiar<C extends keyof ConfiguracionClinica>(
    campo: C,
    valor: ConfiguracionClinica[C]
  ): void {
    setDatos((actual) => (actual ? { ...actual, [campo]: valor } : actual))
  }

  async function guardar(): Promise<void> {
    if (!datos) return
    setGuardando(true)
    try {
      await pedir(api.config.guardar(datos))
      await refrescarConfig()
      notificar.exito('Configuración guardada')
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  function cargarLogo(evento: React.ChangeEvent<HTMLInputElement>): void {
    const archivo = evento.target.files?.[0]
    if (!archivo) return
    if (archivo.size > LOGO_MAXIMO_BYTES) {
      notificar.error('El logo no debe superar 512 KB')
      return
    }
    const lector = new FileReader()
    lector.onload = () => cambiar('logoDataUrl', String(lector.result))
    lector.readAsDataURL(archivo)
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-5 px-8 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight text-[var(--tinta)]">Configuración</h1>
        <Boton
          variante="primario"
          iconoIzquierda={<Save size={16} />}
          cargando={guardando}
          onClick={() => void guardar()}
        >
          Guardar cambios
        </Boton>
      </header>

      <section className="superficie px-5 py-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
          Datos de la clínica
        </h2>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Entrada
              etiqueta="Nombre de la clínica"
              value={datos.nombreClinica}
              onChange={(e) => cambiar('nombreClinica', e.target.value)}
            />
            <Entrada
              etiqueta="Teléfono"
              value={datos.telefono ?? ''}
              onChange={(e) => cambiar('telefono', e.target.value)}
            />
          </div>
          <Entrada
            etiqueta="Dirección"
            value={datos.direccion ?? ''}
            onChange={(e) => cambiar('direccion', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Entrada
              etiqueta="Nombre del doctor"
              value={datos.nombreDoctor}
              onChange={(e) => cambiar('nombreDoctor', e.target.value)}
            />
            <Entrada
              etiqueta="Especialidad"
              value={datos.especialidad ?? ''}
              onChange={(e) => cambiar('especialidad', e.target.value)}
            />
          </div>

          <div>
            <span className="etiqueta">Logo (aparece en recetas y documentos)</span>
            <div className="flex items-center gap-3">
              {datos.logoDataUrl ? (
                <img
                  src={datos.logoDataUrl}
                  alt="Logo de la clínica"
                  className="h-14 w-14 rounded-lg border border-[var(--borde)] object-contain p-1"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-[var(--borde)] text-[var(--tinta-tenue)]">
                  <Image size={20} />
                </div>
              )}
              <input
                ref={archivoLogo}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={cargarLogo}
                className="hidden"
              />
              <Boton
                tamano="sm"
                iconoIzquierda={<Upload size={14} />}
                onClick={() => archivoLogo.current?.click()}
              >
                Seleccionar imagen
              </Boton>
              {datos.logoDataUrl && (
                <Boton tamano="sm" variante="fantasma" onClick={() => cambiar('logoDataUrl', null)}>
                  Quitar
                </Boton>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="superficie px-5 py-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
          Apariencia
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Selector
            etiqueta="Tema"
            value={datos.tema}
            onChange={(e) => cambiar('tema', e.target.value as 'claro' | 'oscuro')}
            opciones={[
              { valor: 'claro', etiqueta: 'Claro' },
              { valor: 'oscuro', etiqueta: 'Oscuro' }
            ]}
          />
          <Selector
            etiqueta="Tamaño de letra"
            value={datos.tamanoFuente}
            onChange={(e) => cambiar('tamanoFuente', e.target.value as 'normal' | 'grande')}
            opciones={[
              { valor: 'normal', etiqueta: 'Normal' },
              { valor: 'grande', etiqueta: 'Grande' }
            ]}
          />
        </div>
      </section>

      <CambioPassword />
      <PanelBackups />
      <PanelActualizaciones />
    </div>
  )
}

function CambioPassword(): React.JSX.Element {
  const notificar = useNotificar()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cambiar(): Promise<void> {
    if (nueva !== repetir) {
      notificar.error('Las contraseñas nuevas no coinciden')
      return
    }
    setGuardando(true)
    try {
      await pedir(api.auth.cambiarPassword(actual, nueva))
      notificar.exito('Contraseña actualizada')
      setActual('')
      setNueva('')
      setRepetir('')
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="superficie px-5 py-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
        <Lock size={12} />
        Contraseña
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <Entrada
          etiqueta="Contraseña actual"
          type="password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
        />
        <Entrada
          etiqueta="Nueva contraseña"
          type="password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
        />
        <Entrada
          etiqueta="Repetir nueva"
          type="password"
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
        />
      </div>
      <Boton
        className="mt-3"
        cargando={guardando}
        disabled={actual.length === 0 || nueva.length < 8}
        onClick={() => void cambiar()}
      >
        Cambiar contraseña
      </Boton>
    </section>
  )
}

function PanelBackups(): React.JSX.Element {
  const notificar = useNotificar()
  const [lista, setLista] = useState<ArchivoBackupPublico[]>([])
  const [creando, setCreando] = useState(false)
  const [restaurando, setRestaurando] = useState<ArchivoBackupPublico | null>(null)

  async function cargar(): Promise<void> {
    try {
      setLista(await pedir(api.backups.listar()))
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function crear(): Promise<void> {
    setCreando(true)
    try {
      await pedir(api.backups.crear())
      notificar.exito('Backup creado y verificado')
      await cargar()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setCreando(false)
    }
  }

  async function copiar(backup: ArchivoBackupPublico): Promise<void> {
    try {
      const destino = await pedir(api.backups.copiarA(backup.ruta))
      if (destino) notificar.exito(`Copia guardada en ${destino}`)
    } catch (error) {
      notificar.error(mensajeDeError(error))
    }
  }

  const ultimo = lista[0]
  const diasSinCopia = ultimo
    ? Math.floor((Date.now() - new Date(ultimo.creadoEn).getTime()) / 86_400_000)
    : null

  return (
    <section className="superficie px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--tinta-tenue)]">
          <Database size={12} />
          Copias de seguridad
        </h2>
        <Boton
          tamano="sm"
          iconoIzquierda={<HardDriveDownload size={14} />}
          cargando={creando}
          onClick={() => void crear()}
        >
          Crear backup ahora
        </Boton>
      </div>

      <div className="mb-3">
        <Aviso tono="alerta">
          Los backups se guardan en esta misma computadora, por lo que <strong>no protegen</strong>{' '}
          si el disco duro falla. Copie uno a una memoria USB periódicamente con el botón
          «Copiar a…».
        </Aviso>
      </div>

      {lista.length === 0 ? (
        <p className="text-[0.875rem] text-[var(--tinta-tenue)]">
          Todavía no hay copias. Se crean automáticamente cada día y al cerrar el programa.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--borde)]">
          {lista.slice(0, 12).map((backup, indice) => (
            <li key={backup.nombre} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[0.8125rem] text-[var(--tinta)]">
                  {backup.nombre}
                </p>
                <p className="text-[0.75rem] text-[var(--tinta-tenue)]">
                  {formatearFechaHora(backup.creadoEn)} ·{' '}
                  {(backup.tamanoBytes / 1024).toFixed(0)} KB
                </p>
              </div>
              {indice === 0 && <Insignia tono="exito">Más reciente</Insignia>}
              <Boton tamano="sm" variante="fantasma" onClick={() => void copiar(backup)}>
                Copiar a…
              </Boton>
              <Boton
                tamano="sm"
                variante="fantasma"
                iconoIzquierda={<RotateCcw size={13} />}
                onClick={() => setRestaurando(backup)}
              >
                Restaurar
              </Boton>
            </li>
          ))}
        </ul>
      )}

      {diasSinCopia !== null && diasSinCopia > 7 && (
        <p className="mt-2 text-[0.8125rem] text-amber-700 oscuro:text-amber-400">
          Han pasado {diasSinCopia} días desde la última copia.
        </p>
      )}

      {restaurando && (
        <ModalRestaurar
          backup={restaurando}
          onCerrar={() => setRestaurando(null)}
          onRestaurado={() => {
            setRestaurando(null)
            void cargar()
          }}
        />
      )}
    </section>
  )
}

function ModalRestaurar({
  backup,
  onCerrar,
  onRestaurado
}: {
  backup: ArchivoBackupPublico
  onCerrar: () => void
  onRestaurado: () => void
}): React.JSX.Element {
  const notificar = useNotificar()
  const [confirmacion, setConfirmacion] = useState('')
  const [restaurando, setRestaurando] = useState(false)

  async function restaurar(): Promise<void> {
    setRestaurando(true)
    try {
      const resultado = await pedir(api.backups.restaurar(backup.ruta))
      notificar.exito(
        `Información restaurada. Se guardó una copia del estado anterior en ${resultado.copiaDeSeguridadPrevia}`
      )
      onRestaurado()
      // La aplicación se recarga para que ninguna pantalla siga mostrando datos
      // de la base que acaba de ser reemplazada.
      window.location.reload()
    } catch (error) {
      notificar.error(mensajeDeError(error))
    } finally {
      setRestaurando(false)
    }
  }

  return (
    <Modal
      abierto
      titulo="Restaurar copia de seguridad"
      ancho="sm"
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            cargando={restaurando}
            disabled={confirmacion.trim().toUpperCase() !== 'RESTAURAR'}
            onClick={() => void restaurar()}
          >
            Restaurar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Aviso tono="critico">
          Toda la información actual será reemplazada por la del{' '}
          {formatearFechaHora(backup.creadoEn)}. Los pacientes y consultas registrados después de
          esa fecha dejarán de estar disponibles.
        </Aviso>
        <p className="text-[0.875rem] text-[var(--tinta-suave)]">
          Antes de restaurar se creará automáticamente una copia del estado actual, de modo que la
          operación pueda deshacerse.
        </p>
        <Entrada
          etiqueta="Escriba RESTAURAR para confirmar"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          placeholder="RESTAURAR"
        />
      </div>
    </Modal>
  )
}
