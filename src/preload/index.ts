import { contextBridge, ipcRenderer } from 'electron'
import type {
  Alergia,
  Antecedente,
  ArchivoBackupPublico,
  Cie10,
  CitaConPaciente,
  CitaInput,
  ConfiguracionClinica,
  ConsultaCompleta,
  ConsultaInput,
  ConsultaResumen,
  DocumentoPublico,
  EstadoActualizacion,
  EstadoAuth,
  EstadoCita,
  ExpedienteResumen,
  FiltroHistorial,
  Medicamento,
  MedicamentoInput,
  PacienteConResumen,
  PacienteInput,
  PlantillaTratamiento,
  Resultado,
  ResumenAgenda,
  ResumenDashboard,
  SolapamientoCita
} from '@shared/types'

function invocar<T>(canal: string, ...argumentos: unknown[]): Promise<Resultado<T>> {
  return ipcRenderer.invoke(canal, ...argumentos)
}

/**
 * Unico puente entre la ventana y el proceso principal. La interfaz no tiene
 * acceso a Node, al sistema de archivos ni a la base de datos: solo puede
 * llamar a estas operaciones concretas.
 */
const api = {
  auth: {
    estado: () => invocar<EstadoAuth>('auth:estado'),
    instalar: (datos: { nombreDoctor: string; nombreClinica: string; password: string }) =>
      invocar<{ codigoRecuperacion: string }>('auth:instalar', datos),
    entrar: (password: string) => invocar<void>('auth:entrar', password),
    recuperar: (codigo: string, nuevaPassword: string) =>
      invocar<{ codigoRecuperacion: string }>('auth:recuperar', codigo, nuevaPassword),
    salir: () => invocar<void>('auth:salir'),
    cambiarPassword: (actual: string, nueva: string) =>
      invocar<void>('auth:cambiarPassword', actual, nueva)
  },
  pacientes: {
    buscar: (texto: string, opciones?: { incluirInactivos?: boolean }) =>
      invocar<PacienteConResumen[]>('pacientes:buscar', texto, opciones),
    expediente: (id: number) => invocar<ExpedienteResumen>('pacientes:expediente', id),
    crear: (entrada: PacienteInput) => invocar<number>('pacientes:crear', entrada),
    actualizar: (id: number, entrada: PacienteInput) =>
      invocar<void>('pacientes:actualizar', id, entrada),
    revisarDuplicados: (entrada: {
      primerNombre: string
      primerApellido: string
      fechaNacimiento: string
      excluirId?: number
    }) => invocar<PacienteConResumen[]>('pacientes:revisarDuplicados', entrada),
    archivar: (id: number) => invocar<void>('pacientes:archivar', id),
    reactivar: (id: number) => invocar<void>('pacientes:reactivar', id),
    eliminar: (id: number, confirmacion: string) =>
      invocar<void>('pacientes:eliminar', id, confirmacion),
    agregarAlergia: (
      pacienteId: number,
      datos: { sustancia: string; reaccion: string | null; gravedad: Alergia['gravedad'] }
    ) => invocar<number>('pacientes:agregarAlergia', pacienteId, datos),
    alternarAlergia: (id: number, activa: boolean) =>
      invocar<void>('pacientes:alternarAlergia', id, activa),
    eliminarAlergia: (id: number) => invocar<void>('pacientes:eliminarAlergia', id),
    agregarAntecedente: (
      pacienteId: number,
      datos: { tipo: Antecedente['tipo']; descripcion: string }
    ) => invocar<number>('pacientes:agregarAntecedente', pacienteId, datos),
    eliminarAntecedente: (id: number) => invocar<void>('pacientes:eliminarAntecedente', id),
    agregarCronico: (
      pacienteId: number,
      datos: { codigoCie10: string | null; descripcion: string; desde: string | null }
    ) => invocar<number>('pacientes:agregarCronico', pacienteId, datos),
    alternarCronico: (id: number, activo: boolean) =>
      invocar<void>('pacientes:alternarCronico', id, activo),
    eliminarCronico: (id: number) => invocar<void>('pacientes:eliminarCronico', id)
  },
  consultas: {
    crear: (entrada: ConsultaInput) => invocar<number>('consultas:crear', entrada),
    actualizar: (id: number, entrada: ConsultaInput) =>
      invocar<void>('consultas:actualizar', id, entrada),
    obtener: (id: number) => invocar<ConsultaCompleta>('consultas:obtener', id),
    historial: (pacienteId: number, filtro?: FiltroHistorial) =>
      invocar<ConsultaResumen[]>('consultas:historial', pacienteId, filtro),
    ultima: (pacienteId: number) => invocar<ConsultaCompleta | null>('consultas:ultima', pacienteId),
    anular: (id: number, motivo: string) => invocar<void>('consultas:anular', id, motivo),
    agregarAdenda: (id: number, texto: string) =>
      invocar<number>('consultas:agregarAdenda', id, texto),
    comparar: (idA: number, idB: number) =>
      invocar<[ConsultaCompleta, ConsultaCompleta]>('consultas:comparar', idA, idB),
    dashboard: () => invocar<ResumenDashboard>('consultas:dashboard')
  },
  citas: {
    enRango: (desde: string, hasta: string) =>
      invocar<CitaConPaciente[]>('citas:enRango', desde, hasta),
    obtener: (id: number) => invocar<CitaConPaciente>('citas:obtener', id),
    dePaciente: (pacienteId: number) =>
      invocar<CitaConPaciente[]>('citas:dePaciente', pacienteId),
    resumen: () => invocar<ResumenAgenda>('citas:resumen'),
    crear: (entrada: CitaInput) =>
      invocar<{ id: number; solapamientos: SolapamientoCita[] }>('citas:crear', entrada),
    actualizar: (id: number, entrada: CitaInput) =>
      invocar<{ id: number; solapamientos: SolapamientoCita[] }>('citas:actualizar', id, entrada),
    cambiarEstado: (id: number, estado: EstadoCita) =>
      invocar<void>('citas:cambiarEstado', id, estado),
    eliminar: (id: number) => invocar<void>('citas:eliminar', id),
    comprobarSolapamiento: (
      fecha: string,
      hora: string | null,
      duracionMinutos: number,
      excluirId?: number
    ) =>
      invocar<SolapamientoCita[]>(
        'citas:comprobarSolapamiento',
        fecha,
        hora,
        duracionMinutos,
        excluirId
      )
  },
  catalogo: {
    buscarCie10: (texto: string) => invocar<Cie10[]>('catalogo:buscarCie10', texto),
    buscarMedicamentos: (texto: string) =>
      invocar<Medicamento[]>('catalogo:buscarMedicamentos', texto),
    listarMedicamentos: () => invocar<Medicamento[]>('catalogo:listarMedicamentos'),
    crearMedicamento: (entrada: MedicamentoInput) =>
      invocar<number>('catalogo:crearMedicamento', entrada),
    actualizarMedicamento: (id: number, entrada: MedicamentoInput) =>
      invocar<void>('catalogo:actualizarMedicamento', id, entrada),
    desactivarMedicamento: (id: number) => invocar<void>('catalogo:desactivarMedicamento', id),
    plantillasPorCie10: (codigo: string) =>
      invocar<PlantillaTratamiento[]>('catalogo:plantillasPorCie10', codigo),
    listarPlantillas: () => invocar<PlantillaTratamiento[]>('catalogo:listarPlantillas'),
    guardarPlantilla: (datos: PlantillaTratamiento) =>
      invocar<number>('catalogo:guardarPlantilla', datos),
    eliminarPlantilla: (id: number) => invocar<void>('catalogo:eliminarPlantilla', id)
  },
  documentos: {
    generar: (consultaId: number, tipo: 'receta' | 'resumen_consulta') =>
      invocar<{ ruta: string; tipo: string }>('documentos:generar', consultaId, tipo),
    abrir: (ruta: string) => invocar<void>('documentos:abrir', ruta),
    revelar: (ruta: string) => invocar<void>('documentos:revelar', ruta),
    dePaciente: (pacienteId: number) =>
      invocar<DocumentoPublico[]>('documentos:dePaciente', pacienteId)
  },
  backups: {
    listar: () => invocar<ArchivoBackupPublico[]>('backups:listar'),
    crear: () => invocar<{ ruta: string; tamanoBytes: number }>('backups:crear'),
    restaurar: (ruta: string) =>
      invocar<{ copiaDeSeguridadPrevia: string }>('backups:restaurar', ruta),
    copiarA: (ruta: string) => invocar<string | null>('backups:copiarA', ruta)
  },
  config: {
    obtener: () => invocar<ConfiguracionClinica>('config:obtener'),
    guardar: (config: ConfiguracionClinica) => invocar<void>('config:guardar', config),
    version: () => invocar<string>('config:version')
  },
  actualizaciones: {
    estado: () => invocar<EstadoActualizacion>('actualizaciones:estado'),
    buscar: () => invocar<EstadoActualizacion>('actualizaciones:buscar'),
    descargar: () => invocar<void>('actualizaciones:descargar'),
    instalar: () => invocar<void>('actualizaciones:instalar'),
    /**
     * Suscripcion al progreso. Se expone el listener envuelto para que la
     * ventana nunca reciba el objeto `event` de Electron.
     */
    alCambiar: (escuchar: (estado: EstadoActualizacion) => void) => {
      const manejador = (_evento: unknown, estado: EstadoActualizacion): void => escuchar(estado)
      ipcRenderer.on('actualizaciones:estado', manejador)
      return () => {
        ipcRenderer.removeListener('actualizaciones:estado', manejador)
      }
    }
  }
}

export type ApiDMedic = typeof api

contextBridge.exposeInMainWorld('dmedic', api)
