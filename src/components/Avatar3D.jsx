import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useAudioAmplitude } from '../hooks/useAudioAmplitude.js'

function FaceMesh({ amplitudeRef, speaking }) {
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

    // Idle: respirazione + leggera oscillazione della testa
    if (headRef.current) {
      const breath = Math.sin(time.current * 1.4) * 0.015
      headRef.current.scale.setScalar(1 + breath)
      headRef.current.rotation.y = Math.sin(time.current * 0.55) * 0.10
      headRef.current.rotation.x = Math.sin(time.current * 0.80) * 0.05
    }

    // Bocca: pilotata dall'ampiezza audio in tempo reale
    const targetMouth = speaking ? Math.min(0.15 + amp * 5.5, 1.7) : 0.08
    smoothMouth.current += (targetMouth - smoothMouth.current) * Math.min(dt * 18, 1)
    if (mouthRef.current) {
      mouthRef.current.scale.y = smoothMouth.current
      mouthRef.current.scale.x = 1 - smoothMouth.current * 0.2
    }

    // Blink casuale ogni ~3 secondi
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
      {/* Testa */}
      <mesh>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#fde68a" roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Capelli (calotta superiore) */}
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[1.02, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#6366f1" roughness={0.6} />
      </mesh>
      {/* Ciuffo */}
      <mesh position={[0.18, 0.85, 0.55]} rotation={[0.3, 0.2, -0.3]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#6366f1" roughness={0.6} />
      </mesh>
      {/* Guance arrossate */}
      <mesh position={[-0.6, -0.12, 0.75]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial color="#fb7185" transparent opacity={0.45} />
      </mesh>
      <mesh position={[0.6, -0.12, 0.75]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial color="#fb7185" transparent opacity={0.45} />
      </mesh>
      {/* Bianco occhi */}
      <mesh position={[-0.3, 0.2, 0.88]}>
        <sphereGeometry args={[0.17, 32, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.3, 0.2, 0.88]}>
        <sphereGeometry args={[0.17, 32, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Pupille (scaleY animata per blink) */}
      <mesh ref={leftEyeRef} position={[-0.3, 0.2, 1.04]}>
        <sphereGeometry args={[0.085, 24, 24]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.3, 0.2, 1.04]}>
        <sphereGeometry args={[0.085, 24, 24]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* Riflesso pupille */}
      <mesh position={[-0.27, 0.24, 1.12]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.33, 0.24, 1.12]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Bocca (sphereY scale = ampiezza audio) */}
      <mesh ref={mouthRef} position={[0, -0.38, 0.92]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.4} />
      </mesh>
    </group>
  )
}

export default function Avatar3D({ stream, speaking }) {
  const amplitudeRef = useAudioAmplitude(stream)

  return (
    <div className={`avatar-3d ${speaking ? 'is-speaking' : ''}`}>
      <Canvas
        camera={{ position: [0, 0, 3.1], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 4, 5]} intensity={0.9} />
        <pointLight position={[-3, 1, -2]} intensity={0.35} color="#a5b4fc" />
        <pointLight position={[2, -2, 3]} intensity={0.25} color="#f9a8d4" />
        <FaceMesh amplitudeRef={amplitudeRef} speaking={speaking} />
      </Canvas>
      {speaking && (
        <div className="avatar-badge">
          <i className="bi bi-volume-up-fill me-1"></i>Sta traducendo
        </div>
      )}
    </div>
  )
}
