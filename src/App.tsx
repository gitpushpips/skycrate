import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Leva } from 'leva'
import { GameScene } from './scenes/GameScene'
import { PostFX } from './scenes/PostFX'
import { RenderSettings } from './scenes/RenderSettings'

/**
 * Étape 1 — base de rendu soignée (barre §3) : tone mapping ACES, ciel dégradé +
 * fog, ombres douces PCSS, post-process (SSAO/bloom/vignette/MSAA), palette
 * low-poly ensoleillée. Soleil fixe = nord.
 *
 * OrbitControls reste pour inspecter la scène ; la caméra de vol référencée sur
 * le moteur arrive à l'étape 5.
 */
export default function App() {
  return (
    <>
      <Leva collapsed />
      <Canvas
        // Rendu à la demande (scène statique pour l'instant) : repassera en
        // "always" à l'étape 4 quand le vol nécessitera des frames continues.
        frameloop="demand"
        // Ombres douces via VSM (natif three, compatible 0.184 ; drei <SoftShadows>
        // / PCSS casse la compil shader sur three 0.184). Flou réglé par shadow-radius.
        shadows="variance"
        dpr={[1, 2]}
        camera={{ position: [18, 10, 24], fov: 50, near: 0.1, far: 2000 }}
        gl={{ antialias: false }}
      >
        <RenderSettings />
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
        <PostFX />
        <OrbitControls
          target={[0, 1.5, 0]}
          maxPolarAngle={Math.PI / 2.05}
          enableDamping={false}
          minDistance={6}
          maxDistance={220}
        />
      </Canvas>
    </>
  )
}
