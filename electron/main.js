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
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'tray-icon.ico')
    : path.join(__dirname, '..', 'assets', 'tray-icon.ico')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
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
  let icon = nativeImage.createEmpty()
  
  try {
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'assets', 'tray-icon.ico')
      : path.join(__dirname, '..', 'assets', 'tray-icon.ico')
    
    console.log('🔍 Tray icon path:', iconPath)
    console.log('📦 Is packaged:', app.isPackaged)
    
    icon = nativeImage.createFromPath(iconPath)
    
    if (icon.isEmpty()) {
      console.warn('⚠️ Icon loaded but is empty')
    } else {
      console.log('✅ Icon loaded successfully, size:', icon.getSize())
    }
  } catch (err) {
    console.warn('⚠️ Failed to load tray icon:', err.message)
  }
  
  tray = new Tray(icon)
  tray.setToolTip('llama.cpp Manager')

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

  // 传递 userData 路径给服务器，用于打包后存储用户数据
  const userDataPath = app.getPath('userData')
  process.env.ELECTRON_USER_DATA = userDataPath
  console.log('📁 Electron userData path:', userDataPath)

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
