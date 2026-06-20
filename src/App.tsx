import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import { Leva } from 'leva'
import { GameScene } from './scenes/GameScene'
import { PostFX } from './scenes/PostFX'
import { RenderSettings } from './scenes/RenderSettings'
import { PlaneRig } from './scenes/PlaneRig'
import { useFlightTunables } from './scenes/flightControls'
import { J1_PLANE } from './core/assembly'

/**
 * Étape 4 — physique de vol Rapier : gravité×masse, portance/traînée forfaitaires,
 * poussée plein/off/inverse + limite, friction sol, PAS de freins.
 * `frameloop="always"` (la simulation a besoin de frames continues).
 *
 * Commandes provisoires : W/↑ plein gaz, S/↓ inverse. Tangage/roulis/lacet +
 * caméra référencée moteur = étape 5.
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
              <CuboidCollider args={[2000, 1, 2000]} position={[0, -1, 0]} friction={flight.groundFriction} />
            </RigidBody>

            <PlaneRig
              assembly={J1_PLANE}
              tunables={flight}
              friction={flight.groundFriction}
              linearDamping={flight.linearDamping}
              angularDamping={flight.angularDamping}
            />
          </Physics>
        </Suspense>
        <PostFX />
        <OrbitControls
          target={[0, 1.1, 0]}
          maxPolarAngle={Math.PI / 2.05}
          enableDamping={false}
          minDistance={4}
          maxDistance={400}
        />
      </Canvas>
    </>
  )
}
