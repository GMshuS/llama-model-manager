import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const svgPath = path.join(__dirname, 'assets', 'tray-icon.svg')
const pngPath = path.join(__dirname, 'assets', 'tray-icon.png')

const svg = fs.readFileSync(svgPath, 'utf-8')

await sharp(Buffer.from(svg))
  .resize(256, 256)
  .png()
  .toFile(pngPath)

console.log('✅ Created high-quality tray-icon.png (256x256)')
