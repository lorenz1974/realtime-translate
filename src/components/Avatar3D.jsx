import { useEffect, useRef, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useViseme } from '../hooks/useViseme.js'

// Helper: set the influence of every blendshape name in `names` that exists
// on the given mesh, ignoring those that don't.
function setMorph(mesh, names, value) {
  const dict = mesh.morphTargetDictionary
  const inf  = mesh.morphTargetInfluences
  if (!dict || !inf) return
  for (const n of names) {
    if (dict[n] !== undefined) inf[dict[n]] = value
  }
}

// ----------------- CARTOON FACE (default fallback) ----------------------
function CartoonFace({ visemeRef }) {
  const headRef       = useRef()
  const mouthRef      = useRef()
  const leftEyeRef    = useRef()
  const rightEyeRef   = useRef()

  const smoothY = useRef(0.06)
  const smoothX = useRef(1)
  const time    = useRef(0)
  const blink   = useRef(0)
  const nextBlink = useRef(2 + Math.random() * 3)

  useFrame((_, dt) => {
    time.current += dt
    const v = visemeRef?.current || { aa: 0, ee: 0, oo: 0, energy: 0 }

    if (headRef.current) {
      const breath = Math.sin(time.current * 1.4) * 0.015
      headRef.current.scale.setScalar(0.78 * (1 + breath))
      headRef.current.rotation.y = Math.sin(time.current * 0.55) * 0.10
      headRef.current.rotation.x = Math.sin(time.current * 0.80) * 0.05
    }

    // Combine the three viseme weights into mouth scale:
    //   AA -> tall mouth
    //   OO -> tall + narrow
    //   EE -> wide + short
    const targetY = 0.06 + v.aa * 1.7 + v.oo * 1.1 + v.ee * 0.15
    const targetX = 1 + v.ee * 0.6 - v.oo * 0.4 - v.aa * 0.15

    smoothY.current += (targetY - smoothY.current) * Math.min(dt * 22, 1)
    smoothX.current += (targetX - smoothX.current) * Math.min(dt * 22, 1)
    if (mouthRef.current) {
      mouthRef.current.scale.y = smoothY.current
      mouthRef.current.scale.x = smoothX.current
    }

    nextBlink.current -= dt
    if (nextBlink.current <= 0) {
      blink.current = 1
      nextBlink.current = 2.5 + Math.random() * 3
    }
    blink.current = Math.max(0, blink.current - dt * 9)
    const eyeScale = 1 - blink.current * 0.92
    if (leftEyeRef.current)  leftEyeRef.current.scale.y  = eyeScale
    if (rightEyeRef.current) rightEyeRef.current.scale.y = eyeScale
  })

  return (
    <group ref={headRef}>
      <mesh>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#fde68a" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[1.02, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#6366f1" roughness={0.6} />
      </mesh>
      <mesh position={[0.22, 0.85, 0.55]} rotation={[0.3, 0.2, -0.3]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#6366f1" roughness={0.6} />
      </mesh>
      <mesh position={[-0.6, -0.12, 0.75]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial color="#fb7185" transparent opacity={0.45} />
      </mesh>
      <mesh position={[0.6, -0.12, 0.75]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial color="#fb7185" transparent opacity={0.45} />
      </mesh>
      <mesh position={[-0.3, 0.2, 0.88]}>
        <sphereGeometry args={[0.17, 32, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.3, 0.2, 0.88]}>
        <sphereGeometry args={[0.17, 32, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh ref={leftEyeRef} position={[-0.3, 0.2, 1.04]}>
        <sphereGeometry args={[0.085, 24, 24]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.3, 0.2, 1.04]}>
        <sphereGeometry args={[0.085, 24, 24]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[-0.27, 0.24, 1.12]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.33, 0.24, 1.12]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh ref={mouthRef} position={[0, -0.38, 0.92]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.4} />
      </mesh>
    </group>
  )
}

// ----------------- GLB AVATAR (Ready Player Me, custom) ------------------
// Drives ARKit viseme blendshapes properly:
//   viseme_aa / mouthOpen / jawOpen   <- AA weight
//   viseme_E  / mouthSmile             <- EE weight
//   viseme_O  / viseme_U / mouthPucker <- OO weight
//   eyeBlinkLeft/Right                 <- blink
function GLBAvatar({ url, visemeRef }) {
  const [scene, setScene]    = useState(null)
  const morphMeshes          = useRef([])
  const rootRef              = useRef()
  const smoothAa             = useRef(0)
  const smoothEe             = useRef(0)
  const smoothOo             = useRef(0)
  const time                 = useRef(0)
  const blink                = useRef(0)
  const nextBlink            = useRef(3 + Math.random() * 3)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    const loader = new GLTFLoader()
    loader.load(
      url,
      (gltf) => {
        if (cancelled) return
        const found = []
        gltf.scene.traverse((obj) => {
          if (obj.morphTargetDictionary && obj.morphTargetInfluences) {
            found.push(obj)
          }
        })
        morphMeshes.current = found
        setScene(gltf.scene)
      },
      undefined,
      (err) => console.warn('GLB load failed:', err)
    )
    return () => { cancelled = true }
  }, [url])

  useFrame((_, dt) => {
    time.current += dt
    const v = visemeRef?.current || { aa: 0, ee: 0, oo: 0, energy: 0 }

    if (rootRef.current) {
      rootRef.current.rotation.y = Math.sin(time.current * 0.5) * 0.10
    }

    smoothAa.current += (v.aa - smoothAa.current) * Math.min(dt * 22, 1)
    smoothEe.current += (v.ee - smoothEe.current) * Math.min(dt * 22, 1)
    smoothOo.current += (v.oo - smoothOo.current) * Math.min(dt * 22, 1)

    nextBlink.current -= dt
    if (nextBlink.current <= 0) {
      blink.current = 1
      nextBlink.current = 3 + Math.random() * 3
    }
    blink.current = Math.max(0, blink.current - dt * 9)

    for (const mesh of morphMeshes.current) {
      // AA  -> open vowels
      setMorph(mesh, ['viseme_aa', 'viseme_AA', 'mouthOpen', 'jawOpen', 'A', 'AA'], smoothAa.current)
      // EE  -> smile / bright vowels
      setMorph(mesh, ['viseme_E', 'viseme_e', 'viseme_I', 'mouthSmile', 'mouthSmileLeft', 'mouthSmileRight'], smoothEe.current)
      // OO  -> rounded / dark vowels
      setMorph(mesh, ['viseme_O', 'viseme_o', 'viseme_U', 'mouthPucker', 'mouthFunnel'], smoothOo.current)
      // Blink
      setMorph(mesh, ['eyeBlinkLeft', 'eyeBlinkRight', 'eyesClosed', 'blink_L', 'blink_R'], blink.current)
    }
  })

  if (!scene) return null
  return <primitive ref={rootRef} object={scene} position={[0, -1.55, 0]} />
}

// ----------------- AVATAR ROOT -----------------------------------------
export default function Avatar3D({ audioElement, speaking, glbUrl }) {
  const visemeRef = useViseme(audioElement)
  const useGlb = !!(glbUrl && glbUrl.trim().length > 0)

  return (
    <div className={`avatar-3d ${speaking ? 'is-speaking' : ''}`}>
      <Canvas
        camera={
          useGlb
            ? { position: [0, 0.05, 0.65], fov: 28 }
            : { position: [0, 0, 4.2],     fov: 28 }
        }
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[3, 4, 5]} intensity={1.0} />
        <pointLight position={[-3, 1, -2]} intensity={0.45} color="#a5b4fc" />
        <pointLight position={[2, -2, 3]}  intensity={0.30} color="#f9a8d4" />
        {useGlb ? (
          <Suspense fallback={<CartoonFace visemeRef={visemeRef} />}>
            <GLBAvatar url={glbUrl} visemeRef={visemeRef} />
          </Suspense>
        ) : (
          <CartoonFace visemeRef={visemeRef} />
        )}
      </Canvas>
      {speaking && (
        <div className="avatar-badge">
          <i className="bi bi-volume-up-fill me-1"></i>Sta traducendo
        </div>
      )}
    </div>
  )
}
