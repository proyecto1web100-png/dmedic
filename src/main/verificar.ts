/**
 * Banco de pruebas de la FASE 5. Se ejecuta sobre el codigo real del proceso
 * principal (servicios, repositorios, base de datos, PDF y backups) usando un
 * directorio de datos temporal, de modo que nunca toca la informacion de la clinica.
 *
 *   npm run verificar
 */
import { app } from 'electron'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const carpetaTemporal = mkdtempSync(join(tmpdir(), 'dmedic-pruebas-'))
app.setPath('userData', carpetaTemporal)

/**
 * Aquí no hay ventana principal, así que al destruir la ventana oculta que
 * genera cada PDF Electron cerraría la aplicación por su cuenta y el siguiente
 * documento fallaría. En la aplicación real la ventana principal siempre existe.
 */
app.on('window-all-closed', () => {})

let pasadas = 0
let fallidas = 0

function comprobar(descripcion: string, condicion: boolean, detalle?: string): void {
  if (condicion) {
    pasadas++
    console.log(`  OK   ${descripcion}`)
  } else {
    fallidas++
    console.log(`  FALLA ${descripcion}${detalle ? ` — ${detalle}` : ''}`)
  }
}

async function debeFallar(descripcion: string, operacion: () => unknown): Promise<void> {
  try {
    await operacion()
    comprobar(descripcion, false, 'se esperaba un error y no ocurrió')
  } catch (error) {
    comprobar(descripcion, true, (error as Error).message)
  }
}

function grupo(titulo: string): void {
  console.log(`\n${titulo}`)
}

/**
 * Lee el MediaBox del PDF, que define el tamaño real de la página en puntos
 * (1 pt = 1/72"). Carta = 612 x 792. Es la única comprobación fiable de que el
 * documento saldrá en el papel correcto.
 */
