// Render public/og-image.svg -> public/og-image.png (1200x630)
// Run with: npm run assets:og
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const input = resolve(root, 'public/og-image.svg')
const output = resolve(root, 'public/og-image.png')

try {
  const svg = await readFile(input)
  await sharp(svg, { density: 200 })
    .resize(1200, 630, { fit: 'fill' })
    .png({ quality: 92, compressionLevel: 9 })
    .toFile(output)
  console.log(`✓ og-image.png written to ${output}`)
} catch (err) {
  console.error('Failed to render og-image.png:', err.message)
  process.exitCode = 1
}
