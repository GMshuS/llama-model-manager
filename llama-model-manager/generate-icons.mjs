import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const svgPath = path.join(__dirname, 'assets', 'tray-icon.svg')

const sizes = [16, 32, 48, 64, 128, 256]
const svg = fs.readFileSync(svgPath, 'utf-8')

for (const size of sizes) {
  const pngPath = path.join(__dirname, 'assets', `icon-${size}x${size}.png`)
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(pngPath)
  console.log(`✅ Created icon-${size}x${size}.png`)
}
