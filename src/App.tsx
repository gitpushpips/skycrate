import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import { Leva } from 'leva'
import { GameScene } from './scenes/GameScene'
import { PostFX } from './scenes/PostFX'
import { RenderSettings } from './scenes/RenderSettings'
import { PlaneRig } from './scenes/PlaneRig'
import { useFlightTunables } from './scenes/flightControls'
import { J1_PLANE } from './core/assembly'

/**
 * Étape 5 — avion pilotable + caméra référencée moteur (règle 1).
 * Commandes : W/S tangage, A/D roulis, Q/E lacet, Shift plein gaz, C inverse.
 * Caméra 3ᵉ personne accrochée à l'orientation du moteur (cf. PlaneRig).
 */
export default function App() {
  const flight = useFlightTunables()

  return (
    <>
      <Leva collapsed />
      <Canvas
        frameloop="always"
        shadows="variance"
        dpr={[1, 2]}
        camera={{ position: [7, 3.2, 9.5], fov: 50, near: 0.1, far: 2000 }}
        gl={{ antialias: false }}
      >
        <RenderSettings />
        <Suspense fallback={null}>
          <GameScene />
          <Physics gravity={[0, -flight.gravity, 0]}>
            {/* Sol : collider statique invisible (le visuel est dans GameScene) */}
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider args={[2000, 5, 2000]} position={[0, -5, 0]} friction={flight.groundFriction} />
            </RigidBody>

            <PlaneRig assembly={J1_PLANE} tunables={flight} />
          </Physics>
        </Suspense>
        <PostFX />
      </Canvas>
    </>
  )
}
