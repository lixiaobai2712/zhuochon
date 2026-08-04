// 生成托盘图标 resources/icon.png（纯 Node，无依赖）
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

let CRC_TABLE
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLE[n] = c
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

// 画一个橙色的圆（带一点径向渐变），其余透明
function makeIcon(size) {
  const raw = Buffer.alloc(size * (1 + size * 4))
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.42
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4)
    raw[rowStart] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const d = Math.sqrt(dx * dx + dy * dy)
      const idx = rowStart + 1 + x * 4
      if (d <= r) {
        const t = d / r
        raw[idx] = 255
        raw[idx + 1] = Math.round(120 + 90 * t)
        raw[idx + 2] = Math.round(60 + 60 * t)
        raw[idx + 3] = 255
      } else {
        raw[idx + 3] = 0
      }
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return png
}

const size = Number(process.argv[2] || 32)
const out = path.resolve(process.cwd(), 'resources', 'icon.png')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, makeIcon(size))
console.log('icon written to', out)
