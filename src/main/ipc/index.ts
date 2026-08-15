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
  PlantillaTratamiento,
  UsuarioInput
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
  canal('auth:entrar', (usuarioId: number, password: string) => auth.entrar(usuarioId, password), {
    publico: true
  })
  canal(
    'auth:recuperar',
    (codigo: string, nuevaPassword: string) => auth.recuperarConCodigo(codigo, nuevaPassword),
    { publico: true }
  )
  canal('auth:salir', () => auth.salir())
  canal('auth:cambiarPassword', (actual: string, nueva: string) =>
    auth.cambiarPassword(actual, nueva)
  )

  // ===== Equipo (solo administrador) =====
  canal('usuarios:listar', () => auth.listarUsuarios(), { permiso: 'usuarios.gestionar' })
  canal('usuarios:crear', (datos: UsuarioInput & { password: string }) => auth.crearUsuario(datos), {
    permiso: 'usuarios.gestionar'
  })
  canal(
    'usuarios:actualizar',
    (id: number, datos: UsuarioInput) => auth.actualizarUsuario(id, datos),
    { permiso: 'usuarios.gestionar' }
  )
  canal('usuarios:alternar', (id: number, activo: boolean) => auth.alternarUsuario(id, activo), {
    permiso: 'usuarios.gestionar'
  })
  canal(
    'usuarios:reiniciarPassword',
    (id: number, password: string) => auth.reiniciarPassword(id, password),
    { permiso: 'usuarios.gestionar' }
  )

  // ===== Pacientes =====
  canal('pacientes:buscar', (texto: string, opciones?: { incluirInactivos?: boolean }) =>
    pacientes.buscar(texto, opciones ?? {}), { permiso: 'pacientes.ver' })
  canal('pacientes:expediente', (id: number) => pacientes.expediente(id), {
    permiso: 'pacientes.ver_clinico'
  })
  canal('pacientes:ficha', (id: number) => pacientes.ficha(id), { permiso: 'pacientes.ver' })
  canal('pacientes:crear', (entrada: PacienteInput) => pacientes.crear(entrada), {
    permiso: 'pacientes.registrar'
  })
  canal('pacientes:actualizar', (id: number, entrada: PacienteInput) =>
    pacientes.actualizar(id, entrada), { permiso: 'pacientes.editar_contacto' })
  canal(
    'pacientes:revisarDuplicados',
    (entrada: {
      primerNombre: string
      primerApellido: string
      fechaNacimiento: string
      excluirId?: number
    }) => pacientes.revisarDuplicados(entrada),
    { permiso: 'pacientes.ver' }
  )
  canal('pacientes:archivar', (id: number) => pacientes.archivar(id), {
    permiso: 'pacientes.archivar'
  })
  canal('pacientes:reactivar', (id: number) => pacientes.reactivar(id), {
    permiso: 'pacientes.archivar'
  })
  canal('pacientes:eliminar', (id: number, confirmacion: string) =>
    pacientes.eliminarDefinitivo(id, confirmacion), { permiso: 'pacientes.eliminar' })

  // ===== Datos clinicos del paciente =====
  const clinico = { permiso: 'pacientes.editar_clinico' } as const
  canal(
    'pacientes:agregarAlergia',
    (
      pacienteId: number,
      datos: { sustancia: string; reaccion: string | null; gravedad: Alergia['gravedad'] }
    ) => pacientes.agregarAlergia(pacienteId, datos),
    clinico
  )
  canal('pacientes:alternarAlergia', (id: number, activa: boolean) =>
    pacientes.alternarAlergia(id, activa), clinico)
  canal('pacientes:eliminarAlergia', (id: number) => pacientes.eliminarAlergia(id), clinico)
  canal(
    'pacientes:agregarAntecedente',
    (pacienteId: number, datos: { tipo: Antecedente['tipo']; descripcion: string }) =>
      pacientes.agregarAntecedente(pacienteId, datos),
    clinico
  )
  canal('pacientes:eliminarAntecedente', (id: number) => pacientes.eliminarAntecedente(id), clinico)
  canal(
    'pacientes:agregarCronico',
    (
      pacienteId: number,
      datos: { codigoCie10: string | null; descripcion: string; desde: string | null }
    ) => pacientes.agregarCronico(pacienteId, datos),
    clinico
  )
  canal('pacientes:alternarCronico', (id: number, activo: boolean) =>
    pacientes.alternarCronico(id, activo), clinico)
  canal('pacientes:eliminarCronico', (id: number) => pacientes.eliminarCronico(id), clinico)

  // ===== Consultas =====
  canal('consultas:crear', (entrada: ConsultaInput) => consultas.crear(entrada), {
    permiso: 'consultas.crear'
  })
  canal('consultas:actualizar', (id: number, entrada: ConsultaInput) =>
    consultas.actualizar(id, entrada), { permiso: 'consultas.editar' })
  canal('consultas:obtener', (id: number) => consultas.obtener(id), { permiso: 'consultas.ver' })
  canal('consultas:historial', (pacienteId: number, filtro?: FiltroHistorial) =>
    consultas.historial(pacienteId, filtro ?? {}), { permiso: 'consultas.ver' })
  canal('consultas:ultima', (pacienteId: number) => consultas.ultima(pacienteId), {
    permiso: 'consultas.ver'
  })
  canal('consultas:anular', (id: number, motivo: string) => consultas.anular(id, motivo), {
    permiso: 'consultas.anular'
  })
  canal('consultas:agregarAdenda', (id: number, texto: string) =>
    consultas.agregarAdenda(id, texto), { permiso: 'consultas.editar' })
  canal('consultas:comparar', (idA: number, idB: number) => consultas.comparar(idA, idB), {
    permiso: 'consultas.ver'
  })
  canal('consultas:dashboard', () => consultas.dashboard())

  // ===== Agenda =====
  const verAgenda = { permiso: 'citas.ver' } as const
  const gestionarAgenda = { permiso: 'citas.gestionar' } as const
  canal('citas:enRango', (desde: string, hasta: string) => citas.enRango(desde, hasta), verAgenda)
  canal('citas:obtener', (id: number) => citas.obtener(id), verAgenda)
  canal('citas:dePaciente', (pacienteId: number) => citas.dePaciente(pacienteId), verAgenda)
  canal('citas:resumen', () => citas.resumen(), verAgenda)
  canal('citas:crear', (entrada: CitaInput) => citas.crear(entrada), gestionarAgenda)
  canal('citas:actualizar', (id: number, entrada: CitaInput) => citas.actualizar(id, entrada),
    gestionarAgenda)
  canal('citas:cambiarEstado', (id: number, estado: EstadoCita) =>
    citas.cambiarEstado(id, estado), gestionarAgenda)
  canal('citas:eliminar', (id: number) => citas.eliminar(id), gestionarAgenda)
  canal(
    'citas:comprobarSolapamiento',
    (fecha: string, hora: string | null, duracionMinutos: number, excluirId?: number) =>
      citas.comprobarSolapamiento(fecha, hora, duracionMinutos, excluirId),
    verAgenda
  )

  // ===== Catalogos =====
  const verCatalogo = { permiso: 'consultas.ver' } as const
  const gestionarCatalogo = { permiso: 'catalogo.gestionar' } as const
  canal('catalogo:buscarCie10', (texto: string) => catalogo.buscarCie10(texto), verCatalogo)
  canal('catalogo:buscarMedicamentos', (texto: string) =>
    catalogo.buscarMedicamentos(texto), verCatalogo)
  canal('catalogo:listarMedicamentos', () => catalogo.listarMedicamentos(), verCatalogo)
  canal('catalogo:crearMedicamento', (entrada: MedicamentoInput) =>
    catalogo.crearMedicamento(entrada), gestionarCatalogo)
  canal('catalogo:actualizarMedicamento', (id: number, entrada: MedicamentoInput) =>
    catalogo.actualizarMedicamento(id, entrada), gestionarCatalogo)
  canal('catalogo:desactivarMedicamento', (id: number) =>
    catalogo.desactivarMedicamento(id), gestionarCatalogo)
  canal('catalogo:plantillasPorCie10', (codigo: string) =>
    catalogo.plantillasPorCie10(codigo), verCatalogo)
  canal('catalogo:listarPlantillas', () => catalogo.listarPlantillas(), verCatalogo)
  canal('catalogo:guardarPlantilla', (datos: PlantillaTratamiento) =>
    catalogo.guardarPlantilla(datos), gestionarCatalogo)
  canal('catalogo:eliminarPlantilla', (id: number) =>
    catalogo.eliminarPlantilla(id), gestionarCatalogo)

  // ===== Documentos =====
  const documentar = { permiso: 'documentos.generar' } as const
  canal('documentos:generar', (consultaId: number, tipo: documentos.TipoDocumento) =>
    documentos.generarDocumento(consultaId, tipo), documentar)
  canal('documentos:abrir', (ruta: string) => documentos.abrirDocumento(ruta), documentar)
  canal('documentos:revelar', (ruta: string) => documentos.revelarEnCarpeta(ruta), documentar)
  canal('documentos:dePaciente', (pacienteId: number) =>
    documentos.documentosDePaciente(pacienteId), documentar)

  // ===== Backups =====
  canal('backups:listar', () => backups.listar(), { permiso: 'backups.crear' })
  canal('backups:crear', () => backups.crear('manual'), { permiso: 'backups.crear' })
  canal('backups:restaurar', (ruta: string) => backups.restaurar(ruta), {
    permiso: 'backups.restaurar'
  })
  canal(
    'backups:copiarA',
    async (rutaBackup: string) => {
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
    },
    { permiso: 'backups.crear' }
  )

  // ===== Actualizaciones =====
  canal('actualizaciones:estado', () => actualizaciones.obtenerEstado())
  canal('actualizaciones:buscar', () => actualizaciones.buscar())
  canal('actualizaciones:descargar', () => actualizaciones.descargar())
  canal('actualizaciones:instalar', () => actualizaciones.instalarAlSalir())

  // ===== Configuracion =====
  // Publico: la pantalla de inicio de sesion necesita el nombre y el logo de la clinica.
  canal('config:obtener', () => configuracion(), { publico: true })
  canal('config:guardar', (config: ConfiguracionClinica) => guardarConfiguracion(config), {
    permiso: 'configuracion.clinica'
  })
  canal('config:apariencia', (tema: 'claro' | 'oscuro', tamano: 'normal' | 'grande') => {
    // La apariencia es preferencia de quien usa el equipo, no un dato de la clínica.
    guardarConfiguracion({ ...configuracion(), tema, tamanoFuente: tamano })
  })
  canal('config:version', () => app.getVersion(), { publico: true })
}
