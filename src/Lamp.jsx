import { useEffect, useMemo, useRef, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import * as THREE from 'three'

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

function Parts({ explosionRef, color, controlsRef, onCycle }) {
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
  const cordMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#b7a48c', roughness: 0.78, metalness: 0 }),
    [],
  )

  useEffect(() => {
    shadeMat.color.set(color)
  }, [color, shadeMat])

  const shade = useRef(null)
  const bulb = useRef(null)
  const base = useRef(null)
  const cord = useRef(null)
  const bead = useRef(null)
  const amount = useRef(0)
  const rig = useRef(null)
  const stretch = useRef(0)
  const shown = useRef(0)
  const { gl } = useThree()

  const cordCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.016, -0.035, 0.012),
      new THREE.Vector3(0.038, -0.13, 0.02),
      new THREE.Vector3(0.01, -0.25, 0.006),
    ])
  }, [])
  const cordHit = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.016, -0.035, 0.012),
      new THREE.Vector3(0.038, -0.13, 0.02),
      new THREE.Vector3(0.01, -0.25, 0.006),
    ])
  }, [])

  useFrame((_, delta) => {
    const target = explosionRef.current || 0
    amount.current = THREE.MathUtils.damp(amount.current, target, 5, delta)
    const t = amount.current
    if (rig.current) rig.current.position.y = -0.1 * t
    if (shade.current) shade.current.position.set(0.06 * t, 0.22 * t, 0.02 * t)
    if (bulb.current) bulb.current.position.set(-0.02 * t, 0.02 * t, 0.16 * t)
    if (base.current) base.current.position.set(0, -0.16 * t, -0.02 * t)
    shown.current = THREE.MathUtils.damp(shown.current, stretch.current, 10, delta)
    if (cord.current) {
      const scale = 1 + shown.current
      cord.current.scale.y = scale
      if (bead.current) bead.current.scale.y = 1 / scale
    }
  })

  function beginPull(event) {
    event.stopPropagation()
    stretch.current = 0
    const startY = event.clientY
    if (controlsRef.current) controlsRef.current.enabled = false
    gl.domElement.style.cursor = 'grabbing'

    const move = (ev) => {
      const dy = ev.clientY - startY
      stretch.current = Math.min(1.2, Math.max(0, dy / 130))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const pulled = stretch.current > 0.45
      stretch.current = 0
      if (controlsRef.current) controlsRef.current.enabled = true
      gl.domElement.style.cursor = 'grab'
      if (pulled) onCycle()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <group ref={rig}>
      <group ref={shade}>
        <mesh name="shade" geometry={shadeGeo} material={shadeMat} />
        <group position={[0.155, 0.426, 0.177]}>
          <mesh position={[0.004, 0.012, 0.003]} rotation={[0.35, 0.2, -0.45]} material={baseMat}>
            <cylinderGeometry args={[0.012, 0.015, 0.028, 14]} />
          </mesh>
          <group ref={cord}>
            <mesh
              name="cord"
              material={cordMat}
              onPointerDown={beginPull}
              onPointerOver={() => {
                gl.domElement.style.cursor = 'grab'
              }}
              onPointerOut={() => {
                if (stretch.current === 0) gl.domElement.style.cursor = ''
              }}
            >
              <tubeGeometry args={[cordCurve, 40, 0.0055, 8, false]} />
            </mesh>
            <mesh ref={bead} position={[0.01, -0.25, 0.006]}>
              <sphereGeometry args={[0.013, 16, 16]} />
              <meshStandardMaterial color="#8d7356" roughness={0.5} metalness={0.08} />
            </mesh>
            <mesh onPointerDown={beginPull}>
              <tubeGeometry args={[cordHit, 16, 0.02, 6, false]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        </group>
      </group>
      <group ref={bulb}>
        <mesh name="bulb" geometry={bulbGeo} material={bulbMat} />
        <pointLight position={[0.02, 0.43, 0.2]} color="#ffc48a" intensity={0.45} distance={1.2} decay={2} />
      </group>
      <group ref={base}>
        <mesh name="base" geometry={baseGeo} material={baseMat} />
      </group>
    </group>
  )
}

export default function Lamp({ explosionRef, color, onCycle }) {
  const controlsRef = useRef(null)
  return (
    <Canvas
      className="lamp-canvas"
      dpr={[1, 1.75]}
      camera={{ position: [0.15, 0.55, 2.35], fov: 32, near: 0.1, far: 30 }}
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
        <Parts explosionRef={explosionRef} color={color} controlsRef={controlsRef} onCycle={onCycle} />
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
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        target={[0.02, 0.3, 0.08]}
        minPolarAngle={0.45}
        maxPolarAngle={1.35}
      />
    </Canvas>
  )
}
