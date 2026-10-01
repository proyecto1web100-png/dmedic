import { contextBridge, ipcRenderer } from 'electron'
import type {
  Adjunto,
  AdjuntoInput,
  Alergia,
  Antecedente,
  ArchivoBackupPublico,
  CategoriaExamen,
  Cie10,
  CitaConPaciente,
  CitaInput,
  ConfiguracionClinica,
  ConsultaCompleta,
  ConsultaInput,
  ConsultaResumen,
  DocumentoPublico,
  EntradaAuditoriaPublica,
  EstadoActualizacion,
  EstadoAuth,
  EstadoLicencia,
  EstadoCita,
  Empresa,
  EmpresaInput,
  Examen,
  ExamenInput,
  ExpedienteResumen,
  FichaPaciente,
  FiltroAuditoria,
  FiltroHistorial,
  Incapacidad,
  IncapacidadInput,
  MedicacionCronica,
  MedicacionCronicaInput,
  Medicamento,
  MedicamentoInput,
  MovimientoInput,
  MovimientoInventario,
  NovedadesVersion,
  PacienteConResumen,
  PacienteInput,
  PeriodoReporte,
  PlantillaTratamiento,
  Referencia,
  ReferenciaInput,
  ReporteCitas,
  ReporteEmpresa,
  Resultado,
  ResumenAgenda,
  ResumenDashboard,
  SolapamientoCita,
  Usuario,
  UsuarioInput
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
  licencia: {
    estado: () => invocar<EstadoLicencia>('licencia:estado'),
    activar: (codigo: string) => invocar<EstadoLicencia>('licencia:activar', codigo),
    reiniciar: () => invocar<void>('licencia:reiniciar')
  },
  auth: {
    estado: () => invocar<EstadoAuth>('auth:estado'),
    instalar: (datos: { nombreDoctor: string; nombreClinica: string; password: string }) =>
      invocar<{ codigoRecuperacion: string }>('auth:instalar', datos),
    entrar: (usuarioId: number, password: string) =>
      invocar<void>('auth:entrar', usuarioId, password),
    recuperar: (codigo: string, nuevaPassword: string) =>
      invocar<{ codigoRecuperacion: string }>('auth:recuperar', codigo, nuevaPassword),
    salir: () => invocar<void>('auth:salir'),
    cambiarPassword: (actual: string, nueva: string) =>
      invocar<void>('auth:cambiarPassword', actual, nueva)
  },
  usuarios: {
    listar: () => invocar<Usuario[]>('usuarios:listar'),
    crear: (datos: UsuarioInput & { password: string }) =>
      invocar<number>('usuarios:crear', datos),
    actualizar: (id: number, datos: UsuarioInput) =>
      invocar<void>('usuarios:actualizar', id, datos),
    alternar: (id: number, activo: boolean) => invocar<void>('usuarios:alternar', id, activo),
    reiniciarPassword: (id: number, password: string) =>
      invocar<void>('usuarios:reiniciarPassword', id, password)
  },
  pacientes: {
    buscar: (texto: string, opciones?: { incluirInactivos?: boolean }) =>
      invocar<PacienteConResumen[]>('pacientes:buscar', texto, opciones),
    expediente: (id: number) => invocar<ExpedienteResumen>('pacientes:expediente', id),
    ficha: (id: number) => invocar<FichaPaciente>('pacientes:ficha', id),
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
    enRango: (desde: string, hasta: string, doctorId?: number | null) =>
      invocar<CitaConPaciente[]>('citas:enRango', desde, hasta, doctorId),
    obtener: (id: number) => invocar<CitaConPaciente>('citas:obtener', id),
    dePaciente: (pacienteId: number) =>
      invocar<CitaConPaciente[]>('citas:dePaciente', pacienteId),
    resumen: () => invocar<ResumenAgenda>('citas:resumen'),
    doctores: () => invocar<{ id: number; nombre: string }[]>('citas:doctores'),
    reporte: (periodo: PeriodoReporte, referencia: string, doctorId: number | null) =>
      invocar<ReporteCitas>('citas:reporte', periodo, referencia, doctorId),
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
      excluirId?: number,
      doctorId?: number | null
    ) =>
      invocar<SolapamientoCita[]>(
        'citas:comprobarSolapamiento',
        fecha,
        hora,
        duracionMinutos,
        excluirId,
        doctorId
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
    buscarExamenes: (texto: string) => invocar<Examen[]>('catalogo:buscarExamenes', texto),
    listarExamenes: () => invocar<Examen[]>('catalogo:listarExamenes'),
    crearExamen: (entrada: ExamenInput) => invocar<number>('catalogo:crearExamen', entrada),
    actualizarExamen: (id: number, entrada: ExamenInput) =>
      invocar<void>('catalogo:actualizarExamen', id, entrada),
    desactivarExamen: (id: number) => invocar<void>('catalogo:desactivarExamen', id),
    plantillasPorCie10: (codigo: string) =>
      invocar<PlantillaTratamiento[]>('catalogo:plantillasPorCie10', codigo),
    listarPlantillas: () => invocar<PlantillaTratamiento[]>('catalogo:listarPlantillas'),
    guardarPlantilla: (datos: PlantillaTratamiento) =>
      invocar<number>('catalogo:guardarPlantilla', datos),
    eliminarPlantilla: (id: number) => invocar<void>('catalogo:eliminarPlantilla', id),
    listarCie10: (soloPersonalizados?: boolean) =>
      invocar<Cie10[]>('catalogo:listarCie10', soloPersonalizados),
    crearCie10: (datos: Cie10) => invocar<string>('catalogo:crearCie10', datos),
    actualizarCie10: (codigo: string, datos: { descripcion: string; categoria: string | null }) =>
      invocar<void>('catalogo:actualizarCie10', codigo, datos),
    eliminarCie10: (codigo: string) => invocar<void>('catalogo:eliminarCie10', codigo)
  },
  documentos: {
    generar: (consultaId: number, tipo: 'receta' | 'resumen_consulta') =>
      invocar<{ ruta: string; tipo: string }>('documentos:generar', consultaId, tipo),
    expediente: (pacienteId: number) =>
      invocar<{ ruta: string; tipo: string }>('documentos:expediente', pacienteId),
    reporteCitas: (periodo: PeriodoReporte, referencia: string, doctorId: number | null) =>
      invocar<{ ruta: string; tipo: string }>(
        'documentos:reporteCitas',
        periodo,
        referencia,
        doctorId
      ),
    abrir: (ruta: string) => invocar<void>('documentos:abrir', ruta),
    revelar: (ruta: string) => invocar<void>('documentos:revelar', ruta),
    dePaciente: (pacienteId: number) =>
      invocar<DocumentoPublico[]>('documentos:dePaciente', pacienteId)
  },
  adjuntos: {
    /** Abre el selector de Windows. Devuelve vacío si se cancela. */
    elegir: () =>
      invocar<{ ruta: string; nombre: string; tamanoBytes: number }[]>('adjuntos:elegir'),
    agregar: (entrada: AdjuntoInput, rutaOrigen: string) =>
      invocar<number>('adjuntos:agregar', entrada, rutaOrigen),
    dePaciente: (pacienteId: number) => invocar<Adjunto[]>('adjuntos:dePaciente', pacienteId),
    deConsulta: (consultaId: number) => invocar<Adjunto[]>('adjuntos:deConsulta', consultaId),
    actualizar: (
      id: number,
      datos: {
        titulo: string
        descripcion: string | null
        categoria: CategoriaExamen
        fechaEstudio: string | null
      }
    ) => invocar<void>('adjuntos:actualizar', id, datos),
    eliminar: (id: number) => invocar<void>('adjuntos:eliminar', id),
    abrir: (id: number) => invocar<void>('adjuntos:abrir', id),
    /** Data URL de la imagen, para poder verla dentro del programa. */
    imagen: (id: number) => invocar<string>('adjuntos:imagen', id)
  },
  incapacidades: {
    crear: (entrada: IncapacidadInput) => invocar<Incapacidad>('incapacidades:crear', entrada),
    listar: (pacienteId: number) => invocar<Incapacidad[]>('incapacidades:listar', pacienteId),
    imprimir: (id: number) => invocar<string>('incapacidades:imprimir', id),
    anular: (id: number, motivo: string) => invocar<void>('incapacidades:anular', id, motivo)
  },
  referencias: {
    crear: (entrada: ReferenciaInput) => invocar<Referencia>('referencias:crear', entrada),
    listar: (pacienteId: number) => invocar<Referencia[]>('referencias:listar', pacienteId),
    imprimir: (id: number) => invocar<string>('referencias:imprimir', id),
    anular: (id: number, motivo: string) => invocar<void>('referencias:anular', id, motivo)
  },
  cronica: {
    listar: (pacienteId: number) => invocar<MedicacionCronica[]>('cronica:listar', pacienteId),
    agregar: (entrada: MedicacionCronicaInput) => invocar<number>('cronica:agregar', entrada),
    suspender: (id: number, activa: boolean) => invocar<void>('cronica:suspender', id, activa),
    eliminar: (id: number) => invocar<void>('cronica:eliminar', id)
  },
  empresas: {
    listar: (soloActivas?: boolean) => invocar<Empresa[]>('empresas:listar', soloActivas),
    crear: (entrada: EmpresaInput) => invocar<number>('empresas:crear', entrada),
    actualizar: (id: number, entrada: EmpresaInput) =>
      invocar<void>('empresas:actualizar', id, entrada),
    alternar: (id: number, activa: boolean) => invocar<void>('empresas:alternar', id, activa),
    pacientes: (id: number) => invocar<PacienteConResumen[]>('empresas:pacientes', id),
    reporte: (id: number, desde: string, hasta: string) =>
      invocar<ReporteEmpresa>('empresas:reporte', id, desde, hasta),
    imprimirReporte: (id: number, desde: string, hasta: string) =>
      invocar<{ ruta: string }>('empresas:imprimirReporte', id, desde, hasta)
  },
  inventario: {
    listar: () => invocar<Medicamento[]>('inventario:listar'),
    movimientos: (medicamentoId: number) =>
      invocar<MovimientoInventario[]>('inventario:movimientos', medicamentoId),
    ultimos: () => invocar<MovimientoInventario[]>('inventario:ultimos'),
    registrar: (entrada: MovimientoInput) => invocar<number>('inventario:registrar', entrada),
    entregar: (datos: {
      medicamentoId: number
      cantidad: number
      pacienteId: number
      consultaId?: number | null
      motivo?: string | null
    }) => invocar<number>('inventario:entregar', datos)
  },
  backups: {
    listar: () => invocar<ArchivoBackupPublico[]>('backups:listar'),
    crear: () => invocar<{ ruta: string; tamanoBytes: number }>('backups:crear'),
    restaurar: (ruta: string) =>
      invocar<{ copiaDeSeguridadPrevia: string }>('backups:restaurar', ruta),
    copiarA: (ruta: string) => invocar<string | null>('backups:copiarA', ruta)
  },
  auditoria: {
    listar: (filtro?: FiltroAuditoria) =>
      invocar<EntradaAuditoriaPublica[]>('auditoria:listar', filtro)
  },
  config: {
    obtener: () => invocar<ConfiguracionClinica>('config:obtener'),
    guardar: (config: ConfiguracionClinica) => invocar<void>('config:guardar', config),
    apariencia: (tema: 'claro' | 'oscuro', tamano: 'normal' | 'grande') =>
      invocar<void>('config:apariencia', tema, tamano),
    version: () => invocar<string>('config:version')
  },
  actualizaciones: {
    estado: () => invocar<EstadoActualizacion>('actualizaciones:estado'),
    buscar: () => invocar<EstadoActualizacion>('actualizaciones:buscar'),
    descargar: () => invocar<void>('actualizaciones:descargar'),
    instalar: () => invocar<void>('actualizaciones:instalar'),
    novedades: () => invocar<NovedadesVersion | null>('actualizaciones:novedades'),
    novedadesVistas: () => invocar<void>('actualizaciones:novedadesVistas'),
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
