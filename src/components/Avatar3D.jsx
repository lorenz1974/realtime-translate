import { useEffect, useRef, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useAudioAmplitude } from '../hooks/useAudioAmplitude.js'

// ----------------- CARTOON FACE (default fallback) ----------------------
function CartoonFace({ amplitudeRef }) {
  const headRef       = useRef()
  const mouthRef      = useRef()
  const leftEyeRef    = useRef()
  const rightEyeRef   = useRef()

  const smoothMouth   = useRef(0)
  const time          = useRef(0)
  const blinkValue    = useRef(0)
  const nextBlinkIn   = useRef(2 + Math.random() * 3)

  useFrame((_, dt) => {
    time.current += dt
    const amp = amplitudeRef?.current || 0
    const isAudible = amp > 0.005

    if (headRef.current) {
      const breath = Math.sin(time.current * 1.4) * 0.015
      headRef.current.scale.setScalar(0.78 * (1 + breath))
      headRef.current.rotation.y = Math.sin(time.current * 0.55) * 0.10
      headRef.current.rotation.x = Math.sin(time.current * 0.80) * 0.05
    }

    // Bocca pilotata DIRETTAMENTE dall'ampiezza audio: continua a muoversi
    // per tutta la durata del playback, non solo durante l'emissione RTP.
    const wiggle = isAudible ? Math.abs(Math.sin(time.current * 13)) * 0.08 : 0
    const targetMouth = Math.min(amp * 7 + wiggle, 1.7)
    smoothMouth.current += (targetMouth - smoothMouth.current) * Math.min(dt * 22, 1)
    if (mouthRef.current) {
      mouthRef.current.scale.y = Math.max(smoothMouth.current, 0.06)
      mouthRef.current.scale.x = 1 - smoothMouth.current * 0.2
    }

    nextBlinkIn.current -= dt
    if (nextBlinkIn.current <= 0) {
      blinkValue.current = 1
      nextBlinkIn.current = 2.5 + Math.random() * 3
    }
    blinkValue.current = Math.max(0, blinkValue.current - dt * 9)
    const eyeScale = 1 - blinkValue.current * 0.92
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
function GLBAvatar({ url, amplitudeRef }) {
  const [scene, setScene]    = useState(null)
  const morphMeshes          = useRef([])
  const rootRef              = useRef()
  const smoothMouth          = useRef(0)
  const time                 = useRef(0)
  const blinkValue           = useRef(0)
  const nextBlinkIn          = useRef(3 + Math.random() * 3)

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
    const amp = amplitudeRef?.current || 0
    const isAudible = amp > 0.005

    if (rootRef.current) {
      rootRef.current.rotation.y = Math.sin(time.current * 0.5) * 0.10
    }

    const wiggle = isAudible ? Math.abs(Math.sin(time.current * 13)) * 0.06 : 0
    const targetMouth = Math.min(amp * 5.5 + wiggle, 1)
    smoothMouth.current += (targetMouth - smoothMouth.current) * Math.min(dt * 22, 1)

    nextBlinkIn.current -= dt
    if (nextBlinkIn.current <= 0) {
      blinkValue.current = 1
      nextBlinkIn.current = 3 + Math.random() * 3
    }
    blinkValue.current = Math.max(0, blinkValue.current - dt * 9)

    const mouthCandidates = ['mouthOpen', 'jawOpen', 'viseme_aa', 'mouth_Open', 'jaw_open', 'A', 'AA']
    const blinkCandidates = ['eyesClosed', 'eyeBlinkLeft', 'eyeBlinkRight', 'blink_L', 'blink_R', 'Blink']

    for (const mesh of morphMeshes.current) {
      const dict = mesh.morphTargetDictionary
      const inf  = mesh.morphTargetInfluences
      for (const name of mouthCandidates) {
        if (dict[name] !== undefined) inf[dict[name]] = smoothMouth.current
      }
      for (const name of blinkCandidates) {
        if (dict[name] !== undefined) inf[dict[name]] = blinkValue.current
      }
    }
  })

  if (!scene) return null
  return <primitive ref={rootRef} object={scene} position={[0, -1.55, 0]} />
}

// ----------------- AVATAR ROOT -----------------------------------------
export default function Avatar3D({ audioElement, speaking, glbUrl }) {
  const amplitudeRef = useAudioAmplitude(audioElement)
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
          <Suspense fallback={<CartoonFace amplitudeRef={amplitudeRef} />}>
            <GLBAvatar url={glbUrl} amplitudeRef={amplitudeRef} />
          </Suspense>
        ) : (
          <CartoonFace amplitudeRef={amplitudeRef} />
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
