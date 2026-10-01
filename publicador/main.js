// Panel de publicacion de DMedic. Herramienta interna del administrador:
// NO forma parte de la aplicacion que instala la clinica. El instalador solo
// empaqueta `out/**` y `package.json` (ver electron-builder.yml), asi que nada
// de esta carpeta puede llegar al cliente.
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { spawn } = require('node:child_process')
const { createHmac } = require('node:crypto')
const path = require('node:path')
const fs = require('node:fs')

const RAIZ = path.resolve(__dirname, '..')
const RUTA_PACKAGE = path.join(RAIZ, 'package.json')
const RUTA_BUILDER = path.join(RAIZ, 'electron-builder.yml')
const RUTA_TOKEN = path.join(__dirname, 'token.txt')
const RUTA_SEMILLA = path.join(__dirname, 'semilla.txt')

let ventana = null

function log(texto) {
  if (ventana && !ventana.isDestroyed()) ventana.webContents.send('log', texto)
}

function leerVersion() {
  const bruto = fs.readFileSync(RUTA_PACKAGE, 'utf8')
  const m = bruto.match(/"version"\s*:\s*"([^"]+)"/)
  if (!m) throw new Error('No se encontro el campo "version" en package.json')
  return m[1]
}

function escribirVersion(nueva) {
  const bruto = fs.readFileSync(RUTA_PACKAGE, 'utf8')
  // Se reemplaza solo el valor para no reformatear el archivo entero.
  fs.writeFileSync(RUTA_PACKAGE, bruto.replace(/("version"\s*:\s*")[^"]+(")/, `$1${nueva}$2`), 'utf8')
}

function leerRepositorio() {
  const bruto = fs.readFileSync(RUTA_BUILDER, 'utf8')
  const owner = bruto.match(/^\s*owner:\s*(\S+)\s*$/m)
  const repo = bruto.match(/^\s*repo:\s*(\S+)\s*$/m)
  if (!owner || !repo) throw new Error('No se pudo leer owner/repo de electron-builder.yml')
  return { owner: owner[1], repo: repo[1] }
}

function leerToken() {
  if (fs.existsSync(RUTA_TOKEN)) {
    const guardado = fs.readFileSync(RUTA_TOKEN, 'utf8').trim()
    if (guardado) return guardado
  }
  return (process.env.GH_TOKEN || '').trim() || null
}

function esVersionMayor(nueva, actual) {
  const a = nueva.split('.').map(Number)
  const b = actual.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true
    if (a[i] < b[i]) return false
  }
  return false
}

// Ejecuta un comando mostrando su salida en vivo. Rechaza si termina mal.
function ejecutar(comando, argumentos, token) {
  return new Promise((resolve, reject) => {
    const proceso = spawn(comando, argumentos, {
      cwd: RAIZ,
      shell: true,
      env: token ? { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token } : process.env
    })
    const volcar = (b) => {
      for (const linea of b.toString().split(/\r?\n/)) if (linea.trim()) log(linea)
    }
    proceso.stdout.on('data', volcar)
    proceso.stderr.on('data', volcar)
    proceso.on('error', reject)
    proceso.on('close', (codigo) => {
      if (codigo === 0) resolve()
      else reject(new Error(`"${comando} ${argumentos.join(' ')}" termino con codigo ${codigo}`))
    })
  })
}

// electron-builder crea el release sin cuerpo. Las notas se escriben despues
// por API: es de ahi de donde electron-updater las lee para mostrarselas al doctor.
async function escribirNotas(version, notas, token) {
  const { owner, repo } = leerRepositorio()
  const cabeceras = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'publicador-dmedic'
  }
  const busqueda = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/tags/v${version}`,
    { headers: cabeceras }
  )
  if (!busqueda.ok) throw new Error(`GitHub no encontro el release v${version} (${busqueda.status})`)
  const release = await busqueda.json()
  const respuesta = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/${release.id}`,
    {
      method: 'PATCH',
      headers: { ...cabeceras, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `DMedic ${version}`, body: notas })
    }
  )
  if (!respuesta.ok) throw new Error(`No se pudieron guardar las notas (${respuesta.status})`)
  return release.html_url
}

// ===== Codigos de activacion =====
//
// Se calculan aqui con la misma semilla y el mismo algoritmo que usa la
// aplicacion (src/main/services/licencia.ts). Por eso este panel NO depende de
// la version instalada en la clinica: mientras la semilla no cambie, un codigo
// generado hoy sirve para cualquier version que se haya compilado con ella.

