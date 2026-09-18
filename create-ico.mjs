import icojs from 'icojs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sizes = [16, 32, 48, 64, 128, 256]

const pngFiles = sizes.map(size => {
  const pngPath = path.join(__dirname, 'assets', `icon-${size}x${size}.png`)
  return {
    data: fs.readFileSync(pngPath),
    width: size,
    height: size
  }
})

const icoBuffer = await icojs.encodeIco(pngFiles)
const icoPath = path.join(__dirname, 'assets', 'app.ico')
fs.writeFileSync(icoPath, icoBuffer)
console.log('✅ Created app.ico with sizes:', sizes.join(', '))
