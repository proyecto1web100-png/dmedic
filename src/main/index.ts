import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'node:path'
import { abrirBaseDatos, cerrarBaseDatos } from './db/conexion'
import { registrarCanales } from './ipc'
import * as backups from './services/backups'
import * as actualizaciones from './services/actualizaciones'

const esDesarrollo = !app.isPackaged

let ventanaPrincipal: BrowserWindow | null = null

function crearVentana(): void {
  ventanaPrincipal = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f6f8f9',
    title: 'DMedic',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // La ventana no puede tocar Node ni el sistema de archivos: todo pasa por IPC.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false,
      spellcheck: true
    }
  })

  ventanaPrincipal.on('ready-to-show', () => {
    ventanaPrincipal?.maximize()
    ventanaPrincipal?.show()
  })

  // Ningun enlace puede abrir otra ventana de la aplicacion.
  ventanaPrincipal.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Y la ventana principal nunca navega fuera de la propia aplicacion.
  ventanaPrincipal.webContents.on('will-navigate', (evento, url) => {
    const destino = new URL(url)
    const permitido =
      destino.protocol === 'file:' || (esDesarrollo && destino.hostname === 'localhost')
    if (!permitido) evento.preventDefault()
  })

  const servidorDev = process.env['ELECTRON_RENDERER_URL']
  if (esDesarrollo && servidorDev) {
    ventanaPrincipal.loadURL(servidorDev)
  } else {
    ventanaPrincipal.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Una sola instancia: dos procesos escribiendo la misma base es una fuente
// segura de corrupcion y de datos perdidos.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!ventanaPrincipal) return
    if (ventanaPrincipal.isMinimized()) ventanaPrincipal.restore()
    ventanaPrincipal.focus()
  })

  app.whenReady().then(async () => {
    try {
      abrirBaseDatos()
    } catch (error) {
      // Sin base de datos no hay nada que hacer: se explica el motivo y se sale,
      // en lugar de abrir una ventana que fallaría en cada operación.
      dialog.showErrorBox(
        'No se pudo abrir la información de DMedic',
        (error as Error).message
      )
      app.exit(1)
      return
    }

    registrarCanales()
    actualizaciones.configurar()
    crearVentana()

    try {
      const resultado = await backups.crearDiarioSiHaceFalta()
      if (resultado) console.log('Backup diario creado:', resultado.ruta)
    } catch (error) {
      console.error('No se pudo crear el backup diario:', error)
    }

    actualizaciones.buscarAlArrancar()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana()
    })
  })
}

let cerrando = false

// Backup de cierre: el ultimo trabajo del dia tambien queda respaldado.
app.on('before-quit', async (evento) => {
  if (cerrando) return
  evento.preventDefault()
  cerrando = true
  try {
    await backups.crear('cierre')
  } catch (error) {
    console.error('No se pudo crear el backup de cierre:', error)
  } finally {
    cerrarBaseDatos()
    // La actualización se aplica al final, con los datos ya respaldados y la
    // base cerrada: nunca mientras el programa está en uso.
    if (actualizaciones.hayInstalacionPendiente()) {
      actualizaciones.aplicarActualizacion()
    } else {
      app.exit(0)
    }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
