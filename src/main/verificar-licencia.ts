/**
 * Banco de pruebas del periodo de prueba y la activacion: cuenta de 24 horas,
 * codigos de prorroga de 7, 15 y 30 dias, activacion definitiva y resistencia a
 * que alguien borre los datos o atrase el reloj para alargar la prueba.
 *
 *   npm run verificar:licencia
 *
 * Usa una clave de registro propia (DMEDIC_CLAVE_REGISTRO), de modo que nunca
 * toca la activacion real del equipo donde se ejecuta.
 */
import { app } from 'electron'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const carpetaTemporal = mkdtempSync(join(tmpdir(), 'dmedic-licencia-'))
app.setPath('userData', carpetaTemporal)

const CLAVE_PRUEBAS = 'HKCU\\Software\\DMedicPruebas'
process.env.DMEDIC_CLAVE_REGISTRO = CLAVE_PRUEBAS

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

function debeFallar(descripcion: string, operacion: () => unknown): void {
  try {
    operacion()
    comprobar(descripcion, false, 'se esperaba un error y no ocurrió')
  } catch (error) {
    comprobar(descripcion, true, (error as Error).message)
  }
}

function grupo(titulo: string): void {
  console.log(`\n${titulo}`)
}

const RUTA_ESTADO = join(carpetaTemporal, 'licencia.json')
const HORA = 60 * 60 * 1000

function borrarRegistro(): void {
  try {
    // Con la clave ya ausente, "reg delete" escribe en stderr; se silencia todo
    // porque no encontrarla es exactamente el resultado que se busca.
    execFileSync('reg', ['delete', CLAVE_PRUEBAS, '/f'], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'ignore']
    })
  } catch {
    // No existía: es el estado que se quería dejar de todos modos.
  }
}

/** Deja el equipo como recién instalado: sin archivo y sin rastro en el registro. */
function reiniciarTodo(): void {
  if (existsSync(RUTA_ESTADO)) unlinkSync(RUTA_ESTADO)
  borrarRegistro()
}

interface Guardado {
  inicio: string
  ultimoVisto: string
  codigo: string | null
  prorrogaCodigo: string | null
  prorrogaDesde: string | null
  prorrogaDias: number
  manipulado: boolean
}

/** Escribe el estado a mano para simular el paso del tiempo sin esperarlo. */
function sembrarEstado(parcial: Partial<Guardado>): void {
  const ahora = new Date().toISOString()
  const estado: Guardado = {
    inicio: ahora,
    ultimoVisto: ahora,
    codigo: null,
    prorrogaCodigo: null,
    prorrogaDesde: null,
    prorrogaDias: 0,
    manipulado: false,
    ...parcial
  }
  writeFileSync(RUTA_ESTADO, JSON.stringify(estado, null, 2), 'utf8')
  const valor = Buffer.from(JSON.stringify(estado), 'utf8').toString('base64')
  execFileSync(
    'reg',
    ['add', CLAVE_PRUEBAS, '/v', 'Instalacion', '/t', 'REG_SZ', '/d', valor, '/f'],
    { windowsHide: true, stdio: 'ignore' }
  )
}

function haceHoras(horas: number): string {
  return new Date(Date.now() - horas * HORA).toISOString()
}

