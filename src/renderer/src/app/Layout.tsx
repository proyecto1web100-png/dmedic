import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BookMarked,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Stethoscope,
  Sun,
  Users
} from 'lucide-react'
import { useSesion } from './Sesion'
import { api, pedir } from '../lib/api'
import { useNotificar } from './Notificaciones'

import type { Permiso } from '@shared/types'

const ENLACES: {
  a: string
  etiqueta: string
  icono: typeof LayoutDashboard
  exacto: boolean
  permiso?: Permiso
}[] = [
  { a: '/', etiqueta: 'Inicio', icono: LayoutDashboard, exacto: true },
  { a: '/pacientes', etiqueta: 'Pacientes', icono: Users, exacto: false, permiso: 'pacientes.ver' },
  { a: '/agenda', etiqueta: 'Agenda', icono: CalendarDays, exacto: false, permiso: 'citas.ver' },
  {
    a: '/catalogo',
    etiqueta: 'Catálogo',
    icono: BookMarked,
    exacto: false,
    permiso: 'catalogo.gestionar'
  },
  {
    a: '/equipo',
    etiqueta: 'Equipo',
    icono: ShieldCheck,
    exacto: false,
    permiso: 'usuarios.gestionar'
  },
  { a: '/configuracion', etiqueta: 'Configuración', icono: Settings, exacto: false }
]

export function Layout(): React.JSX.Element {
  const { config, estado, puede, salir, refrescarConfig } = useSesion()
  const notificar = useNotificar()
  const navegar = useNavigate()

  const visibles = ENLACES.filter((e) => !e.permiso || puede(e.permiso))

  async function alternarTema(): Promise<void> {
    if (!config) return
    try {
      await pedir(
        api.config.apariencia(
          config.tema === 'oscuro' ? 'claro' : 'oscuro',
          config.tamanoFuente
        )
      )
      await refrescarConfig()
    } catch {
      notificar.error('No se pudo cambiar el tema')
    }
  }

  async function cerrarSesion(): Promise<void> {
    await salir()
    navegar('/')
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-[15.5rem] shrink-0 flex-col border-r border-[var(--borde)] bg-[var(--superficie)]">
        <div className="flex items-center gap-2.5 px-4 py-4">
          {config?.logoDataUrl ? (
            <img
              src={config.logoDataUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg object-contain"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marca-600 text-white">
              <Stethoscope size={18} />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-bold leading-tight text-[var(--tinta)]">
              {config?.nombreClinica || 'DMedic'}
            </p>
            <p className="truncate text-[0.75rem] text-[var(--tinta-tenue)]">
              {estado?.sesion?.nombre}
              {estado?.sesion?.rol === 'secretaria' ? ' · Secretaria' : ''}
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2.5 py-2">
          {visibles.map(({ a, etiqueta, icono: Icono, exacto }) => (
            <NavLink
              key={a}
              to={a}
              end={exacto}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.90625rem] font-medium transition-colors ${
                  isActive
                    ? 'bg-marca-50 text-marca-800 oscuro:bg-marca-900/60 oscuro:text-marca-200'
                    : 'text-[var(--tinta-suave)] hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_10%,transparent)] hover:text-[var(--tinta)]'
                }`
              }
            >
              <Icono size={17} className="shrink-0" />
              {etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 border-t border-[var(--borde)] px-2.5 py-2.5">
          <button
            onClick={() => void alternarTema()}
            title={config?.tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro'}
            aria-label="Cambiar tema"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--tinta-suave)] transition-colors hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_12%,transparent)] hover:text-[var(--tinta)]"
          >
            {config?.tema === 'oscuro' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            onClick={() => void cerrarSesion()}
            className="flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-[0.875rem] font-medium text-[var(--tinta-suave)] transition-colors hover:bg-[color-mix(in_srgb,var(--tinta-tenue)_12%,transparent)] hover:text-[var(--tinta)]"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="desplazable min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
