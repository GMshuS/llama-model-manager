import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import net from 'net'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let tray = null
let serverInstance = null
let serverPort = 3001

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    let port = startPort
    const tryPort = (p) => {
      srv.listen(p, () => {
        srv.close(() => resolve(p))
      })
      srv.on('error', () => {
        if (p - startPort < 100) {
          tryPort(p + 1)
        } else {
          reject(new Error('No free port found'))
        }
      })
    }
    tryPort(startPort)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.loadURL(`http://localhost:${serverPort}`)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('llama.cpp Model Manager')

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: '退出', click: () => {
      app.isQuitting = true
      app.quit()
    }},
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow?.show()
  })
}

async function startServer() {
  const portArgIndex = process.argv.indexOf('--port')
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    serverPort = parseInt(process.argv[portArgIndex + 1], 10)
  } else {
    serverPort = await findFreePort(3001)
  }

  const { default: startExpress } = await import('../server/index.js')
  serverInstance = startExpress(serverPort)

  return serverPort
}

ipcMain.on('get-server-port', (event) => {
  event.returnValue = serverPort
})

app.on('ready', async () => {
  Menu.setApplicationMenu(null)
  const port = await startServer()
  createWindow()
  createTray()

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('server-port', port)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  try {
    const { processManager } = await import('../server/services/process-manager.js')
    processManager.stop()
  } catch {}

  if (serverInstance) {
    serverInstance.close()
    serverInstance = null
  }
})

app.on('will-quit', () => {
  if (tray) {
    tray.destroy()
    tray = null
  }
})