async function ejecutar(): Promise<void> {
  const licencia = await import('./services/licencia')

  // El modulo cachea el estado en memoria: hay que descartarlo para que vuelva
  // a leer el archivo y el registro que la prueba acaba de sembrar.
  function recargar(): typeof licencia {
    licencia.olvidarEstadoEnMemoria()
    return licencia
  }

  grupo('Identificador y códigos')
  const id = licencia.idEquipo()
  comprobar('el ID del equipo tiene el formato de 3 grupos', /^[0-9A-F]{4}(-[0-9A-F]{4}){2}$/.test(id))
  comprobar('el ID es estable entre llamadas', id === licencia.idEquipo())

  const definitivo = licencia.codigoPara(id)
  comprobar('el código definitivo tiene 4 grupos', /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/.test(definitivo))

  const siete = licencia.codigoPara(id, 7)
  const quince = licencia.codigoPara(id, 15)
  const treinta = licencia.codigoPara(id, 30)
  comprobar('cada duración da un código distinto',
    new Set([definitivo, siete, quince, treinta]).size === 4)
  comprobar('el código de otro equipo no coincide',
    licencia.codigoPara('AAAA-BBBB-CCCC', 7) !== siete)
  comprobar('el mismo ID en minúsculas da el mismo código',
    licencia.codigoPara(id.toLowerCase(), 7) === siete)

  // ===== Prueba inicial =====
  grupo('Periodo de prueba inicial')
  reiniciarTodo()
  let lic = recargar()
  let estado = lic.estado()
  comprobar('un equipo nuevo arranca en prueba, no activado', !estado.activado)
  comprobar('no está bloqueado al primer arranque', !estado.bloqueado)
  comprobar('la prueba inicial dura 24 horas',
    Math.abs(estado.restanteMs - 24 * HORA) < 60_000,
    `restante ${Math.round(estado.restanteMs / 1000)} s`)
  comprobar('todavía no hay prórroga concedida', estado.diasProrroga === 0)

  reiniciarTodo()
  sembrarEstado({ inicio: haceHoras(25), ultimoVisto: haceHoras(1) })
  lic = recargar()
  comprobar('pasadas las 24 horas queda bloqueado', lic.estaBloqueado())
  comprobar('y el estado lo refleja', lic.estado().bloqueado)

  // ===== Prórroga =====
  grupo('Prórroga de días')
  reiniciarTodo()
  sembrarEstado({ inicio: haceHoras(25), ultimoVisto: haceHoras(1) })
  lic = recargar()

  debeFallar('rechaza un código inventado', () => lic.activar('AAAA-BBBB-CCCC-DDDD'))
  debeFallar('rechaza el código de 7 días de otro equipo', () =>
    lic.activar(lic.codigoPara('AAAA-BBBB-CCCC', 7))
  )

  estado = lic.activar(siete)
  comprobar('el código de 7 días desbloquea', !estado.bloqueado)
  comprobar('pero NO activa el programa de por vida', !estado.activado)
  comprobar('concede exactamente 7 días',
    Math.abs(estado.restanteMs - 7 * 24 * HORA) < 60_000,
    `restante ${Math.round(estado.restanteMs / 3600000)} h`)
  comprobar('el estado anota los días concedidos', estado.diasProrroga === 7)
  comprobar('ya no está bloqueado para las operaciones', !lic.estaBloqueado())

  debeFallar('el mismo código de prórroga no se puede reutilizar', () => lic.activar(siete))

  // Se puede conceder otra prórroga distinta cuando la primera se agota.
  estado = lic.activar(quince)
  comprobar('un código de otra duración sí concede más días', estado.diasProrroga === 15)
  comprobar('y recalcula el tiempo restante',
    Math.abs(estado.restanteMs - 15 * 24 * HORA) < 60_000)

  reiniciarTodo()
  sembrarEstado({
    inicio: haceHoras(24 * 40),
    ultimoVisto: haceHoras(1),
    prorrogaCodigo: siete.replace(/-/g, ''),
    prorrogaDesde: haceHoras(24 * 8),
    prorrogaDias: 7
  })
  lic = recargar()
  comprobar('una prórroga agotada vuelve a bloquear', lic.estaBloqueado())

  // ===== Activación definitiva =====
  grupo('Activación definitiva')
  reiniciarTodo()
  sembrarEstado({ inicio: haceHoras(25), ultimoVisto: haceHoras(1) })
  lic = recargar()

  estado = lic.activar(definitivo)
  comprobar('el código definitivo activa el programa', estado.activado)
  comprobar('y deja de haber cuenta regresiva', estado.expiraEn === null)
  comprobar('nunca vuelve a bloquear', !lic.estaBloqueado())
  comprobar('estaActivado() lo confirma', lic.estaActivado())

  const conGuiones = definitivo.toLowerCase().replace(/-/g, ' ')
  reiniciarTodo()
  sembrarEstado({ inicio: haceHoras(25), ultimoVisto: haceHoras(1) })
  lic = recargar()
  comprobar('acepta el código escrito con espacios y en minúsculas',
    lic.activar(conGuiones).activado)

  // ===== Resistencia =====
  grupo('Resistencia a que se alargue la prueba')

  // Borrar la carpeta de datos: el registro conserva el arranque original.
  reiniciarTodo()
  sembrarEstado({ inicio: haceHoras(25), ultimoVisto: haceHoras(1) })
  unlinkSync(RUTA_ESTADO)
  lic = recargar()
  comprobar('borrar los datos de la aplicación no reinicia la prueba', lic.estaBloqueado())

  // Borrar el registro: el archivo conserva el arranque original.
  reiniciarTodo()
  sembrarEstado({ inicio: haceHoras(25), ultimoVisto: haceHoras(1) })
  borrarRegistro()
  lic = recargar()
  comprobar('borrar la entrada del registro tampoco la reinicia', lic.estaBloqueado())

  // Atrasar el reloj: se detecta y la prueba se da por consumida.
  reiniciarTodo()
  sembrarEstado({ inicio: haceHoras(2), ultimoVisto: new Date(Date.now() + 5 * HORA).toISOString() })
  lic = recargar()
  comprobar('atrasar el reloj da la prueba por consumida', lic.estado().bloqueado)

  // Y ni aun así deja de aceptar el código correcto.
  comprobar('con el reloj manipulado el código definitivo sigue funcionando',
    lic.activar(definitivo).activado)

  reiniciarTodo()
}

app
  .whenReady()
  .then(ejecutar)
  .catch((error) => {
    fallidas++
    console.error('\nError no controlado durante las pruebas:', error)
  })
  .finally(() => {
    borrarRegistro()
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
