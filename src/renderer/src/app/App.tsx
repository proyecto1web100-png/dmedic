import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorNotificaciones } from './Notificaciones'
import { ProveedorSesion, useSesion } from './Sesion'
import { Layout } from './Layout'
import { Cargando } from '../components/ui/Varios'
import { PantallaAcceso } from '../features/auth/PantallaAcceso'
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

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="pacientes" element={<ListaPacientes />} />
        <Route path="pacientes/:id" element={<Expediente />} />
        <Route path="pacientes/:pacienteId/consulta" element={<EditorConsulta />} />
        <Route path="pacientes/:pacienteId/consulta/:consultaId" element={<EditorConsulta />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="configuracion" element={<Configuracion />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
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
