import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import { GameScene } from './GameScene'
import { PlaneRig } from './PlaneRig'
import type { CompiledAircraft } from '../core/build/compile'
import type { FlightTunables } from './flightControls'

/**
 * Mode VOL : monde (ciel/piste/décor) + monde physique Rapier + l'avion compilé.
 * Extrait d'App pour permettre la bascule hangar ↔ vol (Jalon 2-B).
 */
export function FlightScene({
  aircraft,
  tunables,
}: {
  aircraft: CompiledAircraft
  tunables: FlightTunables
}) {
  return (
    <>
      <GameScene />
      <Physics gravity={[0, -tunables.gravity, 0]}>
        {/* Sol : collider statique invisible (le visuel est dans GameScene) */}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[20000, 5, 20000]} position={[0, -5, 0]} friction={tunables.groundFriction} />
        </RigidBody>

        <PlaneRig aircraft={aircraft} tunables={tunables} />
      </Physics>
    </>
  )
}
