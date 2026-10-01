// Generador de codigos de activacion de DMedic. Herramienta interna del
// administrador: NO se empaqueta en el instalador (electron-builder solo
// incluye out/** y package.json).
//
//   npm run codigo -- A1B2-C3D4-E5F6        activacion definitiva
//   npm run codigo -- A1B2-C3D4-E5F6 7      prorroga de 7 dias de prueba
//
// El ID de equipo lo muestra la propia aplicacion en la pantalla de "Periodo
// de prueba finalizado". El codigo que sale de aqui solo sirve en ese equipo.
import { createHmac } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

// La misma semilla con la que se compilo el instalador: publicador/semilla.txt,
// que esta fuera de git. Si se pierde, los codigos ya entregados dejan de poder
// regenerarse; guarde una copia en lugar seguro.
const RUTA_SEMILLA = new URL('../publicador/semilla.txt', import.meta.url)

if (!existsSync(RUTA_SEMILLA)) {
  console.error('Falta publicador/semilla.txt: sin ella no se pueden generar codigos.')
  process.exit(1)
}

const SEMILLA_ACTIVACION = readFileSync(RUTA_SEMILLA, 'utf8').trim()

// Debe coincidir con DURACIONES_PRORROGA en src/main/services/licencia.ts.
const DURACIONES = [7, 15, 30]

const id = (process.argv[2] ?? '').trim().toUpperCase()
const dias = Number(process.argv[3] ?? 0)

if (!id) {
  console.error('Uso: npm run codigo -- <ID-DEL-EQUIPO> [dias]')
  console.error('  npm run codigo -- A1B2-C3D4-E5F6        activacion definitiva')
  console.error('  npm run codigo -- A1B2-C3D4-E5F6 7      prorroga de 7 dias')
  process.exit(1)
}

if (dias !== 0 && !DURACIONES.includes(dias)) {
  console.error(`Los dias solo pueden ser ${DURACIONES.join(', ')} (o nada para activar de por vida).`)
  process.exit(1)
}

const mensaje = dias > 0 ? `${id}::${dias}d` : id
const firma = createHmac('sha256', SEMILLA_ACTIVACION).update(mensaje).digest('hex').toUpperCase()
const codigo = firma.match(/.{4}/g).slice(0, 4).join('-')

console.log('')
console.log('  Equipo : ' + id)
console.log('  Tipo   : ' + (dias > 0 ? `prueba de ${dias} dias` : 'activacion definitiva'))
console.log('  Codigo : ' + codigo)
console.log('')
