/**
 * Minimal dependency-free PNG decode/encode/crop.
 *
 * Two jobs here:
 *  - derive-palette.mjs decodes the logo to sample the brand green;
 *  - build.mjs crops the Instagram slides to an exact 1080×1350.
 *
 * The crop is not cosmetic: Chromium's --screenshot writes an image the size of
 * the *window*, while only the (smaller) viewport is painted, so a raw capture
 * carries an unpainted strip along the bottom. Instagram needs exact 4:5 frames.
 */
import { inflateSync, deflateSync, crc32 as zlibCrc32 } from 'node:zlib'

const crc32 =
  typeof zlibCrc32 === 'function'
    ? (buf) => zlibCrc32(buf) >>> 0
    : (() => {
        const table = new Uint32Array(256)
        for (let n = 0; n < 256; n++) {
          let c = n
          for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
          table[n] = c >>> 0
        }
        return (buf) => {
          let c = 0xffffffff
          for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
          return (c ^ 0xffffffff) >>> 0
        }
      })()

/** Decode an 8-bit PNG (grey/RGB/palette/grey-alpha/RGBA) to RGBA bytes. */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')

  let width = 0, height = 0, bitDepth = 0, colorType = 0
  let palette = null, trns = null
  const idat = []

  let off = 8
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      if (data[12] !== 0) throw new Error('interlaced PNG not supported')
    } else if (type === 'PLTE') palette = Buffer.from(data)
    else if (type === 'tRNS') trns = Buffer.from(data)
    else if (type === 'IDAT') idat.push(Buffer.from(data))
    else if (type === 'IEND') break

    off += 12 + len
  }

  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`)
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
  if (!channels) throw new Error(`unsupported colour type ${colorType}`)

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(width * height * channels)

  let pos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]
    const line = raw.subarray(pos, pos + stride)
    pos += stride
    const cur = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= channels ? prev[x - channels] : 0
      const v = line[x]
      let val
      switch (filter) {
        case 0: val = v; break
        case 1: val = v + a; break
        case 2: val = v + b; break
        case 3: val = v + ((a + b) >> 1); break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
          val = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
          break
        }
        default: throw new Error(`bad filter ${filter}`)
      }
      cur[x] = val & 0xff
    }
  }

  const pixels = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const s = i * channels
    const d = i * 4
    let r, g, b, a = 255
    if (colorType === 0) { r = g = b = out[s] }
    else if (colorType === 2) { r = out[s]; g = out[s + 1]; b = out[s + 2] }
    else if (colorType === 3) {
      const idx = out[s]
      r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2]
      if (trns && idx < trns.length) a = trns[idx]
    } else if (colorType === 4) { r = g = b = out[s]; a = out[s + 1] }
    else { r = out[s]; g = out[s + 1]; b = out[s + 2]; a = out[s + 3] }
    pixels[d] = r; pixels[d + 1] = g; pixels[d + 2] = b; pixels[d + 3] = a
  }

  return { width, height, pixels }
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Encode RGBA bytes as a PNG (colour type 6, filter 0 on every scanline). */
export function encodePng({ width, height, pixels }) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  ihdr[10] = 0  // deflate
  ihdr[11] = 0  // adaptive filtering
  ihdr[12] = 0  // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Crop to the top-left w×h region. Returns the original if it already fits. */
export function cropPng(buf, w, h) {
  const img = decodePng(buf)
  if (img.width === w && img.height === h) return buf
  if (img.width < w || img.height < h) {
    throw new Error(`cannot crop ${img.width}×${img.height} up to ${w}×${h}`)
  }
  const pixels = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    img.pixels.copy(pixels, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4)
  }
  return encodePng({ width: w, height: h, pixels })
}