// Debe coincidir con DURACIONES_PRORROGA en src/main/services/licencia.ts.
const DURACIONES_PRORROGA = [7, 15, 30]

function leerSemilla() {
  if (!fs.existsSync(RUTA_SEMILLA)) return null
  const valor = fs.readFileSync(RUTA_SEMILLA, 'utf8').trim()
  return valor || null
}

/**
 * Deja el ID en la forma exacta que muestra la aplicacion: XXXX-XXXX-XXXX en
 * mayusculas. El codigo se firma sobre ese texto, guiones incluidos, asi que un
 * ID escrito sin guiones o en minusculas produciria un codigo que no sirve.
 */
function normalizarId(texto) {
  const limpio = String(texto || '')
    .toUpperCase()
    .replace(/[^0-9A-F]/g, '')
  if (limpio.length !== 12) return null
  return `${limpio.slice(0, 4)}-${limpio.slice(4, 8)}-${limpio.slice(8, 12)}`
}

function codigoPara(id, dias) {
  const semilla = leerSemilla()
  if (!semilla) throw new Error('Falta publicador/semilla.txt: sin ella no se pueden generar codigos.')
  const mensaje = dias > 0 ? `${id}::${dias}d` : id
  const firma = createHmac('sha256', semilla).update(mensaje).digest('hex').toUpperCase()
  return firma.match(/.{4}/g).slice(0, 4).join('-')
}

ipcMain.handle('codigos', (_evento, textoId) => {
  try {
    const id = normalizarId(textoId)
    if (!id) {
      return {
        ok: false,
        error: 'El ID del equipo son 12 caracteres (0-9 y A-F), como 32B1-0953-9AC9.'
      }
    }
    return {
      ok: true,
      id,
      definitivo: codigoPara(id, 0),
      prorrogas: DURACIONES_PRORROGA.map((dias) => ({ dias, codigo: codigoPara(id, dias) }))
    }
  } catch (error) {
    return { ok: false, error: error.message }
  }
})

ipcMain.handle('estado', () => ({
  version: leerVersion(),
  tieneToken: Boolean(leerToken()),
  tieneSemilla: Boolean(leerSemilla()),
  raiz: RAIZ
}))

ipcMain.handle('publicar', async (_evento, datos) => {
  const { version, notas, token: tokenNuevo } = datos
  const actual = leerVersion()
  try {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('La version debe tener el formato 1.2.3')
    if (!esVersionMayor(version, actual)) throw new Error(`La version ${version} no es mayor que la actual ${actual}`)
    if (!notas.trim()) throw new Error('Escribe las notas de la version')

    if (tokenNuevo && tokenNuevo.trim()) {
      fs.writeFileSync(RUTA_TOKEN, tokenNuevo.trim(), 'utf8')
      log('Token guardado en publicador/token.txt (fuera de git).')
    }
    const token = leerToken()
    if (!token) throw new Error('Falta el token de GitHub')

    log(`Subiendo la version ${actual} a ${version}...`)
    escribirVersion(version)

    log('Compilando y publicando (esto tarda varios minutos)...')
    await ejecutar('npm', ['run', 'publicar'], token)

    log('Guardando las notas en el release...')
    const url = await escribirNotas(version, notas.trim(), token)

    // El repositorio debe quedar marcando la version que se publico.
    try {
      await ejecutar('git', ['add', 'package.json'], null)
      await ejecutar('git', ['commit', '-m', `"Version ${version}"`], null)
      await ejecutar('git', ['push'], null)
      log('package.json confirmado y subido al repositorio.')
    } catch (error) {
      log(`Aviso: la publicacion si funciono, pero git fallo: ${error.message}`)
      log('Confirma package.json a mano cuando puedas.')
    }

    log(`Listo. DMedic ${version} esta publicado.`)
    return { ok: true, version, url }
  } catch (error) {
    // Si algo fallo despues de tocar package.json, se devuelve a como estaba.
    if (leerVersion() !== actual) {
      escribirVersion(actual)
      log(`package.json devuelto a ${actual}.`)
    }
    log(`ERROR: ${error.message}`)
    return { ok: false, error: error.message }
  }
})

ipcMain.handle('abrir', (_evento, url) => shell.openExternal(url))

app.whenReady().then(() => {
  ventana = new BrowserWindow({
    width: 720,
    height: 780,
    title: 'Publicador DMedic',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  })
  ventana.loadFile(path.join(__dirname, 'index.html'))
})

app.on('window-all-closed', () => app.quit())
