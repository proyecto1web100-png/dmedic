/**
 * Prepara un perfil de DMedic con datos de ejemplo para revisar la interfaz sin
 * tocar la informacion real de la clinica. Herramienta interna del desarrollo:
 * no se empaqueta en el instalador.
 *
 *   npm run demo:sembrar          crea el perfil en %TEMP%/dmedic-demo
 *   npm run demo                  abre la aplicacion contra ese perfil
 *
 * La contrasena del perfil de ejemplo es "demo-dmedic-2026".
 */
import { app } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const CARPETA_DEMO = join(tmpdir(), 'dmedic-demo')
export const PASSWORD_DEMO = 'demo-dmedic-2026'

mkdirSync(CARPETA_DEMO, { recursive: true })
app.setPath('userData', CARPETA_DEMO)
app.on('window-all-closed', () => {})

async function sembrar(): Promise<void> {
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
    nombreDoctor: 'Dra. Danna Suseth López',
    nombreClinica: 'Clínica DMedic',
    password: PASSWORD_DEMO
  })

  const idEmpresa = empresas.crear({
    codigo: 'ACME',
    nombre: 'Textiles ACME S. de R.L.',
    contacto: 'Recursos Humanos',
    telefono: '2550-1234',
    correo: 'rrhh@acme.hn'
  })
  empresas.crear({ codigo: 'LOGIS', nombre: 'Transportes Logis', contacto: 'Gerencia' })

  const idPaciente = pacientes.crear({
    primerNombre: 'Marta',
    segundoNombre: 'Elena',
    primerApellido: 'Núñez',
    segundoApellido: 'Reyes',
    fechaNacimiento: '1985-04-12',
    sexo: 'F',
    numeroIdentidad: '0801198512345',
    telefono: '9988-7766',
    direccion: 'Col. Kennedy, bloque 4',
    tipoSangre: 'O+',
    nivelEducativo: 'secundaria',
    ocupacion: 'Operaria de máquina',
    estadoCivil: 'union_libre',
    historiador: 'La propia paciente',
    empresaId: idEmpresa,
    codigoEmpleado: 'EMP-0442',
    contactos: [{ nombre: 'José Núñez', telefono: '9911-2233', parentesco: 'Hermano' }],
    alergiasIniciales: [
      { sustancia: 'Penicilina', reaccion: 'Urticaria generalizada', gravedad: 'grave' }
    ],
    antecedentesIniciales: [
      { tipo: 'personal_patologico', descripcion: 'Hipertensión arterial desde 2020' },
      { tipo: 'familiar', descripcion: 'Madre con diabetes tipo 2' },
      { tipo: 'quirurgico', descripcion: 'Cesárea en 2014' }
    ]
  })

  const idConsulta = consultas.crear({
    pacienteId: idPaciente,
    motivo: 'Dolor lumbar de tres días de evolución',
    sintomas: 'Dolor punzante en región lumbar baja, irradiado a glúteo derecho.',
    exploracion: 'Contractura paravertebral. Lasègue negativo. Fuerza conservada.',
    tratamiento: 'Reposo relativo, calor local y analgesia.',
    recomendaciones: 'Evitar cargar peso. Volver si aparece debilidad en la pierna.',
    sinProximaCita: true,
    signos: {
      peso: 68,
      altura: 160,
      imc: null,
      presionSistolica: 132,
      presionDiastolica: 86,
      temperatura: 36.8,
      frecuenciaCardiaca: 78,
      frecuenciaRespiratoria: 16,
      saturacionOxigeno: 98,
      glucosa: null
    },
    diagnosticos: [
      { codigoCie10: 'M54.5', descripcion: 'Lumbago no especificado', esPrincipal: true, nota: null }
    ],
    medicamentos: [
      {
        medicamentoId: null,
        nombre: 'Ibuprofeno',
        concentracion: '400 mg',
        forma: 'Tableta',
        dosis: '1 tableta',
        frecuencia: 'Cada 8 horas',
        duracion: '5 días',
        via: 'Oral',
        indicaciones: 'Tomar con alimentos'
      }
    ]
  })

  expediente.agregarMedicacionCronica({
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

  // Un estudio de ejemplo, con su interpretacion escrita.
  const rutaEstudio = join(CARPETA_DEMO, 'hemograma-demo.pdf')
  writeFileSync(rutaEstudio, `%PDF-1.4\n${'hemograma de ejemplo '.repeat(120)}`)
  expediente.agregarAdjunto(
    {
      pacienteId: idPaciente,
      consultaId: idConsulta,
      categoria: 'laboratorio',
      titulo: 'Hemograma completo',
      descripcion: 'Leucocitos ligeramente elevados. Resto de series dentro de rangos normales.',
      fechaEstudio: hoyIso()
    },
    rutaEstudio
  )

  await expediente.crearIncapacidad({
    pacienteId: idPaciente,
    consultaId: idConsulta,
    desde: hoyIso(),
    dias: 3,
    motivo: 'Lumbalgia aguda que impide bipedestación prolongada',
    codigoCie10: 'M54.5',
    diagnostico: 'Lumbago no especificado'
  })

  await expediente.crearReferencia({
    pacienteId: idPaciente,
    consultaId: idConsulta,
    dirigidaA: 'Dr. Ramón Ortega',
    especialidad: 'Ortopedia',
    institucion: 'Hospital Regional',
    motivo: 'Lumbalgia persistente sin respuesta a manejo conservador',
    resumenClinico: 'Paciente de 41 años con dolor lumbar de tres días.',
    hallazgos: 'Exploración sin déficit neurológico.',
    urgente: false
  })

  // Inventario con un medicamento bajo mínimo y otro por vencer, para ver los avisos.
  const idIbuprofeno = catalogo.crearMedicamento({
    nombre: 'Ibuprofeno',
    concentracion: '400 mg',
    forma: 'Tableta',
    controlaInventario: true,
    minimo: 50,
    unidad: 'tabletas'
  })
  inventario.registrar({
    medicamentoId: idIbuprofeno,
    tipo: 'entrada',
    cantidad: 200,
    lote: 'L-2026-08',
    vencimiento: '2027-11-30',
    motivo: 'Compra inicial'
  })
  inventario.entregar({
    medicamentoId: idIbuprofeno,
    cantidad: 160,
    pacienteId: idPaciente,
    consultaId: idConsulta
  })

  const idAcetaminofen = catalogo.crearMedicamento({
    nombre: 'Acetaminofén',
    concentracion: '500 mg',
    forma: 'Tableta',
    controlaInventario: true,
    minimo: 30,
    unidad: 'tabletas'
  })
  const pronto = new Date()
  pronto.setDate(pronto.getDate() + 25)
  inventario.registrar({
    medicamentoId: idAcetaminofen,
    tipo: 'entrada',
    cantidad: 300,
    lote: 'L-2026-03',
    vencimiento: pronto.toISOString().slice(0, 10),
    motivo: 'Compra'
  })

  cerrarBaseDatos()
  console.log(`\nPerfil de ejemplo listo en: ${CARPETA_DEMO}`)
  console.log(`Usuario: Dra. Danna Suseth López   Contraseña: ${PASSWORD_DEMO}\n`)
}

app
  .whenReady()
  .then(sembrar)
  .catch((error) => console.error('No se pudo sembrar el perfil de ejemplo:', error))
  .finally(() => app.exit(0))
