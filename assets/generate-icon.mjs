import electron from 'electron'
const { app, nativeImage } = electron
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const svgPath = path.join(__dirname, 'tray-icon.svg')
const pngPath = path.join(__dirname, 'tray-icon.png')

app.whenReady().then(() => {
  const svg = fs.readFileSync(svgPath, 'utf-8')
  const image = nativeImage.createFromDataURL('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'))
  
  const resized = image.resize({ width: 256, height: 256 })
  fs.writeFileSync(pngPath, resized.toPNG())
  console.log('✅ Created high-quality tray-icon.png (256x256)')
  
  app.quit()
})
