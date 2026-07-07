import { Physics, RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { GameScene } from './GameScene'
import { PlaneRig } from './PlaneRig'
import type { CompiledAircraft } from '../core/build/compile'
import type { FlightTunables } from './flightControls'
import { ISLANDS, SEA_Y, START_AIRPORT, TOP_Y, WORLD_RADIUS } from '../core/world/world'

/**
 * Mode VOL : monde ouvert (océan + îles + pistes) + monde physique Rapier +
 * l'avion compilé. Chaque île = un plateau posable (cylindre), l'océan une nappe
 * plus basse. L'avion spawn sur la piste de départ.
 */
export function FlightScene({
  aircraft,
  tunables,
}: {
  aircraft: CompiledAircraft
  tunables: FlightTunables
}) {
  const [sx, , sz] = START_AIRPORT.position
  return (
    <>
      <GameScene />
      <Physics gravity={[0, -tunables.gravity, 0]}>
        <RigidBody type="fixed" colliders={false}>
          {/* Plateaux des îles (top posable à TOP_Y). */}
          {ISLANDS.map((i) => (
            <CylinderCollider
              key={i.id}
              args={[0.5, i.radius]}
              position={[i.center[0], TOP_Y - 0.5, i.center[1]]}
              friction={tunables.groundFriction}
            />
          ))}
          {/* Nappe d'océan (sous les plateaux). */}
          <CuboidCollider
            args={[WORLD_RADIUS * 1.2, 1, WORLD_RADIUS * 1.2]}
            position={[0, SEA_Y - 1, 0]}
            friction={tunables.groundFriction}
          />
        </RigidBody>

        <PlaneRig aircraft={aircraft} tunables={tunables} spawn={[sx, TOP_Y, sz]} />
      </Physics>
    </>
  )
}
