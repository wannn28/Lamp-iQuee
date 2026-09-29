import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import * as THREE from 'three'
import { Suspense } from 'react'

useGLTF.preload('/fold-lamp.glb')

function StudioLight() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = texture
    scene.environmentIntensity = 0.28
    return () => {
      scene.environment = null
      texture.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}


function labelTexture(text) {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 128
  const g = canvas.getContext('2d')
  g.clearRect(0, 0, canvas.width, canvas.height)
  const x = 8
  const y = 28
  const w = 304
  const h = 72
  const r = 36
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
  g.fillStyle = 'rgba(243, 236, 223, 0.94)'
  g.fill()
  g.lineWidth = 4
  g.strokeStyle = 'rgba(70, 48, 32, 0.3)'
  g.stroke()
  g.fillStyle = '#2c241c'
  g.font = '600 44px sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text.toUpperCase(), 160, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function PartLabel({ text, position, spriteRef }) {
  const map = useMemo(() => labelTexture(text), [text])
  return (
    <sprite ref={spriteRef} position={position} scale={[0.24, 0.096, 1]}>
      <spriteMaterial map={map} transparent opacity={0} depthTest={false} />
    </sprite>
  )
}

function Parts({ explosionRef, color }) {
  const { nodes } = useGLTF('/fold-lamp.glb')
  const shadeGeo = nodes.shade?.geometry
  const bulbGeo = nodes.bulb?.geometry
  const baseGeo = nodes.base?.geometry
  if (!shadeGeo || !bulbGeo || !baseGeo) {
    throw new Error('fold-lamp.glb must contain meshes named shade, bulb, and base')
  }

  const shadeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e4d3be',
        roughness: 0.86,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const bulbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fff6e8',
        emissive: new THREE.Color('#ffb15a'),
        emissiveIntensity: 0.32,
        roughness: 0.25,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const baseMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#a67c45',
        roughness: 0.5,
        metalness: 0.42,
        clearcoat: 0.12,
        clearcoatRoughness: 0.6,
        side: THREE.DoubleSide,
      }),
    [],
  )

  useEffect(() => {
    shadeMat.color.set(color)
  }, [color, shadeMat])

  const shade = useRef(null)
  const bulb = useRef(null)
  const base = useRef(null)
  const shadeLabel = useRef(null)
  const bulbLabel = useRef(null)
  const baseLabel = useRef(null)
  const amount = useRef(0)
  const rig = useRef(null)

  useFrame((_, delta) => {
    const target = explosionRef.current || 0
    amount.current = THREE.MathUtils.damp(amount.current, target, 5, delta)
    const t = amount.current
    if (rig.current) rig.current.position.y = -0.1 * t
    if (shade.current) shade.current.position.set(0.06 * t, 0.22 * t, 0.02 * t)
    if (bulb.current) bulb.current.position.set(-0.02 * t, 0.02 * t, 0.16 * t)
    if (base.current) base.current.position.set(0, -0.16 * t, -0.02 * t)
    const fade = THREE.MathUtils.smoothstep(t, 0.16, 0.48)
    for (const sprite of [shadeLabel.current, bulbLabel.current, baseLabel.current]) {
      if (sprite) sprite.material.opacity = fade
    }
  })

  return (
    <group ref={rig}>
      <group ref={shade}>
        <mesh name="shade" geometry={shadeGeo} material={shadeMat} />
        <PartLabel text="Shade" position={[-0.34, 0.5, 0.26]} spriteRef={shadeLabel} />
      </group>
      <group ref={bulb}>
        <mesh name="bulb" geometry={bulbGeo} material={bulbMat} />
        <pointLight position={[0.02, 0.43, 0.2]} color="#ffc48a" intensity={0.45} distance={1.2} decay={2} />
        <PartLabel text="Bulb" position={[-0.28, 0.52, 0.28]} spriteRef={bulbLabel} />
      </group>
      <group ref={base}>
        <mesh name="base" geometry={baseGeo} material={baseMat} />
        <PartLabel text="Base" position={[0.4, 0.08, 0.14]} spriteRef={baseLabel} />
      </group>
    </group>
  )
}

export default function Lamp({ explosionRef, color }) {
  return (
    <Canvas
      className="lamp-canvas"
      dpr={[1, 1.75]}
      camera={{ position: [1.72, 0.78, 1.85], fov: 34, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.02
      }}
    >
      <StudioLight />
      <ambientLight intensity={0.48} color="#fff4e8" />
      <directionalLight position={[2.6, 3.4, 2.2]} intensity={1.7} color="#fffaf3" />
      <directionalLight position={[-2.4, 1.6, 1.2]} intensity={0.55} color="#f3d7b8" />
      <directionalLight position={[0.2, 1.2, -2.4]} intensity={0.35} color="#edd2b0" />
      <Suspense fallback={null}>
        <Parts explosionRef={explosionRef} color={color} />
        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.38}
          scale={5.5}
          blur={2.4}
          far={1.35}
          color="#6d5140"
        />
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        target={[0.0, 0.32, 0.02]}
        minPolarAngle={0.45}
        maxPolarAngle={1.35}
      />
    </Canvas>
  )
}
