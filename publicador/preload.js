const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('publicador', {
  estado: () => ipcRenderer.invoke('estado'),
  publicar: (datos) => ipcRenderer.invoke('publicar', datos),
  abrir: (url) => ipcRenderer.invoke('abrir', url),
  codigos: (id) => ipcRenderer.invoke('codigos', id),
  alLog: (fn) => ipcRenderer.on('log', (_e, texto) => fn(texto))
})
