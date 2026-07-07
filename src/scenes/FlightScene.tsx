import { Physics, RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { GameScene } from './GameScene'
import { PlaneRig } from './PlaneRig'
import type { CompiledAircraft } from '../core/build/compile'
import type { FlightTunables } from './flightControls'
import { SEA_Y, START_AIRPORT, TOP_Y, WORLD_RADIUS } from '../core/world/world'
import { SPAWN_PAD_RADIUS } from '../core/world/terrain'
import { buildWorld } from '../core/world/airports'
import { useWorldTunables } from './worldControls'

/**
 * Mode VOL : monde ouvert (océan + terrain à relief + aérodromes) + monde
 * physique Rapier + l'avion compilé, spawné sur la piste de départ.
 *
 * Colliders : pad du spawn + un pad par aérodrome généré (on peut se poser
 * partout où il y a une piste) + nappe océan. Le relief lui-même n'a PAS
 * encore de colliders (heightfields par chunk = 3+E) → hors des pads, on
 * traverse le terrain (assumé, transitoire).
 */
export function FlightScene({
  aircraft,
  tunables,
}: {
  aircraft: CompiledAircraft
  tunables: FlightTunables
}) {
  const world = useWorldTunables()
  const { airports } = buildWorld(world.terrain) // mémoïsé par valeur (partagé avec World)
  const [sx, , sz] = START_AIRPORT.position
  return (
    <>
      <GameScene />
      <Physics gravity={[0, -tunables.gravity, 0]}>
        <RigidBody type="fixed" colliders={false}>
          {/* Pad aplani du spawn (aligné sur le flatten du terrain). */}
          <CylinderCollider
            args={[0.5, SPAWN_PAD_RADIUS]}
            position={[sx, TOP_Y - 0.5, sz]}
            friction={tunables.groundFriction}
          />
          {/* Pads des aérodromes générés (rectangles orientés au cap). */}
          {airports.map((a) => (
            <CuboidCollider
              key={a.id}
              args={[a.padHalfWidth, 0.5, a.padHalfLength]}
              position={[a.position[0], a.position[1] - 0.5, a.position[2]]}
              rotation={[0, a.heading, 0]}
              friction={tunables.groundFriction}
            />
          ))}
          {/* Nappe d'océan (sous tout le monde). */}
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
