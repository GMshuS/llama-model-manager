import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  serverPort: ipcRenderer.sendSync('get-server-port'),
  onServerPort: (callback) => {
    ipcRenderer.on('server-port', (_event, port) => callback(port))
  },
})
