// Genera la instruccion SQL para restablecer al administrador principal de DMedic.
// Uso: node rescate-dmedic.cjs "ContraseñaTemporal"
const { hash, verify, Algorithm } = require('@node-rs/argon2')
const { randomBytes } = require('node:crypto')
const { writeFileSync } = require('node:fs')

// Mismos parametros que src/main/security/hash.ts
const OPCIONES = { algorithm: Algorithm.Argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }

function generarCodigo() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(20)
  const grupos = []
  for (let g = 0; g < 4; g++) {
    let grupo = ''
    for (let i = 0; i < 5; i++) grupo += alfabeto[bytes[g * 5 + i] % alfabeto.length]
    grupos.push(grupo)
  }
  return grupos.join('-')
}

;(async () => {
  const password = process.argv[2]
  if (!password || password.length < 8) {
    console.error('Uso: node rescate-dmedic.cjs "ContraseñaTemporal"  (mínimo 8 caracteres)')
    process.exit(1)
  }
  const codigo = generarCodigo()
  const codigoNormalizado = codigo.replace(/[^A-Z0-9]/g, '')
  const passwordHash = await hash(password, OPCIONES)
  const recuperacionHash = await hash(codigoNormalizado, OPCIONES)

  if (!(await verify(passwordHash, password)) || !(await verify(recuperacionHash, codigoNormalizado))) {
    throw new Error('La verificación de los hashes falló')
  }

  const sql =
    `UPDATE usuario SET password_hash = '${passwordHash}', debe_cambiar_password = 1, ` +
    `intentos_fallidos = 0, bloqueado_hasta = NULL, recuperacion_hash = '${recuperacionHash}', ` +
    `recuperacion_usada = 0 WHERE id = (SELECT MIN(id) FROM usuario);\n`

  writeFileSync('rescate-dmedic.sql', sql)
  console.log('\nListo. Archivo para el cliente: rescate-dmedic.sql')
  console.log('Contraseña temporal:            ' + password)
  console.log('NUEVO código de recuperación:   ' + codigo)
  console.log('\nDicta la contraseña y el código por llamada; no los envíes junto al archivo.\n')
})().catch((e) => { console.error(e); process.exit(1) })
