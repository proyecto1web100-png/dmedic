import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { api, pedir } from '../lib/api'
import type { ConfiguracionClinica, EstadoAuth } from '@shared/types'

interface Contexto {
  estado: EstadoAuth | null
  config: ConfiguracionClinica | null
  cargando: boolean
  refrescar: () => Promise<void>
  refrescarConfig: () => Promise<void>
  salir: () => Promise<void>
}

const ContextoSesion = createContext<Contexto | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }): React.JSX.Element {
  const [estado, setEstado] = useState<EstadoAuth | null>(null)
  const [config, setConfig] = useState<ConfiguracionClinica | null>(null)
  const [cargando, setCargando] = useState(true)

  const refrescarConfig = useCallback(async () => {
    try {
      setConfig(await pedir(api.config.obtener()))
    } catch {
      setConfig(null)
    }
  }, [])

  const refrescar = useCallback(async () => {
    setEstado(await pedir(api.auth.estado()))
  }, [])

  useEffect(() => {
    void (async () => {
      await Promise.all([refrescar(), refrescarConfig()])
      setCargando(false)
    })()
  }, [refrescar, refrescarConfig])

  // El tema y el tamaño de letra son ajustes de la clínica, no del navegador.
  useEffect(() => {
    const raiz = document.documentElement
    raiz.classList.toggle('oscuro', config?.tema === 'oscuro')
    raiz.classList.toggle('texto-grande', config?.tamanoFuente === 'grande')
  }, [config])

  const salir = useCallback(async () => {
    await pedir(api.auth.salir())
    await refrescar()
  }, [refrescar])

  const valor = useMemo<Contexto>(
    () => ({ estado, config, cargando, refrescar, refrescarConfig, salir }),
    [estado, config, cargando, refrescar, refrescarConfig, salir]
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}

export function useSesion(): Contexto {
  const contexto = useContext(ContextoSesion)
  if (!contexto) throw new Error('useSesion debe usarse dentro de ProveedorSesion')
  return contexto
}
