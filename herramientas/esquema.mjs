// Inspector rapido del esquema de la base real. Herramienta interna: no se
// empaqueta. Se ejecuta con Electron porque better-sqlite3 esta compilado
// contra Electron, no contra Node.
//
//   npx electron herramientas/esquema.mjs
import { app } from 'electron'
import BetterSqlite3 from 'better-sqlite3'
import { join } from 'node:path'

app.setName('dmedic')

app.whenReady().then(() => {
  const ruta = join(app.getPath('userData'), 'data', 'dmedic.db')
  const db = new BetterSqlite3(ruta, { readonly: true })

  const version = db.prepare('SELECT MAX(version) AS v FROM migracion').get().v
  console.log('BASE:', ruta)
  console.log('VERSION_ESQUEMA:', version)

  const tablas = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((f) => f.name)
  console.log('TABLAS:', tablas.join(', '))

  for (const t of ['empresa', 'adjunto', 'incapacidad', 'referencia', 'medicacion_cronica', 'movimiento_inventario']) {
    if (!tablas.includes(t)) {
      console.log(`FALTA TABLA: ${t}`)
      continue
    }
    const cols = db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name)
    console.log(`  ${t}: ${cols.join(', ')}`)
  }

  for (const t of ['paciente', 'medicamento', 'usuario']) {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name)
    console.log(`  ${t}: ${cols.join(', ')}`)
  }

  db.close()
  app.exit(0)
})
