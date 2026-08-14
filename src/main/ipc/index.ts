import { app, BrowserWindow, dialog } from 'electron'
import { canal } from './registrar'
import * as actualizaciones from '../services/actualizaciones'
import * as auth from '../services/auth'
import * as pacientes from '../services/pacientes'
import * as consultas from '../services/consultas'
import * as citas from '../services/citas'
import * as documentos from '../services/documentos'
import * as backups from '../services/backups'
import * as catalogo from '../repositories/catalogo'
import { configuracion, guardarConfiguracion } from '../repositories/sistema'
import type {
  Alergia,
  Antecedente,
  CitaInput,
  ConfiguracionClinica,
  ConsultaInput,
  EstadoCita,
  FiltroHistorial,
  MedicamentoInput,
  PacienteInput,
  PlantillaTratamiento
} from '@shared/types'

export function registrarCanales(): void {
  // ===== Autenticacion =====
  canal('auth:estado', () => auth.estado(), { publico: true })
  canal(
    'auth:instalar',
    (datos: { nombreDoctor: string; nombreClinica: string; password: string }) =>
      auth.instalar(datos),
    { publico: true }
  )
  canal('auth:entrar', (password: string) => auth.entrar(password), { publico: true })
  canal(
    'auth:recuperar',
    (codigo: string, nuevaPassword: string) => auth.recuperarConCodigo(codigo, nuevaPassword),
    { publico: true }
  )
  canal('auth:salir', () => auth.salir())
  canal('auth:cambiarPassword', (actual: string, nueva: string) =>
    auth.cambiarPassword(actual, nueva)
  )

  // ===== Pacientes =====
  canal('pacientes:buscar', (texto: string, opciones?: { incluirInactivos?: boolean }) =>
    pacientes.buscar(texto, opciones ?? {})
  )
  canal('pacientes:expediente', (id: number) => pacientes.expediente(id))
  canal('pacientes:crear', (entrada: PacienteInput) => pacientes.crear(entrada))
  canal('pacientes:actualizar', (id: number, entrada: PacienteInput) =>
    pacientes.actualizar(id, entrada)
  )
  canal(
    'pacientes:revisarDuplicados',
    (entrada: {
      primerNombre: string
      primerApellido: string
      fechaNacimiento: string
      excluirId?: number
    }) => pacientes.revisarDuplicados(entrada)
  )
  canal('pacientes:archivar', (id: number) => pacientes.archivar(id))
  canal('pacientes:reactivar', (id: number) => pacientes.reactivar(id))
  canal('pacientes:eliminar', (id: number, confirmacion: string) =>
    pacientes.eliminarDefinitivo(id, confirmacion)
  )

  // ===== Datos clinicos del paciente =====
  canal(
    'pacientes:agregarAlergia',
    (
      pacienteId: number,
      datos: { sustancia: string; reaccion: string | null; gravedad: Alergia['gravedad'] }
    ) => pacientes.agregarAlergia(pacienteId, datos)
  )
  canal('pacientes:alternarAlergia', (id: number, activa: boolean) =>
    pacientes.alternarAlergia(id, activa)
  )
  canal('pacientes:eliminarAlergia', (id: number) => pacientes.eliminarAlergia(id))
  canal(
    'pacientes:agregarAntecedente',
    (pacienteId: number, datos: { tipo: Antecedente['tipo']; descripcion: string }) =>
      pacientes.agregarAntecedente(pacienteId, datos)
  )
  canal('pacientes:eliminarAntecedente', (id: number) => pacientes.eliminarAntecedente(id))
  canal(
    'pacientes:agregarCronico',
    (
      pacienteId: number,
      datos: { codigoCie10: string | null; descripcion: string; desde: string | null }
    ) => pacientes.agregarCronico(pacienteId, datos)
  )
  canal('pacientes:alternarCronico', (id: number, activo: boolean) =>
    pacientes.alternarCronico(id, activo)
  )
  canal('pacientes:eliminarCronico', (id: number) => pacientes.eliminarCronico(id))

  // ===== Consultas =====
  canal('consultas:crear', (entrada: ConsultaInput) => consultas.crear(entrada))
  canal('consultas:actualizar', (id: number, entrada: ConsultaInput) =>
    consultas.actualizar(id, entrada)
  )
  canal('consultas:obtener', (id: number) => consultas.obtener(id))
  canal('consultas:historial', (pacienteId: number, filtro?: FiltroHistorial) =>
    consultas.historial(pacienteId, filtro ?? {})
  )
  canal('consultas:ultima', (pacienteId: number) => consultas.ultima(pacienteId))
  canal('consultas:anular', (id: number, motivo: string) => consultas.anular(id, motivo))
  canal('consultas:agregarAdenda', (id: number, texto: string) =>
    consultas.agregarAdenda(id, texto)
  )
  canal('consultas:comparar', (idA: number, idB: number) => consultas.comparar(idA, idB))
  canal('consultas:dashboard', () => consultas.dashboard())

  // ===== Agenda =====
  canal('citas:enRango', (desde: string, hasta: string) => citas.enRango(desde, hasta))
  canal('citas:obtener', (id: number) => citas.obtener(id))
  canal('citas:dePaciente', (pacienteId: number) => citas.dePaciente(pacienteId))
  canal('citas:resumen', () => citas.resumen())
  canal('citas:crear', (entrada: CitaInput) => citas.crear(entrada))
  canal('citas:actualizar', (id: number, entrada: CitaInput) => citas.actualizar(id, entrada))
  canal('citas:cambiarEstado', (id: number, estado: EstadoCita) =>
    citas.cambiarEstado(id, estado)
  )
  canal('citas:eliminar', (id: number) => citas.eliminar(id))
  canal(
    'citas:comprobarSolapamiento',
    (fecha: string, hora: string | null, duracionMinutos: number, excluirId?: number) =>
      citas.comprobarSolapamiento(fecha, hora, duracionMinutos, excluirId)
  )

  // ===== Catalogos =====
  canal('catalogo:buscarCie10', (texto: string) => catalogo.buscarCie10(texto))
  canal('catalogo:buscarMedicamentos', (texto: string) => catalogo.buscarMedicamentos(texto))
  canal('catalogo:listarMedicamentos', () => catalogo.listarMedicamentos())
  canal('catalogo:crearMedicamento', (entrada: MedicamentoInput) =>
    catalogo.crearMedicamento(entrada)
  )
  canal('catalogo:actualizarMedicamento', (id: number, entrada: MedicamentoInput) =>
    catalogo.actualizarMedicamento(id, entrada)
  )
  canal('catalogo:desactivarMedicamento', (id: number) => catalogo.desactivarMedicamento(id))
  canal('catalogo:plantillasPorCie10', (codigo: string) => catalogo.plantillasPorCie10(codigo))
  canal('catalogo:listarPlantillas', () => catalogo.listarPlantillas())
  canal('catalogo:guardarPlantilla', (datos: PlantillaTratamiento) =>
    catalogo.guardarPlantilla(datos)
  )
  canal('catalogo:eliminarPlantilla', (id: number) => catalogo.eliminarPlantilla(id))

  // ===== Documentos =====
  canal('documentos:generar', (consultaId: number, tipo: documentos.TipoDocumento) =>
    documentos.generarDocumento(consultaId, tipo)
  )
  canal('documentos:abrir', (ruta: string) => documentos.abrirDocumento(ruta))
  canal('documentos:revelar', (ruta: string) => documentos.revelarEnCarpeta(ruta))
  canal('documentos:dePaciente', (pacienteId: number) =>
    documentos.documentosDePaciente(pacienteId)
  )

  // ===== Backups =====
  canal('backups:listar', () => backups.listar())
  canal('backups:crear', () => backups.crear('manual'))
  canal('backups:restaurar', (ruta: string) => backups.restaurar(ruta))
  canal('backups:copiarA', async (rutaBackup: string) => {
    const ventana = BrowserWindow.getFocusedWindow()
    const opciones: Electron.OpenDialogOptions = {
      title: 'Seleccione la carpeta o la memoria USB donde guardar la copia',
      properties: ['openDirectory', 'createDirectory']
    }
    const seleccion = ventana
      ? await dialog.showOpenDialog(ventana, opciones)
      : await dialog.showOpenDialog(opciones)
    if (seleccion.canceled || seleccion.filePaths.length === 0) return null
    return backups.copiarA(rutaBackup, seleccion.filePaths[0])
  })

  // ===== Actualizaciones =====
  canal('actualizaciones:estado', () => actualizaciones.obtenerEstado())
  canal('actualizaciones:buscar', () => actualizaciones.buscar())
  canal('actualizaciones:descargar', () => actualizaciones.descargar())
  canal('actualizaciones:instalar', () => actualizaciones.instalarAlSalir())

  // ===== Configuracion =====
  // Publico: la pantalla de inicio de sesion necesita el nombre y el logo de la clinica.
  canal('config:obtener', () => configuracion(), { publico: true })
  canal('config:guardar', (config: ConfiguracionClinica) => guardarConfiguracion(config))
  canal('config:version', () => app.getVersion(), { publico: true })
}
