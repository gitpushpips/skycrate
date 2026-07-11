import { useEffect, useMemo } from 'react'
import { Physics, RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { GameScene } from './GameScene'
import { PlaneRig } from './PlaneRig'
import { TerrainColliders } from './TerrainColliders'
import { DiscoveryTracker } from './DiscoveryTracker'
import type { CompiledAircraft } from '../core/build/compile'
import type { FlightTunables } from './flightControls'
import { AIRPORTS, SEA_Y, START_AIRPORT, TOP_Y, WORLD_RADIUS } from '../core/world/world'
import { SPAWN_PAD_RADIUS } from '../core/world/terrain'
import { buildWorld } from '../core/world/airports'
import { buildAirportDecor } from '../core/world/airportDecor'
import { useWorldTunables } from './worldControls'
import { useWorldUi } from '../store/world'

/**
 * Mode VOL : monde ouvert (océan + terrain à relief + aérodromes) + monde
 * physique Rapier + l'avion compilé, spawné sur la piste de départ.
 *
 * Colliders : HEIGHTFIELDS de terrain streamés autour de l'avion (3+E — on
 * roule/atterrit/crashe partout) + pads d'aérodromes + pad du spawn + nappe
 * océan. Découverte : aérodromes révélés à l'approche (brouillard de carte).
 */
export function FlightScene({
  aircraft,
  tunables,
}: {
  aircraft: CompiledAircraft
  tunables: FlightTunables
}) {
  const world = useWorldTunables()
  const worldData = buildWorld(world.terrain) // mémoïsé par valeur (partagé avec World)
  const { terrain, airports } = worldData
  const decor = buildAirportDecor(worldData) // bâtiments (colliders) + pads de ravitaillement
  const [sx, , sz] = START_AIRPORT.position

  // Spawn vers le tiers aval de la piste (S5) : reculé à 0,33·L du centre (axe
  // piste, +z pour heading 0), nez au nord ⇒ ~0,83·L de piste devant l'avion,
  // ~0,17·L derrière (pas COLLÉ au bout de piste, demande utilisateur).
  const spawn = useMemo<[number, number, number]>(() => {
    const back = START_AIRPORT.runwayLength * 0.33
    return [
      sx + Math.sin(START_AIRPORT.heading) * back,
      TOP_Y,
      sz + Math.cos(START_AIRPORT.heading) * back,
    ]
  }, [sx, sz])

  // Découverte liée au seed courant (persistance localStorage).
  useEffect(() => {
    useWorldUi.getState().ensureSeed(world.terrain.seed)
  }, [world.terrain.seed])

  const trackedAirports = useMemo(
    () => [...AIRPORTS, ...airports].map((a) => ({ id: a.id, position: a.position })),
    [airports],
  )

  return (
    <>
      <GameScene />
      <Physics gravity={[0, -tunables.gravity, 0]} debug={world.showColliders}>
        {/* Relief : heightfields streamés autour de l'avion. */}
        <TerrainColliders
          terrain={terrain}
          radius={world.physicsRadius}
          friction={tunables.groundFriction}
        />

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
          {/* Bâtiments d'aérodrome (S5) : hangars, tours, citernes = solides. */}
          {decor.colliders.map((c, i) => (
            <CuboidCollider
              key={`decor-${i}`}
              args={c.half}
              position={c.position}
              rotation={[0, c.rotY, 0]}
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

        <PlaneRig
          aircraft={aircraft}
          tunables={tunables}
          spawn={spawn}
          refuelPads={decor.refuelPads}
        />
      </Physics>
      <DiscoveryTracker airports={trackedAirports} />
    </>
  )
}
