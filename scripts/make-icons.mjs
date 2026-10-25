// One-off: generate app icons and a small header logo from public/shlomot.png
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const src = 'public/shlomot.png'
mkdirSync('public/icons', { recursive: true })

const sizes = [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/apple-touch-icon.png', 180],
  ['public/icons/logo-200.png', 200],
  ['public/icons/favicon-48.png', 48],
]

for (const [out, size] of sizes) {
  await sharp(src).resize(size, size).png({ compressionLevel: 9, palette: true }).toFile(out)
  console.log('wrote', out)
}