function tamanoDePagina(ruta: string): { ancho: number; alto: number } | null {
  const contenido = readFileSync(ruta).toString('latin1')
  const coincidencia = contenido.match(
    /MediaBox\s*\[\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/
  )
  if (!coincidencia) return null
  return { ancho: Number(coincidencia[1]), alto: Number(coincidencia[2]) }
}

function esCarta(ruta: string): boolean {
  const tamano = tamanoDePagina(ruta)
  if (!tamano) return false
  return Math.abs(tamano.ancho - 612) < 2 && Math.abs(tamano.alto - 792) < 2
}

async function ejecutar(): Promise<void> {
  const { abrirBaseDatos, cerrarBaseDatos, db: dbActual } = await import('./db/conexion')
  const auth = await import('./services/auth')
  const pacientes = await import('./services/pacientes')
  const consultas = await import('./services/consultas')
  const citas = await import('./services/citas')
  const documentos = await import('./services/documentos')
  const backups = await import('./services/backups')
  const catalogo = await import('./repositories/catalogo')
  const { hoyIso } = await import('@shared/lib/fecha')

  abrirBaseDatos()

  grupo('Instalación y sesión')
  const instalacion = await auth.instalar({
    nombreDoctor: 'Dra. Prueba Automatizada',
    nombreClinica: 'DMedic',
    password: 'contrasena-de-prueba'
  })
  comprobar('la instalación emite un código de recuperación', instalacion.codigoRecuperacion.length === 23)
  comprobar('queda sesión iniciada tras instalar', auth.estado().autenticado)

  await debeFallar('no permite instalar dos veces', () =>
    auth.instalar({ nombreDoctor: 'Otro', nombreClinica: 'X', password: 'otracontrasena' })
  )

  const idDoctor1 = auth.estado().sesion?.usuarioId as number
  comprobar('el primer usuario es doctor y administrador', auth.estado().sesion?.esAdministrador === true)

  auth.salir()
  comprobar('cerrar sesión deja el sistema bloqueado', !auth.estado().autenticado)
  comprobar('la pantalla de acceso lista a los usuarios', auth.estado().usuarios.length === 1)

  await debeFallar('rechaza una contraseña incorrecta', () =>
    auth.entrar(idDoctor1, 'incorrecta')
  )
  await auth.entrar(idDoctor1, 'contrasena-de-prueba')
  comprobar('acepta la contraseña correcta', auth.estado().autenticado)

  grupo('Catálogos')
  comprobar('el catálogo CIE-10 está cargado', catalogo.buscarCie10('').length > 0)
  const gripe = catalogo.buscarCie10('J00')
  comprobar('busca CIE-10 por código', gripe.length > 0 && gripe[0].codigo === 'J00')
  comprobar(
    'busca CIE-10 por descripción',
    catalogo.buscarCie10('hipertensión').some((c) => c.codigo === 'I10')
  )
  comprobar('el catálogo de medicamentos está cargado', catalogo.buscarMedicamentos('').length > 0)

  grupo('Pacientes')
  const idPaciente = pacientes.crear({
    primerNombre: 'Juan',
    segundoNombre: 'Carlos',
    primerApellido: 'Pérez',
    segundoApellido: 'López',
    fechaNacimiento: '1985-03-12',
    sexo: 'M',
    numeroIdentidad: '0801198512345',
    telefono: '9999-1111',
    correo: 'juan@ejemplo.hn',
    contactos: [{ nombre: 'María López', telefono: '9999-2222', parentesco: 'Esposa' }]
  })
  comprobar('crea un paciente', idPaciente > 0)

  const expediente = pacientes.expediente(idPaciente)
  comprobar('asigna número de expediente', /^EXP-\d{4}-\d{4}$/.test(expediente.paciente.numeroExpediente))
  comprobar('calcula la edad automáticamente', expediente.paciente.edad > 30)
  comprobar('guarda el contacto de emergencia', expediente.contactos.length === 1)

  await debeFallar('rechaza una identidad duplicada', () =>
    pacientes.crear({
      primerNombre: 'Otro',
      primerApellido: 'Paciente',
      fechaNacimiento: '1990-01-01',
      sexo: 'F',
      numeroIdentidad: '0801198512345'
    })
  )
  await debeFallar('rechaza una identidad con formato inválido', () =>
    pacientes.crear({
      primerNombre: 'Ana',
      primerApellido: 'Gómez',
      fechaNacimiento: '1990-01-01',
      sexo: 'F',
      numeroIdentidad: '123'
    })
  )
  await debeFallar('rechaza una fecha de nacimiento futura', () =>
    pacientes.crear({
      primerNombre: 'Ana',
      primerApellido: 'Gómez',
      fechaNacimiento: '2099-01-01',
      sexo: 'F',
      numeroIdentidad: '0801199912345'
    })
  )
  await debeFallar('exige identidad o responsable', () =>
    pacientes.crear({
      primerNombre: 'Bebé',
      primerApellido: 'Pérez',
      fechaNacimiento: '2025-01-01',
      sexo: 'M'
    })
  )

  const idMenor = pacientes.crear({
    primerNombre: 'Sofía',
    primerApellido: 'Pérez',
    fechaNacimiento: '2020-06-01',
    sexo: 'F',
    responsableId: idPaciente,
    responsableParentesco: 'Padre'
  })
  comprobar('permite un menor sin identidad vinculado a un responsable', idMenor > 0)
  comprobar(
    'el expediente del menor muestra a su responsable',
    pacientes.expediente(idMenor).responsable?.id === idPaciente
  )

  comprobar('busca por apellido', pacientes.buscar('Pérez').length === 2)
  comprobar('busca por prefijo parcial', pacientes.buscar('jua per').length === 1)
  comprobar('busca por número de identidad', pacientes.buscar('0801198512345').length === 1)
  comprobar(
    'busca por número de expediente',
    pacientes.buscar(expediente.paciente.numeroExpediente).length === 1
  )
  comprobar(
    'detecta un posible duplicado por nombre y fecha',
    pacientes.revisarDuplicados({
      primerNombre: 'Juan',
      primerApellido: 'Pérez',
      fechaNacimiento: '1985-03-12'
    }).length === 1
  )

  pacientes.actualizar(idPaciente, {
    primerNombre: 'Juan',
    segundoNombre: 'Carlos',
    primerApellido: 'Pérez',
    segundoApellido: 'López',
    fechaNacimiento: '1985-03-12',
    sexo: 'M',
    numeroIdentidad: '0801198512345',
    telefono: '3333-4444'
  })
  comprobar(
    'edita el teléfono del paciente',
    pacientes.expediente(idPaciente).paciente.telefono === '3333-4444'
  )

  grupo('Alergias, antecedentes y crónicos')
  pacientes.agregarAlergia(idPaciente, {
    sustancia: 'Penicilina',
    reaccion: 'Urticaria',
    gravedad: 'grave'
  })
  pacientes.agregarAntecedente(idPaciente, {
    tipo: 'familiar',
    descripcion: 'Padre con diabetes tipo 2'
  })
  pacientes.agregarCronico(idPaciente, {
    codigoCie10: 'I10',
    descripcion: 'Hipertensión arterial',
    desde: '2020-01-01'
  })
  const conClinicos = pacientes.expediente(idPaciente)
  comprobar('registra la alergia', conClinicos.alergias.length === 1)
  comprobar('registra el antecedente', conClinicos.antecedentes.length === 1)
  comprobar('registra el problema crónico', conClinicos.cronicos.length === 1)

  grupo('Consultas')
  const idConsulta = consultas.crear({
    pacienteId: idPaciente,
    motivo: 'Dolor de garganta y fiebre desde hace tres días',
    sintomas: 'Odinofagia, fiebre de 38.5 °C, malestar general',
    exploracion: 'Faringe eritematosa, sin exudados',
    tratamiento: 'Reposo, hidratación abundante',
    observaciones: 'Paciente colaborador',
    recomendaciones: 'Regresar si la fiebre persiste más de 48 horas',
    proximaCitaFecha: null,
    sinProximaCita: true,
    signos: {
      peso: 78,
      altura: 175,
      imc: null,
      presionSistolica: 128,
      presionDiastolica: 82,
      temperatura: 38.5,
      frecuenciaCardiaca: 92,
      frecuenciaRespiratoria: 18,
      saturacionOxigeno: 97,
      glucosa: null
    },
    diagnosticos: [
      { codigoCie10: 'J02.9', descripcion: 'Faringitis aguda no especificada', esPrincipal: true, nota: null }
    ],
    medicamentos: [
      {
        medicamentoId: null,
        nombre: 'Amoxicilina',
        concentracion: '500 mg',
        forma: 'Cápsula',
        dosis: '1 cápsula',
        frecuencia: 'cada 8 horas',
        duracion: 'por 7 días',
        via: 'Oral',
        indicaciones: 'Completar el tratamiento aunque mejoren los síntomas'
      }
    ]
  })
  comprobar('crea la consulta', idConsulta > 0)

  const consulta = consultas.obtener(idConsulta)
  comprobar('calcula el IMC en el servidor', consulta.signos.imc === 25.5)
  comprobar('guarda el diagnóstico principal', consulta.diagnosticos[0]?.esPrincipal === true)
  comprobar('guarda el medicamento recetado', consulta.medicamentos.length === 1)
  comprobar('la consulta creada hoy es editable', consulta.editable)
  comprobar('registra la consulta con la fecha de hoy', consulta.fecha === hoyIso())

  await debeFallar('rechaza una consulta sin motivo', () =>
    consultas.crear({
      pacienteId: idPaciente,
      motivo: '',
      sinProximaCita: true,
      signos: consulta.signos,
      diagnosticos: [],
      medicamentos: []
    })
  )
  await debeFallar('exige próxima cita o marcarla como ausente', () =>
    consultas.crear({
      pacienteId: idPaciente,
      motivo: 'Control de rutina',
      sinProximaCita: false,
      proximaCitaFecha: null,
      signos: consulta.signos,
      diagnosticos: [],
      medicamentos: []
    })
  )
  await debeFallar('rechaza una temperatura imposible', () =>
    consultas.crear({
      pacienteId: idPaciente,
      motivo: 'Control de rutina',
      sinProximaCita: true,
      signos: { ...consulta.signos, temperatura: 300 },
      diagnosticos: [],
      medicamentos: []
    })
  )
  await debeFallar('rechaza presión sistólica menor que la diastólica', () =>
    consultas.crear({
      pacienteId: idPaciente,
      motivo: 'Control de rutina',
      sinProximaCita: true,
      signos: { ...consulta.signos, presionSistolica: 70, presionDiastolica: 120 },
      diagnosticos: [],
      medicamentos: []
    })
  )
  await debeFallar('rechaza dos diagnósticos principales', () =>
    consultas.crear({
      pacienteId: idPaciente,
      motivo: 'Control de rutina',
      sinProximaCita: true,
      signos: consulta.signos,
      diagnosticos: [
        { codigoCie10: 'J00', descripcion: 'Resfriado', esPrincipal: true, nota: null },
        { codigoCie10: 'R05', descripcion: 'Tos', esPrincipal: true, nota: null }
      ],
      medicamentos: []
    })
  )
  await debeFallar('rechaza una consulta de un paciente inexistente', () =>
    consultas.crear({
      pacienteId: 99_999,
      motivo: 'Control de rutina',
      sinProximaCita: true,
      signos: consulta.signos,
      diagnosticos: [],
      medicamentos: []
    })
  )

  consultas.actualizar(idConsulta, {
    pacienteId: idPaciente,
    motivo: 'Dolor de garganta (motivo corregido)',
    sinProximaCita: false,
    proximaCitaFecha: '2026-09-01',
    signos: consulta.signos,
    diagnosticos: consulta.diagnosticos,
    medicamentos: consulta.medicamentos
  })
  comprobar(
    'edita una consulta del mismo día',
    consultas.obtener(idConsulta).motivo === 'Dolor de garganta (motivo corregido)'
  )

  grupo('Historial y medicación actual')
  comprobar('el historial devuelve la consulta', consultas.historial(idPaciente).length === 1)
  comprobar(
    'filtra el historial por texto',
    consultas.historial(idPaciente, { texto: 'garganta' }).length === 1
  )
  comprobar(
    'el filtro descarta lo que no coincide',
    consultas.historial(idPaciente, { texto: 'fractura' }).length === 0
  )
  comprobar(
    'filtra el historial por diagnóstico',
    consultas.historial(idPaciente, { codigoCie10: 'J02.9' }).length === 1
  )
  comprobar('devuelve la última consulta', consultas.ultima(idPaciente)?.id === idConsulta)
  comprobar(
    'la medicación actual sale de la última consulta',
    pacientes.expediente(idPaciente).medicacionActual.length === 1
  )

  grupo('Adendas y anulación')
  consultas.agregarAdenda(idConsulta, 'Se contacta al paciente: refiere mejoría a las 48 horas.')
  comprobar('agrega una adenda', consultas.obtener(idConsulta).adendas.length === 1)
  await debeFallar('rechaza una adenda vacía', () => consultas.agregarAdenda(idConsulta, '  '))

  const idAnulable = consultas.crear({
    pacienteId: idPaciente,
    motivo: 'Consulta registrada por error',
    sinProximaCita: true,
    signos: consulta.signos,
    diagnosticos: [],
    medicamentos: []
  })
  await debeFallar('exige motivo al anular', () => consultas.anular(idAnulable, 'no'))
  consultas.anular(idAnulable, 'Registrada por error en el paciente equivocado')
  comprobar('anula la consulta', consultas.obtener(idAnulable).estado === 'anulada')
  await debeFallar('no permite anular dos veces', () => consultas.anular(idAnulable, 'otro motivo'))
  comprobar(
    'la consulta anulada no cuenta como última',
    consultas.ultima(idPaciente)?.id === idConsulta
  )

  grupo('Documentos PDF')
  const receta = await documentos.generarDocumento(idConsulta, 'receta')
  comprobar('genera el PDF de la receta', existsSync(receta.ruta))
  comprobar('el PDF de la receta no está vacío', statSync(receta.ruta).size > 1000)
  comprobar(
    'archiva la receta en la carpeta del paciente',
    receta.ruta.includes('EXP-') && receta.ruta.includes('Recetas')
  )

  const resumen = await documentos.generarDocumento(idConsulta, 'resumen_consulta')
  comprobar('genera el PDF del resumen de consulta', existsSync(resumen.ruta))
  comprobar('el PDF del resumen no está vacío', statSync(resumen.ruta).size > 1000)
  comprobar('el resumen sale en tamaño carta exacto', esCarta(resumen.ruta))
  comprobar('la receta sale en tamaño carta exacto', esCarta(receta.ruta))
  comprobar(
    'los documentos quedan registrados en el expediente',
    documentos.documentosDePaciente(idPaciente).length === 2
  )
  await debeFallar('no genera receta sin medicamentos', () =>
    documentos.generarDocumento(idAnulable, 'receta')
  )

  grupo('Agenda de citas')
  const manana = hoyIso(new Date(Date.now() + 86_400_000))

  const agendada = citas.crear({
    pacienteId: idPaciente,
    fecha: manana,
    hora: '09:00',
    duracionMinutos: 30,
    motivo: 'Control de faringitis'
  })
  comprobar('agenda una cita', agendada.id > 0)
  comprobar('no reporta cruce cuando la agenda está libre', agendada.solapamientos.length === 0)

  const cruzada = citas.crear({
    pacienteId: idPaciente,
    fecha: manana,
    hora: '09:15',
    duracionMinutos: 30,
    motivo: 'Cita que se cruza'
  })
  comprobar('avisa del cruce de horarios', cruzada.solapamientos.length === 1)
  comprobar(
    'el cruce no impide agendar (horario libre por decisión del doctor)',
    citas.obtener(cruzada.id).estado === 'agendada'
  )

  const sinCruce = citas.crear({
    pacienteId: idPaciente,
    fecha: manana,
    hora: '11:00',
    duracionMinutos: 30
  })
  comprobar('no reporta cruce en un hueco libre', sinCruce.solapamientos.length === 0)

  const noRegistrado = citas.crear({
    nombreProvisional: 'Persona Sin Expediente',
    telefonoProvisional: '9999-8888',
    fecha: manana,
    hora: '14:00'
  })
  comprobar('agenda a alguien sin expediente', noRegistrado.id > 0)
  comprobar(
    'la cita sin expediente se marca como tal',
    citas.obtener(noRegistrado.id).esPacienteRegistrado === false
  )

  await debeFallar('exige paciente o nombre en la cita', () =>
    citas.crear({ fecha: manana, hora: '15:00' })
  )
  await debeFallar('rechaza una hora inválida', () =>
    citas.crear({ pacienteId: idPaciente, fecha: manana, hora: '99:99' })
  )
  await debeFallar('rechaza una fecha inválida', () =>
    citas.crear({ pacienteId: idPaciente, fecha: '14-08-2026' })
  )
  await debeFallar('rechaza un paciente inexistente', () =>
    citas.crear({ pacienteId: 99_999, fecha: manana })
  )

  const citaSinHora = citas.crear({ pacienteId: idPaciente, fecha: manana })
  comprobar('permite una cita sin hora concreta', citas.obtener(citaSinHora.id).hora === null)
  comprobar(
    'una cita sin hora nunca genera cruce',
    citas.comprobarSolapamiento(manana, null, 30).length === 0
  )

  comprobar('lista las citas del día', citas.enRango(manana, manana).length === 5)
  comprobar(
    'las citas sin hora encabezan el día',
    citas.enRango(manana, manana)[0].hora === null
  )
  // El paciente tiene además la cita que generó automáticamente una consulta anterior.
  comprobar(
    'lista las citas del paciente',
    citas.dePaciente(idPaciente).filter((c) => c.fecha === manana).length === 4
  )
  comprobar(
    'incluye la cita generada por una consulta previa',
    citas.dePaciente(idPaciente).some((c) => c.consultaOrigenId !== null)
  )

  citas.cambiarEstado(noRegistrado.id, 'no_asistio')
  comprobar('cambia el estado a no asistió', citas.obtener(noRegistrado.id).estado === 'no_asistio')
  citas.cambiarEstado(cruzada.id, 'cancelada')
  comprobar('cancela una cita', citas.obtener(cruzada.id).estado === 'cancelada')
  comprobar(
    'la cita cancelada deja de contar como cruce',
    citas.comprobarSolapamiento(manana, '09:15', 30, agendada.id).length === 0
  )

  citas.eliminar(citaSinHora.id)
  comprobar('elimina una cita sin consulta asociada', citas.enRango(manana, manana).length === 4)

  grupo('Cita generada desde la consulta')
  const idControl = consultas.crear({
    pacienteId: idPaciente,
    motivo: 'Consulta que programa un control',
    sinProximaCita: false,
    proximaCitaFecha: manana,
    signos: consulta.signos,
    diagnosticos: [],
    medicamentos: []
  })
  const generadas = citas
    .enRango(manana, manana)
    .filter((c) => c.consultaOrigenId === idControl)
  comprobar('la próxima cita de la consulta se agenda sola', generadas.length === 1)
  comprobar('la cita generada queda agendada', generadas[0]?.estado === 'agendada')

  const pasadoManana = hoyIso(new Date(Date.now() + 2 * 86_400_000))
  consultas.actualizar(idControl, {
    pacienteId: idPaciente,
    motivo: 'Consulta que programa un control',
    sinProximaCita: false,
    proximaCitaFecha: pasadoManana,
    signos: consulta.signos,
    diagnosticos: [],
    medicamentos: []
  })
  comprobar(
    'reprogramar la próxima cita en la consulta mueve la cita',
    citas.enRango(pasadoManana, pasadoManana).filter((c) => c.consultaOrigenId === idControl)
      .length === 1
  )
  comprobar(
    'no queda una cita duplicada en la fecha anterior',
    citas.enRango(manana, manana).filter((c) => c.consultaOrigenId === idControl).length === 0
  )

  consultas.actualizar(idControl, {
    pacienteId: idPaciente,
    motivo: 'Consulta que programa un control',
    sinProximaCita: true,
    proximaCitaFecha: null,
    signos: consulta.signos,
    diagnosticos: [],
    medicamentos: []
  })
  comprobar(
    'marcar "sin próxima cita" retira la cita generada',
    citas.enRango(pasadoManana, pasadoManana).filter((c) => c.consultaOrigenId === idControl)
      .length === 0
  )

  grupo('Atender una cita')
  const paraAtender = citas.crear({ pacienteId: idPaciente, fecha: manana, hora: '16:00' })
  const idDesdeCita = consultas.crear({
    pacienteId: idPaciente,
    citaId: paraAtender.id,
    motivo: 'Consulta iniciada desde la agenda',
    sinProximaCita: true,
    signos: consulta.signos,
    diagnosticos: [],
    medicamentos: []
  })
  const atendida = citas.obtener(paraAtender.id)
  comprobar('la cita atendida cambia de estado', atendida.estado === 'atendida')
  comprobar('la cita queda vinculada a la consulta', atendida.consultaAtencionId === idDesdeCita)
  await debeFallar('no permite eliminar una cita ya atendida', () =>
    citas.eliminar(paraAtender.id)
  )

  grupo('Dashboard')
  const panel = consultas.dashboard()
  // Activas de hoy: la inicial, la de control y la iniciada desde la agenda.
  // La cuarta está anulada y no debe contarse.
  comprobar('cuenta los pacientes activos', panel.totalPacientes === 2)
  comprobar('cuenta solo las consultas activas de hoy', panel.consultasHoy === 3)
  comprobar('cuenta las citas agendadas de hoy', panel.citasHoy === 0)
  comprobar('lista los pacientes atendidos', panel.ultimosAtendidos.length > 0)

  grupo('Backups')
  const copia = await backups.crear('manual')
  comprobar('crea y verifica el backup', existsSync(copia.ruta))
  comprobar('el backup tiene contenido', copia.tamanoBytes > 10_000)
  comprobar('el backup aparece en el listado', backups.listar().length >= 1)

  const idPosterior = pacientes.crear({
    primerNombre: 'Registrado',
    primerApellido: 'Después',
    fechaNacimiento: '1995-05-05',
    sexo: 'F',
    numeroIdentidad: '0801199555555'
  })
  comprobar('crea un paciente posterior al backup', idPosterior > 0)
  comprobar('ahora hay tres pacientes', pacientes.buscar('').length === 3)

  await backups.restaurar(copia.ruta)
  comprobar('la restauración revierte al estado del backup', pacientes.buscar('').length === 2)
  comprobar(
    'los datos previos al backup siguen intactos',
    consultas.historial(idPaciente).length === 4
  )
  await debeFallar('rechaza restaurar un archivo inexistente', () =>
    backups.restaurar(join(carpetaTemporal, 'no-existe.db'))
  )

  grupo('Equipo y roles')
  const idDoctor2 = await auth.crearUsuario({
    nombre: 'Doctor 2',
    rol: 'doctor',
    password: 'clave-doctor-dos'
  })
  const idSecretaria = await auth.crearUsuario({
    nombre: 'Secretaria',
    rol: 'secretaria',
    password: 'clave-secretaria'
  })
  comprobar('crea un segundo doctor', idDoctor2 > 0)
  comprobar('crea la secretaria', idSecretaria > 0)
  comprobar('el equipo tiene tres usuarios', auth.listarUsuarios().length === 3)

  await debeFallar('rechaza un nombre de usuario repetido', () =>
    auth.crearUsuario({ nombre: 'Doctor 2', rol: 'doctor', password: 'otra-clave-larga' })
  )
  await debeFallar('rechaza una contraseña demasiado corta', () =>
    auth.crearUsuario({ nombre: 'Doctor 3', rol: 'doctor', password: 'corta' })
  )
  await debeFallar('no permite quedarse sin administrador', () =>
    auth.actualizarUsuario(idDoctor1, { nombre: 'Doctor 1', rol: 'doctor', esAdministrador: false })
  )
  await debeFallar('no permite desactivar el propio usuario', () =>
    auth.alternarUsuario(idDoctor1, false)
  )

  grupo('Permisos de la secretaria')
  auth.salir()
  await auth.entrar(idSecretaria, 'clave-secretaria')
  comprobar('la secretaria debe cambiar su contraseña inicial', auth.estado().sesion?.debeCambiarPassword === true)
  await auth.cambiarPassword('clave-secretaria', 'clave-secretaria')
  comprobar('tras cambiarla ya no se le exige', auth.estado().sesion?.debeCambiarPassword === false)

  const permisosSecretaria = new Set(auth.estado().permisos)
  comprobar('la secretaria gestiona la agenda', permisosSecretaria.has('citas.gestionar'))
  comprobar('la secretaria registra pacientes', permisosSecretaria.has('pacientes.registrar'))
  comprobar('la secretaria NO ve datos clínicos', !permisosSecretaria.has('pacientes.ver_clinico'))
  comprobar('la secretaria NO crea consultas', !permisosSecretaria.has('consultas.crear'))
  comprobar('la secretaria NO gestiona usuarios', !permisosSecretaria.has('usuarios.gestionar'))

  comprobar('la secretaria ve la ficha de contacto', pacientes.ficha(idPaciente).paciente.id === idPaciente)
  comprobar(
    'la ficha no incluye información clínica',
    !Object.prototype.hasOwnProperty.call(pacientes.ficha(idPaciente), 'alergias')
  )
  comprobar(
    'la secretaria puede agendar',
    citas.crear({ doctorId: idDoctor1, pacienteId: idPaciente, fecha: manana, hora: '08:00' }).id >
      0
  )
  await debeFallar('la secretaria no puede listar usuarios', () => auth.listarUsuarios())

  grupo('Permisos del doctor')
  auth.salir()
  await auth.entrar(idDoctor2, 'clave-doctor-dos')
  await auth.cambiarPassword('clave-doctor-dos', 'clave-doctor-dos')

  const permisosDoctor = new Set(auth.estado().permisos)
  comprobar('el doctor ve datos clínicos', permisosDoctor.has('pacientes.ver_clinico'))
  comprobar('el doctor crea consultas', permisosDoctor.has('consultas.crear'))
  comprobar('el doctor ve la agenda', permisosDoctor.has('citas.ver'))
  comprobar('el doctor gestiona su propia agenda', permisosDoctor.has('citas.gestionar'))
  comprobar(
    'el doctor NO gestiona la agenda de los demás',
    !permisosDoctor.has('citas.gestionar_todas')
  )
  comprobar('el doctor sin administración NO gestiona usuarios', !permisosDoctor.has('usuarios.gestionar'))
  comprobar('el doctor NO elimina expedientes', !permisosDoctor.has('pacientes.eliminar'))

  grupo('Autoría de consultas entre doctores')
  const idConsultaAjena = consultas.crear({
    pacienteId: idPaciente,
    motivo: 'Consulta registrada por el Doctor 2',
    sinProximaCita: true,
    signos: consulta.signos,
    diagnosticos: [],
    medicamentos: []
  })
  comprobar(
    'la consulta guarda a su autor',
    consultas.obtener(idConsultaAjena).usuarioId === idDoctor2
  )
  comprobar(
    'la consulta muestra el nombre del doctor que la atendió',
    consultas.obtener(idConsultaAjena).nombreDoctor === 'Doctor 2'
  )
  comprobar('su autor puede editarla el mismo día', consultas.obtener(idConsultaAjena).editable)

  auth.salir()
  await auth.entrar(idDoctor1, 'contrasena-de-prueba')
  comprobar(
    'otro doctor la ve pero no la puede editar',
    consultas.obtener(idConsultaAjena).editable === false
  )
  await debeFallar('editar una consulta ajena queda bloqueado', () =>
    consultas.actualizar(idConsultaAjena, {
      pacienteId: idPaciente,
      motivo: 'Intento de modificación ajena',
      sinProximaCita: true,
      signos: consulta.signos,
      diagnosticos: [],
      medicamentos: []
    })
  )
  comprobar(
    'sí puede dejar constancia con una adenda',
    consultas.agregarAdenda(idConsultaAjena, 'Adenda de otro doctor sobre la evolución.') > 0
  )
  comprobar(
    'los expedientes son compartidos entre doctores',
    pacientes.expediente(idPaciente).paciente.id === idPaciente
  )

  grupo('Agenda por doctor')
  auth.salir()
  await auth.entrar(idDoctor2, 'clave-doctor-dos')

  const citaPropia = citas.crear({ pacienteId: idPaciente, fecha: manana, hora: '10:00' })
  comprobar(
    'un doctor se agenda a sí mismo automáticamente',
    citas.obtener(citaPropia.id).doctorId === idDoctor2
  )
  await debeFallar('un doctor no puede agendar para otro', () =>
    citas.crear({ doctorId: idDoctor1, pacienteId: idPaciente, fecha: manana, hora: '10:30' })
  )
  comprobar(
    'el doctor solo ve su propia agenda',
    citas.enRango(manana, manana).every((c) => c.doctorId === idDoctor2)
  )

  auth.salir()
  await auth.entrar(idSecretaria, 'clave-secretaria')
  const citaAsignada = citas.crear({
    doctorId: idDoctor1,
    pacienteId: idPaciente,
    fecha: manana,
    hora: '12:00',
    motivo: 'Asignada por secretaría'
  })
  comprobar(
    'la secretaría asigna la cita al doctor elegido',
    citas.obtener(citaAsignada.id).doctorId === idDoctor1
  )
  await debeFallar('la secretaría debe indicar un doctor', () =>
    citas.crear({ pacienteId: idPaciente, fecha: manana, hora: '13:00' })
  )
  await debeFallar('rechaza un doctor inexistente', () =>
    citas.crear({ doctorId: 99_999, pacienteId: idPaciente, fecha: manana })
  )
  comprobar(
    'la secretaría ve la agenda de todos',
    citas.enRango(manana, manana).some((c) => c.doctorId === idDoctor2)
  )
  comprobar(
    'la secretaría puede filtrar por doctor',
    citas.enRango(manana, manana, idDoctor1).every((c) => c.doctorId === idDoctor1)
  )
  comprobar('la cita incluye el nombre del doctor', citas.obtener(citaAsignada.id).nombreDoctor !== null)

  auth.salir()
  await auth.entrar(idDoctor2, 'clave-doctor-dos')
  await debeFallar('un doctor no puede editar la cita de otro', () =>
    citas.actualizar(citaAsignada.id, {
      doctorId: idDoctor2,
      pacienteId: idPaciente,
      fecha: manana,
      hora: '12:30'
    })
  )
  await debeFallar('un doctor no puede cancelar la cita de otro', () =>
    citas.cambiarEstado(citaAsignada.id, 'cancelada')
  )
  citas.cambiarEstado(citaPropia.id, 'cancelada')
  comprobar('sí puede cancelar la suya', citas.obtener(citaPropia.id).estado === 'cancelada')

  comprobar(
    'el cruce solo se evalúa dentro de la agenda del mismo doctor',
    citas.comprobarSolapamiento(manana, '12:00', 30).length === 0
  )

  grupo('Reportes de agenda')
  auth.salir()
  await auth.entrar(idSecretaria, 'clave-secretaria')

  const reporteDia = citas.reporte('dia', manana, idDoctor1)
  comprobar('el reporte del día acota el rango', reporteDia.desde === reporteDia.hasta)
  comprobar('el reporte identifica al doctor', reporteDia.nombreDoctor !== null)
  comprobar(
    'el reporte solo trae citas de ese doctor',
    reporteDia.citas.every((c) => c.doctorId === idDoctor1)
  )
  comprobar(
    'los totales cuadran con las citas',
    reporteDia.totales.agendadas +
      reporteDia.totales.atendidas +
      reporteDia.totales.noAsistio +
      reporteDia.totales.canceladas ===
      reporteDia.citas.length
  )

  const reporteSemana = citas.reporte('semana', manana, null)
  comprobar('el reporte semanal abarca siete días', reporteSemana.desde < reporteSemana.hasta)
  comprobar('sin doctor, el reporte incluye a todos', reporteSemana.doctorId === null)

  const reporteMes = citas.reporte('mes', manana, null)
  comprobar(
    'el reporte mensual empieza el día 1',
    reporteMes.desde.endsWith('-01')
  )
  comprobar(
    'el rango mensual contiene al semanal',
    reporteMes.desde <= reporteSemana.desde || reporteMes.hasta >= reporteSemana.hasta
  )

  const pdfReporte = await documentos.generarReporteCitas('dia', manana, idDoctor1)
  comprobar('genera el PDF del reporte de agenda', existsSync(pdfReporte.ruta))
  comprobar('el PDF del reporte no está vacío', statSync(pdfReporte.ruta).size > 1000)
  comprobar('el reporte de agenda sale en tamaño carta exacto', esCarta(pdfReporte.ruta))

  grupo('Expediente impreso')
  auth.salir()
  await auth.entrar(idDoctor1, 'contrasena-de-prueba')
  const pdfExpediente = await documentos.generarExpediente(idPaciente)
  comprobar('genera el PDF del expediente completo', existsSync(pdfExpediente.ruta))
  comprobar(
    'el expediente pesa más que una receta (trae todo el historial)',
    statSync(pdfExpediente.ruta).size > 5000
  )
  comprobar(
    'el expediente se archiva en la carpeta del paciente',
    pdfExpediente.ruta.includes('EXP-') && pdfExpediente.ruta.includes('Documentos')
  )
  comprobar('el expediente sale en tamaño carta exacto', esCarta(pdfExpediente.ruta))

  grupo('Diagnósticos propios y protocolos')
  const codigoPropio = catalogo.crearCie10({
    codigo: 'loc-01',
    descripcion: 'Control de crecimiento local',
    categoria: null
  })
  comprobar('crea un diagnóstico propio en mayúsculas', codigoPropio === 'LOC-01')
  comprobar(
    'aparece en el buscador junto a los oficiales',
    catalogo.buscarCie10('LOC-01').some((c) => c.codigo === 'LOC-01')
  )
  comprobar('se lista como personalizado', catalogo.listarCie10(true).length === 1)
  await debeFallar('rechaza un código repetido', () =>
    catalogo.crearCie10({ codigo: 'LOC-01', descripcion: 'Otro', categoria: null })
  )
  await debeFallar('no permite modificar un código oficial', () =>
    catalogo.actualizarCie10('J00', { descripcion: 'Alterado', categoria: null })
  )
  await debeFallar('no permite eliminar un código oficial', () => catalogo.eliminarCie10('J00'))

  const idPlantilla = catalogo.guardarPlantilla({
    codigoCie10: 'J02.9',
    nombre: 'Faringitis bacteriana — adulto',
    tratamiento: 'Reposo relativo e hidratación abundante.',
    recomendaciones: 'Volver si la fiebre persiste 48 horas.',
    items: [
      {
        medicamentoId: null,
        nombre: 'Amoxicilina',
        concentracion: '500 mg',
        forma: 'Cápsula',
        dosis: '1 cápsula',
        frecuencia: 'cada 8 horas',
        duracion: 'por 7 días',
        via: 'Oral',
        indicaciones: null
      }
    ]
  })
  comprobar('guarda un protocolo de tratamiento', idPlantilla > 0)
  const plantillas = catalogo.plantillasPorCie10('J02.9')
  comprobar('el protocolo se ofrece para su diagnóstico', plantillas.length === 1)
  comprobar('el protocolo conserva sus medicamentos', plantillas[0].items.length === 1)
  comprobar(
    'no se ofrece para un diagnóstico distinto',
    catalogo.plantillasPorCie10('I10').length === 0
  )

  catalogo.eliminarPlantilla(idPlantilla)
  comprobar('elimina el protocolo', catalogo.plantillasPorCie10('J02.9').length === 0)

  await debeFallar('no elimina un diagnóstico en uso', () => catalogo.eliminarCie10('J02.9'))
  catalogo.eliminarCie10('LOC-01')
  comprobar('elimina un diagnóstico propio sin uso', catalogo.listarCie10(true).length === 0)

  grupo('Actualizaciones y versionado del esquema')
  const migraciones = await import('./db/migraciones')
  const { rutaBaseDatos, directorioBackups } = await import('./db/rutas')
  const { readdirSync } = await import('node:fs')

  comprobar(
    'la base está en la versión de esquema del programa',
    migraciones.versionDeLaBase(dbActual()) === migraciones.VERSION_ESQUEMA
  )
  comprobar('no quedan migraciones pendientes', !migraciones.hayMigracionesPendientes(dbActual()))

  // Se simula una base creada por una version futura del programa.
  dbActual()
    .prepare('INSERT INTO migracion (version, nombre, aplicada_en) VALUES (?, ?, ?)')
    .run(migraciones.VERSION_ESQUEMA + 5, 'version_del_futuro', new Date().toISOString())
  cerrarBaseDatos()

  let rechazoBaseNueva = false
  try {
    abrirBaseDatos()
  } catch (error) {
    rechazoBaseNueva = (error as { codigo?: string }).codigo === 'BASE_MAS_NUEVA'
  }
  comprobar('se niega a abrir una base creada por una versión más nueva', rechazoBaseNueva)

  // Se revierte la simulacion para continuar con el resto de las pruebas.
  const reparar = new (await import('better-sqlite3')).default(rutaBaseDatos())
  reparar.prepare('DELETE FROM migracion WHERE version = ?').run(migraciones.VERSION_ESQUEMA + 5)
  reparar.close()

  const backupsPrevios = readdirSync(directorioBackups()).filter((n) =>
    n.startsWith('dmedic-pre-actualizacion-')
  )
  comprobar(
    'no crea copia previa cuando no hay migraciones pendientes',
    backupsPrevios.length === 0
  )

  abrirBaseDatos()
  comprobar('vuelve a abrir con normalidad tras reparar la versión', pacientes.buscar('').length > 0)

  grupo('Persistencia entre reinicios')
  cerrarBaseDatos()
  abrirBaseDatos()
  comprobar('los pacientes sobreviven al reinicio', pacientes.buscar('Pérez').length === 2)
  comprobar(
    'las consultas sobreviven al reinicio',
    consultas.historial(idPaciente).length === 5
  )
  comprobar(
    'las alergias sobreviven al reinicio',
    pacientes.expediente(idPaciente).alergias.length === 1
  )
  comprobar('las citas sobreviven al reinicio', citas.dePaciente(idPaciente).length > 0)

  grupo('Eliminación de información')
  pacientes.archivar(idMenor)
  comprobar('archivar oculta al paciente de la lista', pacientes.buscar('').length === 1)
  comprobar(
    'el paciente archivado sigue existiendo',
    pacientes.buscar('', { incluirInactivos: true }).length === 2
  )
  pacientes.reactivar(idMenor)
  comprobar('reactivar lo devuelve a la lista', pacientes.buscar('').length === 2)

  await debeFallar('no elimina sin la confirmación exacta', () =>
    pacientes.eliminarDefinitivo(idMenor, 'EXP-EQUIVOCADO')
  )
  const expedienteMenor = pacientes.expediente(idMenor).paciente.numeroExpediente
  pacientes.eliminarDefinitivo(idMenor, expedienteMenor)
  comprobar('elimina definitivamente con la confirmación correcta', pacientes.buscar('').length === 1)
  await debeFallar('el paciente eliminado ya no se puede abrir', () =>
    pacientes.expediente(idMenor)
  )

  grupo('Bloqueo por intentos fallidos')
  auth.salir()
  for (let intento = 0; intento < 4; intento++) {
    try {
      await auth.entrar(idDoctor1, 'incorrecta')
    } catch {
      // Los cuatro primeros fallos solo suman al contador.
    }
  }
  await debeFallar('bloquea la cuenta al quinto intento fallido', () =>
    auth.entrar(idDoctor1, 'incorrecta')
  )
  await debeFallar('el bloqueo también rechaza la contraseña correcta', () =>
    auth.entrar(idDoctor1, 'contrasena-de-prueba')
  )
  await auth.entrar(idSecretaria, 'clave-secretaria')
  comprobar(
    'bloquear a un usuario no deja fuera a los demás',
    auth.estado().sesion?.usuarioId === idSecretaria
  )
  auth.salir()

  grupo('Simulación de una actualización real')
  // Se lleva la base al estado de la versión anterior (sin agenda) y se vuelve a
  // abrir con el programa actual: exactamente lo que ocurre al actualizar.
  cerrarBaseDatos()
  const BetterSqlite3 = (await import('better-sqlite3')).default
  const retroceder = new BetterSqlite3(rutaBaseDatos())
  // Se deshace la última migración tal cual quedaría una base de la versión previa.
  retroceder.exec(`
    DROP INDEX IF EXISTS idx_cita_doctor;
    ALTER TABLE cita DROP COLUMN doctor_id;
    ALTER TABLE cie10 DROP COLUMN es_personalizado;
    ALTER TABLE configuracion_clinica DROP COLUMN tamano_receta;
  `)
  retroceder.prepare('DELETE FROM migracion WHERE version = 4').run()
  const pacientesAntes = (
    retroceder.prepare('SELECT COUNT(*) AS total FROM paciente').get() as { total: number }
  ).total
  retroceder.close()

  abrirBaseDatos()

  comprobar(
    'aplica sola la migración pendiente al abrir',
    migraciones.versionDeLaBase(dbActual()) === migraciones.VERSION_ESQUEMA
  )
  comprobar(
    'crea una copia previa antes de modificar el esquema',
    readdirSync(directorioBackups()).some((n) => n.startsWith('dmedic-pre-actualizacion-'))
  )
  comprobar(
    'ningún paciente se pierde en la actualización',
    pacientes.buscar('', { incluirInactivos: true }).length === pacientesAntes
  )
  comprobar(
    'las consultas sobreviven a la actualización',
    consultas.historial(idPaciente).length === 5
  )
  comprobar('las citas sobreviven a la actualización', citas.dePaciente(idPaciente).length > 0)
  comprobar(
    'la columna nueva queda poblada, sin citas huérfanas',
    citas.dePaciente(idPaciente).every((c) => c.doctorId !== null)
  )

  cerrarBaseDatos()
}

app
  .whenReady()
  .then(ejecutar)
  .catch((error) => {
    fallidas++
    console.error('\nError no controlado durante las pruebas:', error)
  })
  .finally(() => {
    console.log(`\n${'='.repeat(52)}`)
    console.log(`  Pasadas: ${pasadas}   Fallidas: ${fallidas}`)
    console.log('='.repeat(52))
    try {
      rmSync(carpetaTemporal, { recursive: true, force: true })
    } catch {
      // El directorio temporal se limpia al reiniciar el sistema si sigue bloqueado.
    }
    app.exit(fallidas === 0 ? 0 : 1)
  })
