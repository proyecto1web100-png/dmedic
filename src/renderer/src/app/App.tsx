import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorNotificaciones } from './Notificaciones'
import { ProveedorSesion, useSesion } from './Sesion'
import { Layout } from './Layout'
import { Cargando } from '../components/ui/Varios'
import { PantallaAcceso } from '../features/auth/PantallaAcceso'
import { CambioObligatorio } from '../features/auth/CambioObligatorio'
import { Usuarios } from '../features/usuarios/Usuarios'
import { Catalogo } from '../features/catalogo/Catalogo'
import type { Permiso } from '@shared/types'
import { Dashboard } from '../features/dashboard/Dashboard'
import { ListaPacientes } from '../features/pacientes/ListaPacientes'
import { Expediente } from '../features/expediente/Expediente'
import { EditorConsulta } from '../features/consultas/EditorConsulta'
import { Configuracion } from '../features/configuracion/Configuracion'
import { Agenda } from '../features/agenda/Agenda'

function Enrutador(): React.JSX.Element {
  const { estado, cargando } = useSesion()

  if (cargando || !estado) {
    return (
      <div className="flex h-full items-center justify-center">
        <Cargando texto="Iniciando DMedic…" />
      </div>
    )
  }

  if (!estado.autenticado) return <PantallaAcceso />
  if (estado.sesion?.debeCambiarPassword) return <CambioObligatorio />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route
          path="pacientes"
          element={
            <Protegida permiso="pacientes.ver">
              <ListaPacientes />
            </Protegida>
          }
        />
        <Route
          path="pacientes/:id"
          element={
            <Protegida permiso="pacientes.ver">
              <Expediente />
            </Protegida>
          }
        />
        <Route
          path="pacientes/:pacienteId/consulta"
          element={
            <Protegida permiso="consultas.crear">
              <EditorConsulta />
            </Protegida>
          }
        />
        <Route
          path="pacientes/:pacienteId/consulta/:consultaId"
          element={
            <Protegida permiso="consultas.editar">
              <EditorConsulta />
            </Protegida>
          }
        />
        <Route
          path="agenda"
          element={
            <Protegida permiso="citas.ver">
              <Agenda />
            </Protegida>
          }
        />
        <Route
          path="catalogo"
          element={
            <Protegida permiso="catalogo.gestionar">
              <Catalogo />
            </Protegida>
          }
        />
        <Route
          path="equipo"
          element={
            <Protegida permiso="usuarios.gestionar">
              <Usuarios />
            </Protegida>
          }
        />
        <Route path="configuracion" element={<Configuracion />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

/**
 * Evita que una dirección escrita a mano muestre una pantalla que el rol no
 * debería ver. La comprobación de verdad ocurre en el proceso principal.
 */
function Protegida({
  permiso,
  children
}: {
  permiso: Permiso
  children: React.ReactNode
}): React.JSX.Element {
  const { puede } = useSesion()
  if (!puede(permiso)) return <Navigate to="/" replace />
  return <>{children}</>
}

export function App(): React.JSX.Element {
  return (
    <ProveedorNotificaciones>
      <ProveedorSesion>
        {/* HashRouter: en producción la app se sirve desde file:// y el router
            de rutas normales no funcionaría. */}
        <HashRouter>
          <Enrutador />
        </HashRouter>
      </ProveedorSesion>
    </ProveedorNotificaciones>
  )
}
