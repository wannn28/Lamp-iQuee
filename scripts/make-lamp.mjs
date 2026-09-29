/**
 * Writes public/fold-lamp.glb — a simple desk lamp with three named meshes:
 * shade, bulb, and base. No downloaded assets.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const len = (a) => Math.hypot(a[0], a[1], a[2])
const norm = (a) => {
  const l = len(a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const basis = (axis) => {
  const helper = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const t = norm(cross(helper, axis))
  const b = cross(axis, t)
  return [t, b]
}

class Geo {
  constructor() {
    this.pos = []
    this.nrm = []
    this.idx = []
  }
  v(x, y, z, nx, ny, nz) {
    const i = this.pos.length / 3
    const l = Math.hypot(nx, ny, nz) || 1
    this.pos.push(x, y, z)
    this.nrm.push(nx / l, ny / l, nz / l)
    return i
  }
  tri(a, b, c) {
    this.idx.push(a, b, c)
  }
}

function addTube(geo, a, b, r0, r1, segs, { caps = true, normalSign = 1 } = {}) {
  const dir = norm(sub(b, a))
  const [t, bi] = basis(dir)
  const ring0 = []
  const ring1 = []
  for (let i = 0; i < segs; i++) {
    const ang = (i / segs) * Math.PI * 2
    const c = Math.cos(ang)
    const s = Math.sin(ang)
    const n = [
      (t[0] * c + bi[0] * s) * normalSign,
      (t[1] * c + bi[1] * s) * normalSign,
      (t[2] * c + bi[2] * s) * normalSign,
    ]
    const radial = [t[0] * c + bi[0] * s, t[1] * c + bi[1] * s, t[2] * c + bi[2] * s]
    ring0.push(geo.v(a[0] + radial[0] * r0, a[1] + radial[1] * r0, a[2] + radial[2] * r0, n[0], n[1], n[2]))
    ring1.push(geo.v(b[0] + radial[0] * r1, b[1] + radial[1] * r1, b[2] + radial[2] * r1, n[0], n[1], n[2]))
  }
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs
    if (normalSign > 0) {
      geo.tri(ring0[i], ring1[i], ring1[j])
      geo.tri(ring0[i], ring1[j], ring0[j])
    } else {
      geo.tri(ring0[i], ring1[j], ring1[i])
      geo.tri(ring0[i], ring0[j], ring1[j])
    }
  }
  if (caps && r0 > 0) {
    const c0 = geo.v(a[0], a[1], a[2], -dir[0] * normalSign, -dir[1] * normalSign, -dir[2] * normalSign)
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs
      if (normalSign > 0) geo.tri(c0, ring0[j], ring0[i])
      else geo.tri(c0, ring0[i], ring0[j])
    }
  }
  if (caps && r1 > 0) {
    const c1 = geo.v(b[0], b[1], b[2], dir[0] * normalSign, dir[1] * normalSign, dir[2] * normalSign)
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs
      if (normalSign > 0) geo.tri(c1, ring1[i], ring1[j])
      else geo.tri(c1, ring1[j], ring1[i])
    }
  }
}

function addAnnulus(geo, center, axis, rInner, rOuter, segs, alongAxis) {
  const n = alongAxis ? axis : mul(axis, -1)
  const [t, bi] = basis(axis)
  const inner = []
  const outer = []
  for (let i = 0; i < segs; i++) {
    const ang = (i / segs) * Math.PI * 2
    const c = Math.cos(ang)
    const s = Math.sin(ang)
    const d = [t[0] * c + bi[0] * s, t[1] * c + bi[1] * s, t[2] * c + bi[2] * s]
    inner.push(geo.v(center[0] + d[0] * rInner, center[1] + d[1] * rInner, center[2] + d[2] * rInner, n[0], n[1], n[2]))
    outer.push(geo.v(center[0] + d[0] * rOuter, center[1] + d[1] * rOuter, center[2] + d[2] * rOuter, n[0], n[1], n[2]))
  }
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs
    geo.tri(outer[i], outer[j], inner[j])
    geo.tri(outer[i], inner[j], inner[i])
  }
}

function addSphere(geo, center, radius, wSeg, hSeg) {
  const grid = []
  for (let y = 0; y <= hSeg; y++) {
    const phi = (y / hSeg) * Math.PI
    const row = []
    for (let x = 0; x <= wSeg; x++) {
      const theta = (x / wSeg) * Math.PI * 2
      const nx = Math.sin(phi) * Math.cos(theta)
      const ny = Math.cos(phi)
      const nz = Math.sin(phi) * Math.sin(theta)
      row.push(geo.v(center[0] + nx * radius, center[1] + ny * radius, center[2] + nz * radius, nx, ny, nz))
    }
    grid.push(row)
  }
  for (let y = 0; y < hSeg; y++) {
    for (let x = 0; x < wSeg; x++) {
      const a = grid[y][x]
      const b = grid[y + 1][x]
      const c = grid[y + 1][x + 1]
      const d = grid[y][x + 1]
      if (y !== 0) geo.tri(a, b, d)
      if (y !== hSeg - 1) geo.tri(b, c, d)
    }
  }
}

function addShade(geo, top, bottom, rTop, rBot, thickness, segs) {
  const axis = norm(sub(bottom, top))
  addTube(geo, top, bottom, rTop, rBot, segs, { caps: false, normalSign: 1 })
  const rTopIn = rTop - thickness
  const rBotIn = rBot - thickness
  addTube(geo, top, bottom, rTopIn, rBotIn, segs, { caps: false, normalSign: -1 })
  addAnnulus(geo, top, axis, rTopIn, rTop, segs, false)
  addAnnulus(geo, bottom, axis, rBotIn, rBot, segs, true)
}

const shade = new Geo()
const bulb = new Geo()
const base = new Geo()

const shadeTop = [0.02, 0.6, 0.16]
const axis = norm([0.04, -1, 0.1])
const shadeH = 0.18
const shadeBottom = add(shadeTop, mul(axis, shadeH))
const rTop = 0.046
const rBot = 0.128
const thick = 0.01

addShade(shade, shadeTop, shadeBottom, rTop, rBot, thick, 48)

const bulbCenter = add(shadeTop, mul(axis, 0.075))
addSphere(bulb, bulbCenter, 0.036, 28, 20)

// Foot, set a little back so the forward shade has a counterweight
addTube(base, [0, 0, -0.02], [0, 0.028, -0.02], 0.2, 0.2, 40)
addTube(base, [0, 0.028, -0.02], [0, 0.046, -0.02], 0.15, 0.15, 40)
addSphere(base, [0.05, 0.052, 0.05], 0.013, 12, 10)

const postBottom = [0, 0.046, -0.15]
const postTop = [0, 0.4, -0.15]
addTube(base, postBottom, postTop, 0.018, 0.016, 18)
addTube(base, [-0.04, 0.4, -0.15], [0.04, 0.4, -0.15], 0.03, 0.03, 16)

const elbow = [0.01, 0.58, -0.02]
addTube(base, postTop, elbow, 0.015, 0.014, 16)
addTube(base, [-0.032, elbow[1], elbow[2]], [0.032, elbow[1], elbow[2]], 0.022, 0.022, 14)

const armTip = [0.02, 0.64, 0.1]
addTube(base, elbow, armTip, 0.014, 0.013, 16)
addTube(base, [-0.026, armTip[1], armTip[2]], [0.026, armTip[1], armTip[2]], 0.018, 0.018, 12)
// Short neck into the top of the shade
addTube(base, armTip, shadeTop, 0.012, 0.013, 12)
const socketEnd = add(shadeTop, mul(axis, 0.04))
addTube(base, shadeTop, socketEnd, 0.014, 0.011, 12)

function bounds(geo) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < geo.pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], geo.pos[i + k])
      max[k] = Math.max(max[k], geo.pos[i + k])
    }
  }
  return { min, max, verts: geo.pos.length / 3, tris: geo.idx.length / 3 }
}

for (const [name, geo] of [['shade', shade], ['bulb', bulb], ['base', base]]) {
  const b = bounds(geo)
  if (b.verts > 65535) throw new Error(`${name} has too many vertices`)
  console.log(name, b)
}

const meshes = [
  {
    name: 'shade',
    geo: shade,
    material: 0,
  },
  {
    name: 'bulb',
    geo: bulb,
    material: 1,
  },
  {
    name: 'base',
    geo: base,
    material: 2,
  },
]

const binParts = []
let cursor = 0
const bufferViews = []
const accessors = []

function align() {
  const pad = (4 - (cursor % 4)) % 4
  if (pad) {
    binParts.push(Buffer.alloc(pad))
    cursor += pad
  }
}

function pushArray(typed, target) {
  align()
  const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength)
  const byteOffset = cursor
  binParts.push(buf)
  cursor += buf.length
  const viewIndex = bufferViews.length
  bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: buf.length,
    target,
  })
  return viewIndex
}

const ARRAY_BUFFER = 34962
const ELEMENT_ARRAY_BUFFER = 34963

const primitiveAccessors = []

for (const mesh of meshes) {
  const pos = new Float32Array(mesh.geo.pos)
  const nrm = new Float32Array(mesh.geo.nrm)
  const idx = new Uint16Array(mesh.geo.idx)
  const { min, max } = bounds(mesh.geo)
  const posView = pushArray(pos, ARRAY_BUFFER)
  const nrmView = pushArray(nrm, ARRAY_BUFFER)
  const idxView = pushArray(idx, ELEMENT_ARRAY_BUFFER)
  const posAcc = accessors.length
  accessors.push({
    bufferView: posView,
    componentType: 5126,
    count: pos.length / 3,
    type: 'VEC3',
    min,
    max,
  })
  const nrmAcc = accessors.length
  accessors.push({
    bufferView: nrmView,
    componentType: 5126,
    count: nrm.length / 3,
    type: 'VEC3',
  })
  const idxAcc = accessors.length
  accessors.push({
    bufferView: idxView,
    componentType: 5123,
    count: idx.length,
    type: 'SCALAR',
  })
  primitiveAccessors.push({ posAcc, nrmAcc, idxAcc, material: mesh.material })
}

align()
const bin = Buffer.concat(binParts)

const gltf = {
  asset: { version: '2.0', generator: 'fold-lamp-script' },
  scene: 0,
  scenes: [{ name: 'Fold Lamp', nodes: [0, 1, 2] }],
  nodes: meshes.map((mesh, i) => ({ name: mesh.name, mesh: i })),
  meshes: meshes.map((mesh, i) => ({
    name: mesh.name,
    primitives: [
      {
        attributes: {
          POSITION: primitiveAccessors[i].posAcc,
          NORMAL: primitiveAccessors[i].nrmAcc,
        },
        indices: primitiveAccessors[i].idxAcc,
        material: primitiveAccessors[i].material,
      },
    ],
  })),
  materials: [
    {
      name: 'shade',
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorFactor: [0.9, 0.84, 0.74, 1],
        metallicFactor: 0,
        roughnessFactor: 0.78,
      },
    },
    {
      name: 'bulb',
      pbrMetallicRoughness: {
        baseColorFactor: [1, 0.96, 0.88, 1],
        metallicFactor: 0,
        roughnessFactor: 0.22,
      },
      emissiveFactor: [1, 0.82, 0.55],
    },
    {
      name: 'base',
      pbrMetallicRoughness: {
        baseColorFactor: [0.72, 0.55, 0.32, 1],
        metallicFactor: 0.88,
        roughnessFactor: 0.32,
      },
    },
  ],
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.length }],
}

const jsonText = JSON.stringify(gltf)
let jsonBuf = Buffer.from(jsonText)
const jsonPad = (4 - (jsonBuf.length % 4)) % 4
if (jsonPad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)])

const total = 12 + 8 + jsonBuf.length + 8 + bin.length
const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0)
header.writeUInt32LE(2, 4)
header.writeUInt32LE(total, 8)

const jsonChunkHeader = Buffer.alloc(8)
jsonChunkHeader.writeUInt32LE(jsonBuf.length, 0)
jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4)

const binChunkHeader = Buffer.alloc(8)
binChunkHeader.writeUInt32LE(bin.length, 0)
binChunkHeader.writeUInt32LE(0x004e4942, 4)

const glb = Buffer.concat([header, jsonChunkHeader, jsonBuf, binChunkHeader, bin])
if (glb.length !== total) throw new Error(`length mismatch ${glb.length} != ${total}`)

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fold-lamp.glb')
writeFileSync(out, glb)

const back = JSON.parse(glb.slice(20, 20 + jsonBuf.length).toString('utf8').trim())
const names = back.meshes.map((m) => m.name)
if (names.join(',') !== 'shade,bulb,base') throw new Error(`unexpected meshes: ${names}`)
console.log(`wrote ${out} (${glb.length} bytes) meshes: ${names.join(', ')}`)
console.log('shade axis', axis.map((n) => n.toFixed(3)), 'bottom', shadeBottom.map((n) => n.toFixed(3)))
console.log('bulb', bulbCenter.map((n) => n.toFixed(3)))
