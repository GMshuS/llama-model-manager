const electron = require('electron')
const { app, nativeImage } = electron
const fs = require('fs')
const path = require('path')

const assetsDir = __dirname
const svgPath = path.join(assetsDir, 'tray-icon.svg')
const pngPath = path.join(assetsDir, 'tray-icon.png')

app.whenReady().then(() => {
  const svg = fs.readFileSync(svgPath, 'utf-8')
  const image = nativeImage.createFromDataURL('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'))
  
  const resized = image.resize({ width: 256, height: 256 })
  fs.writeFileSync(pngPath, resized.toPNG())
  console.log('✅ Created high-quality tray-icon.png (256x256)')
  
  app.quit()
})
