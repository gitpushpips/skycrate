import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Étape 0 — scène 3D minimale mais déjà propre, juste pour valider que le stack
 * (Vite + R3F + three) démarre correctement.
 *
 * L'habillage visuel complet (ciel dégradé, fog, soft shadows PCSS, post-process
 * bloom/SSAO/vignette/SMAA, palette low-poly) arrive à l'étape 1 (barre §3).
 *
 * Convention de cap (§3 / règle 5) : le soleil est FIXE et indique le NORD.
 * On la formalisera proprement à l'étape 1 ; ici la lumière est déjà placée
 * vers le nord (-Z) pour ne pas avoir à tout redéplacer ensuite.
 */
export default function App() {
  return (
    <Canvas
      shadows
      camera={{ position: [9, 6, 13], fov: 50, near: 0.1, far: 2000 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
    >
      {/* Ciel provisoire (un vrai dégradé viendra à l'étape 1) */}
      <color attach="background" args={['#a7cdec']} />
      <fog attach="fog" args={['#a7cdec', 60, 260]} />

      {/* Lumière d'ambiance pour les zones d'ombre */}
      <hemisphereLight args={['#cfe6ff', '#4f5d34', 0.6]} />

      {/* Soleil = nord (-Z), fixe */}
      <directionalLight
        position={[14, 22, -26]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />

      {/* Sol provisoire (la piste arrive avec le monde) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#7fa650" />
      </mesh>

      {/* Cube témoin (placeholder de l'avion en dur du Jalon 1) */}
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color="#e8843f" />
      </mesh>

      <OrbitControls target={[0, 1, 0]} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  )
}
