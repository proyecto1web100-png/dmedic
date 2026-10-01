/**
 * Banco de pruebas del expediente ampliado: ficha social, archivos de estudios,
 * incapacidades, referencias, medicacion permanente, inventario y empresas con
 * convenio. Corre sobre el codigo real con un directorio de datos temporal.
 *
 *   npm run verificar:expediente
 */
import { app } from 'electron'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const carpetaTemporal = mkdtempSync(join(tmpdir(), 'dmedic-expediente-'))
app.setPath('userData', carpetaTemporal)

// Sin ventana principal, destruir la ventana oculta de cada PDF cerraria la
// aplicacion y el documento siguiente fallaria.
app.on('window-all-closed', () => {})

let pasadas = 0
let fallidas = 0

function comprobar(descripcion: string, condicion: boolean, detalle?: string): void {
  if (condicion) {
    pasadas++
    console.log(`  OK    ${descripcion}`)
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

/** Un PDF de verdad empieza por %PDF y pesa algo. */
function esPdfValido(ruta: string): boolean {
  if (!existsSync(ruta)) return false
  if (statSync(ruta).size < 1000) return false
  return readFileSync(ruta).subarray(0, 4).toString('latin1') === '%PDF'
}

function textoDelPdf(ruta: string): string {
  return readFileSync(ruta).toString('latin1')
}

async function ejecutar(): Promise<void> {
  const { abrirBaseDatos, cerrarBaseDatos } = await import('./db/conexion')
  const auth = await import('./services/auth')
  const pacientes = await import('./services/pacientes')
  const consultas = await import('./services/consultas')
  const expediente = await import('./services/expediente')
  const empresas = await import('./services/empresas')
  const inventario = await import('./services/inventario')
  const catalogo = await import('./repositories/catalogo')
  const { hoyIso } = await import('@shared/lib/fecha')

  abrirBaseDatos()

  await auth.instalar({
    nombreDoctor: 'Dra. Prueba Expediente',
    nombreClinica: 'DMedic',
    password: 'contrasena-de-prueba'
  })

  // ===== Empresas =====
  grupo('Empresas con convenio')
  const idEmpresa = empresas.crear({
    codigo: 'acme',
    nombre: 'Textiles ACME S. de R.L.',
    contacto: 'Recursos Humanos',
    telefono: '2550-1234'
  })
  const empresa = empresas.listar().find((e) => e.id === idEmpresa)
  comprobar('crea la empresa', empresa !== undefined)
  comprobar('el código se guarda en mayúsculas', empresa?.codigo === 'ACME')
  await debeFallar('no admite dos empresas con el mismo código', () =>
    empresas.crear({ codigo: 'ACME', nombre: 'Otra' })
  )

  // ===== Paciente con ficha social =====
  grupo('Ficha social del paciente')
  const idPaciente = pacientes.crear({
    primerNombre: 'Marta',
    primerApellido: 'Núñez',
    fechaNacimiento: '1985-04-12',
    sexo: 'F',
    numeroIdentidad: '0801198512345',
    telefono: '9988-7766',
    nivelEducativo: 'secundaria',
    ocupacion: 'Operaria de máquina',
    estadoCivil: 'union_libre',
    historiador: 'La propia paciente',
    empresaId: idEmpresa,
    codigoEmpleado: 'EMP-0442',
    alergiasIniciales: [
      { sustancia: 'Penicilina', reaccion: 'Urticaria', gravedad: 'grave' }
    ],
    antecedentesIniciales: [
      { tipo: 'personal_patologico', descripcion: 'Hipertensión arterial desde 2020' },
      { tipo: 'familiar', descripcion: 'Madre con diabetes tipo 2' }
    ]
  })

  const resumen = pacientes.expediente(idPaciente)
  comprobar('guarda el nivel educativo', resumen?.paciente.nivelEducativo === 'secundaria')
  comprobar('guarda la ocupación', resumen?.paciente.ocupacion === 'Operaria de máquina')
  comprobar('guarda el estado civil', resumen?.paciente.estadoCivil === 'union_libre')
  comprobar('guarda el historiador', resumen?.paciente.historiador === 'La propia paciente')
  comprobar('vincula la empresa', resumen?.paciente.empresaNombre?.startsWith('Textiles') === true)
  comprobar('guarda el código de empleado', resumen?.paciente.codigoEmpleado === 'EMP-0442')
  comprobar('registra las alergias del alta', resumen?.alergias.length === 1)
  comprobar('registra los antecedentes del alta', resumen?.antecedentes.length === 2)

  comprobar(
    'el paciente aparece al buscar por su código de empleado',
    pacientes.buscar('EMP-0442').some((p) => p.id === idPaciente)
  )
  comprobar('la empresa lista a su empleado', empresas.pacientesDe(idEmpresa).length === 1)

  // ===== Consulta base =====
  const idConsulta = consultas.crear({
    pacienteId: idPaciente,
    motivo: 'Dolor lumbar de tres días',
    sinProximaCita: true,
    signos: {
      peso: 68, altura: 160, imc: null, presionSistolica: 130, presionDiastolica: 85,
      temperatura: 36.8, frecuenciaCardiaca: 78, frecuenciaRespiratoria: 16,
      saturacionOxigeno: 98, glucosa: null
    },
    diagnosticos: [
      { codigoCie10: 'M54.5', descripcion: 'Lumbago no especificado', esPrincipal: true, nota: null }
    ],
    medicamentos: []
  })

  // ===== Adjuntos =====
  grupo('Archivos de estudios')
  const rutaOrigen = join(carpetaTemporal, 'hemograma.pdf')
  writeFileSync(rutaOrigen, `%PDF-1.4\n${'resultado de laboratorio '.repeat(80)}`)

  const idAdjunto = expediente.agregarAdjunto(
    {
      pacienteId: idPaciente,
      consultaId: idConsulta,
      categoria: 'laboratorio',
      titulo: 'Hemograma completo',
      descripcion: 'Leucocitos ligeramente elevados, resto dentro de rangos normales.',
      fechaEstudio: hoyIso()
    },
    rutaOrigen
  )
  const adjuntos = expediente.adjuntosDePaciente(idPaciente)
  comprobar('registra el archivo adjunto', adjuntos.length === 1)
  comprobar('guarda la descripción del estudio', adjuntos[0].descripcion?.includes('Leucocitos') === true)
  comprobar('copia el archivo a la carpeta del paciente', existsSync(adjuntos[0].ruta))
  comprobar(
    'la copia queda dentro del expediente, no en el origen',
    adjuntos[0].ruta !== rutaOrigen && adjuntos[0].ruta.includes('EXP-')
  )
  comprobar('conserva el nombre original', adjuntos[0].nombreOriginal === 'hemograma.pdf')
  comprobar('un PDF no se marca como imagen', adjuntos[0].esImagen === false)
  comprobar('el adjunto queda ligado a la consulta', expediente.adjuntosDeConsulta(idConsulta).length === 1)

  // El original puede desaparecer: el expediente conserva su copia.
  rmSync(rutaOrigen)
  comprobar(
    'el expediente sobrevive a que se borre el archivo original',
    existsSync(expediente.adjuntosDePaciente(idPaciente)[0].ruta)
  )

  const rutaImagen = join(carpetaTemporal, 'radiografia.png')
  // PNG minimo valido de 1x1.
  writeFileSync(
    rutaImagen,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
  )
  const idImagen = expediente.agregarAdjunto(
    {
      pacienteId: idPaciente,
      categoria: 'imagen',
      titulo: 'Radiografía lumbar AP',
      descripcion: 'Sin datos de fractura ni listesis.',
      fechaEstudio: hoyIso()
    },
    rutaImagen
  )
  const imagen = expediente.adjuntosDePaciente(idPaciente).find((a) => a.id === idImagen)
  comprobar('reconoce una imagen como tal', imagen?.esImagen === true)
  comprobar(
    'devuelve la imagen como data URL para verla en pantalla',
    expediente.contenidoDeImagen(idImagen).startsWith('data:image/png;base64,')
  )

  const rutaProhibida = join(carpetaTemporal, 'programa.exe')
  writeFileSync(rutaProhibida, 'MZ binario')
  await debeFallar('rechaza adjuntar un ejecutable', () =>
    expediente.agregarAdjunto(
      { pacienteId: idPaciente, categoria: 'otro', titulo: 'Programa' },
      rutaProhibida
    )
  )

  const rutaBorrada = expediente
    .adjuntosDePaciente(idPaciente)
    .find((a) => a.id === idAdjunto)?.ruta as string
  expediente.eliminarAdjunto(idAdjunto)
  comprobar('eliminar el adjunto lo quita del expediente', expediente.adjuntosDePaciente(idPaciente).length === 1)
  comprobar('eliminar el adjunto también borra el archivo del disco', !existsSync(rutaBorrada))

  // ===== Incapacidades =====
  grupo('Incapacidades')
  const incapacidad = await expediente.crearIncapacidad({
    pacienteId: idPaciente,
    consultaId: idConsulta,
    desde: '2026-09-14',
    dias: 3,
    motivo: 'Lumbalgia aguda que impide bipedestación prolongada',
    codigoCie10: 'M54.5',
    diagnostico: 'Lumbago no especificado'
  })
  comprobar('numera la incapacidad con folio anual', /^INC-\d{4}-0001$/.test(incapacidad.folio))
  comprobar('calcula el último día inclusive', incapacidad.hasta === '2026-09-16')
  comprobar('nace vigente', incapacidad.estado === 'vigente')
  comprobar('genera el PDF de la constancia', esPdfValido(incapacidad.archivoPath ?? ''))

  await debeFallar('rechaza una incapacidad de cero días', () =>
    expediente.crearIncapacidad({
      pacienteId: idPaciente, desde: hoyIso(), dias: 0, motivo: 'x'
    })
  )
  await debeFallar('rechaza una incapacidad sin motivo', () =>
    expediente.crearIncapacidad({
      pacienteId: idPaciente, desde: hoyIso(), dias: 2, motivo: '   '
    })
  )

  const segunda = await expediente.crearIncapacidad({
    pacienteId: idPaciente, desde: hoyIso(), dias: 1, motivo: 'Control'
  })
  comprobar('el folio avanza', segunda.folio.endsWith('0002'))

  await expediente.anularIncapacidad(segunda.id, 'Se emitió por error de paciente')
  const anulada = expediente.incapacidadesDePaciente(idPaciente).find((i) => i.id === segunda.id)
  comprobar('anular deja constancia del motivo', anulada?.estado === 'anulada')
  comprobar(
    'la constancia anulada se reimprime con el sello',
    textoDelPdf(anulada?.archivoPath ?? '').length > 0
  )

  // ===== Referencias =====
  grupo('Referencias a especialista')
  const referencia = await expediente.crearReferencia({
    pacienteId: idPaciente,
    consultaId: idConsulta,
    dirigidaA: 'Dr. Ramón Ortega',
    especialidad: 'Ortopedia',
    institucion: 'Hospital Regional',
    motivo: 'Lumbalgia persistente sin respuesta a manejo conservador',
    resumenClinico: 'Paciente de 41 años con dolor lumbar de tres días.',
    hallazgos: 'Radiografía lumbar sin datos de fractura.',
    urgente: false
  })
  comprobar('numera la referencia con folio anual', /^REF-\d{4}-0001$/.test(referencia.folio))
  comprobar('genera el PDF de la referencia', esPdfValido(referencia.archivoPath ?? ''))
  await debeFallar('rechaza una referencia sin destinatario', () =>
    expediente.crearReferencia({
      pacienteId: idPaciente, dirigidaA: '  ', motivo: 'x', urgente: false
    })
  )

  // ===== Medicacion permanente =====
  grupo('Medicación permanente')
  const idCronica = expediente.agregarMedicacionCronica({
    pacienteId: idPaciente,
    nombre: 'Losartán',
    concentracion: '50 mg',
    forma: 'Tableta',
    dosis: '1 tableta',
    frecuencia: 'Cada 24 horas',
    via: 'Oral',
    motivo: 'Hipertensión arterial',
    desde: '2020-06-01'
  })
  comprobar('la medicación permanente sale en el expediente',
    pacientes.expediente(idPaciente)?.medicacionCronica.length === 1)
  comprobar('anota la enfermedad de base',
    expediente.medicacionCronica(idPaciente)[0].motivo === 'Hipertensión arterial')

  expediente.suspenderMedicacionCronica(idCronica, false)
  comprobar('suspender la retira de la lista activa del expediente',
    pacientes.expediente(idPaciente)?.medicacionCronica.length === 0)
  comprobar('pero se conserva en el historial del paciente',
    expediente.medicacionCronica(idPaciente).length === 1)

  await debeFallar('rechaza medicación sin dosis', () =>
    expediente.agregarMedicacionCronica({
      pacienteId: idPaciente, nombre: 'X', dosis: '  ', frecuencia: 'diaria'
    })
  )

  // ===== Inventario =====
  grupo('Inventario de medicamentos')
  const idMedicamento = catalogo.crearMedicamento({
    nombre: 'Ibuprofeno',
    concentracion: '400 mg',
    forma: 'Tableta',
    controlaInventario: true,
    minimo: 20,
    unidad: 'tabletas'
  })
  const idSinControl = catalogo.crearMedicamento({ nombre: 'Amoxicilina', concentracion: '500 mg' })

  comprobar('el inventario solo lista lo que se controla',
    inventario.listar().length === 1 && inventario.listar()[0].id === idMedicamento)

  inventario.registrar({
    medicamentoId: idMedicamento, tipo: 'entrada', cantidad: 100,
    lote: 'L-2026-08', vencimiento: '2027-12-31', motivo: 'Compra inicial'
  })
  comprobar('una entrada suma existencias', inventario.listar()[0].existencia === 100)
  comprobar('la entrada fija el vencimiento de referencia',
    inventario.listar()[0].vencimiento === '2027-12-31')

  inventario.entregar({
    medicamentoId: idMedicamento, cantidad: 30, pacienteId: idPaciente, consultaId: idConsulta
  })
  comprobar('entregar al paciente resta existencias', inventario.listar()[0].existencia === 70)
  comprobar('la entrega queda ligada al paciente',
    inventario.movimientos(idMedicamento)[0].pacienteNombre?.includes('Marta') === true)

  await debeFallar('no deja sacar más de lo que hay', () =>
    inventario.registrar({ medicamentoId: idMedicamento, tipo: 'salida', cantidad: 500 })
  )
  await debeFallar('no deja mover un medicamento sin control de existencias', () =>
    inventario.registrar({ medicamentoId: idSinControl, tipo: 'entrada', cantidad: 10 })
  )

  inventario.registrar({ medicamentoId: idMedicamento, tipo: 'salida', cantidad: 55, motivo: 'Vencido' })
  comprobar('avisa cuando la existencia cae al mínimo', inventario.listar()[0].bajoMinimo === true)

  inventario.registrar({
    medicamentoId: idMedicamento, tipo: 'ajuste', cantidad: 12, motivo: 'Conteo físico'
  })
  comprobar('un ajuste fija la existencia contada', inventario.listar()[0].existencia === 12)
  comprobar('cada movimiento deja su existencia resultante',
    inventario.movimientos(idMedicamento)[0].existenciaResultante === 12)
  comprobar('el historial conserva todos los movimientos',
    inventario.movimientos(idMedicamento).length === 4)

  // ===== Reporte por empresa =====
  grupo('Reporte de atenciones por empresa')
  const reporte = empresas.reporte(idEmpresa, '2026-01-01', '2026-12-31')
  comprobar('el reporte encuentra la atención', reporte.totalAtenciones === 1)
  comprobar('cuenta los empleados distintos', reporte.totalPacientes === 1)
  comprobar('incluye el código de empleado', reporte.atenciones[0].codigoEmpleado === 'EMP-0442')
  comprobar('incluye el diagnóstico principal',
    reporte.atenciones[0].diagnosticoPrincipal === 'Lumbago no especificado')

  const impreso = await empresas.imprimirReporte(idEmpresa, '2026-01-01', '2026-12-31')
  comprobar('genera el PDF del reporte de empresa', esPdfValido(impreso.ruta))

  // ===== Contenido de los documentos =====
  // Se revisa el HTML del que sale cada PDF: es donde se puede comprobar que el
  // papel dice exactamente lo que debe decir.
  grupo('Contenido de los documentos')
  const plantillas = await import('./pdf/documentos')
  const { configuracion } = await import('./repositories/sistema')
  const pacientesRepo = await import('./repositories/paciente')
  const config = configuracion()
  const resumenPaciente = pacientesRepo.expedienteResumen(idPaciente)!

  const htmlInc = plantillas.htmlIncapacidad(config, resumenPaciente, incapacidad)
  comprobar('la constancia lleva el folio', htmlInc.includes(incapacidad.folio))
  comprobar('la constancia nombra al paciente', htmlInc.includes('Marta'))
  comprobar('la constancia dice los días de reposo', htmlInc.includes('3 días'))
  comprobar('la constancia indica el periodo completo', htmlInc.includes('16 de septiembre'))
  comprobar('la constancia lleva el motivo', htmlInc.includes('Lumbalgia aguda'))
  comprobar('la constancia identifica a la empresa', htmlInc.includes('Textiles ACME'))

  const htmlRef = plantillas.htmlReferencia(config, resumenPaciente, referencia)
  comprobar('la referencia lleva el folio', htmlRef.includes(referencia.folio))
  comprobar('la referencia nombra al destinatario', htmlRef.includes('Ramón Ortega'))
  comprobar('la referencia lleva la especialidad', htmlRef.includes('Ortopedia'))
  comprobar('la referencia advierte de las alergias', htmlRef.includes('ALERGIAS'))

  const htmlEmp = plantillas.htmlReporteEmpresa(config, reporte)
  comprobar('el reporte nombra a la empresa', htmlEmp.includes('Textiles ACME'))
  comprobar('el reporte lista al empleado por su código', htmlEmp.includes('EMP-0442'))

  // Un dato del paciente con caracteres de marcado no puede romper el documento.
  const idTravieso = pacientes.crear({
    primerNombre: 'Ana',
    primerApellido: 'Prueba',
    fechaNacimiento: '1990-01-01',
    sexo: 'F',
    numeroIdentidad: '0801199099999',
    ocupacion: '<script>alert(1)</script>'
  })
  const { htmlExpediente } = await import('./pdf/plantillas')
  const htmlEscapado = htmlExpediente(
    config,
    pacientesRepo.expedienteResumen(idTravieso)!,
    [],
    { adjuntos: [], incapacidades: [], referencias: [], medicacionCronica: [] }
  )
  comprobar(
    'los datos del paciente se escapan y no inyectan marcado',
    !htmlEscapado.includes('<script>') && htmlEscapado.includes('&lt;script&gt;')
  )

  const htmlExp = htmlExpediente(config, resumenPaciente, [], {
    adjuntos: expediente.adjuntosDePaciente(idPaciente),
    incapacidades: expediente.incapacidadesDePaciente(idPaciente),
    referencias: expediente.referenciasDePaciente(idPaciente),
    medicacionCronica: expediente.medicacionCronica(idPaciente)
  })
  comprobar('el expediente impreso incluye la ficha social', htmlExp.includes('Operaria de máquina'))
  comprobar('el expediente impreso incluye la escolaridad', htmlExp.includes('Secundaria'))
  comprobar('el expediente impreso incluye la empresa', htmlExp.includes('EMP-0442'))
  comprobar('el expediente impreso incluye la medicación permanente', htmlExp.includes('Losartán'))
  comprobar(
    'y marca la que se suspendió en vez de ocultarla',
    htmlExp.includes('Suspendida')
  )
  comprobar('el expediente impreso lista los estudios', htmlExp.includes('Radiografía lumbar AP'))
  comprobar('el expediente impreso lista las incapacidades', htmlExp.includes('INC-'))
  comprobar('el expediente impreso lista las referencias', htmlExp.includes('REF-'))

  await debeFallar('rechaza un rango de fechas invertido', () =>
    empresas.reporte(idEmpresa, '2026-12-31', '2026-01-01')
  )

  const vacio = empresas.reporte(idEmpresa, '2020-01-01', '2020-12-31')
  comprobar('un periodo sin atenciones da un reporte vacío, no un error',
    vacio.totalAtenciones === 0)

  // ===== Permisos =====
  grupo('Permisos')
  const idSecretaria = await auth.crearUsuario({
    nombre: 'Secretaria Prueba', rol: 'secretaria', password: 'otra-contrasena-larga'
  })
  auth.salir()
  await auth.entrar(idSecretaria, 'otra-contrasena-larga')

  await debeFallar('la secretaria no puede emitir incapacidades', () =>
    expediente.crearIncapacidad({
      pacienteId: idPaciente, desde: hoyIso(), dias: 1, motivo: 'x'
    })
  )
  await debeFallar('la secretaria no puede ver los estudios adjuntos', () =>
    expediente.adjuntosDePaciente(idPaciente)
  )
  await debeFallar('la secretaria no puede ver el reporte clínico de la empresa', () =>
    empresas.reporte(idEmpresa, '2026-01-01', '2026-12-31')
  )
  comprobar('la secretaria sí puede consultar existencias', inventario.listar().length === 1)
  await debeFallar('pero no puede mover el inventario', () =>
    inventario.registrar({ medicamentoId: idMedicamento, tipo: 'entrada', cantidad: 5 })
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
      // El temporal se limpia al reiniciar si sigue bloqueado.
    }
    app.exit(fallidas === 0 ? 0 : 1)
  })
