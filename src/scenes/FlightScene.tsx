import { useEffect, useMemo } from 'react'
import { Physics, RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { GameScene } from './GameScene'
import { PlaneRig } from './PlaneRig'
import type { RespawnPoint } from './PlaneRig'
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

  // Points de réapparition (C5) : un par aérodrome (départ + générés), placé
  // comme le spawn — reculé à 0,33·L du centre sur l'axe de piste, cap de la
  // piste ⇒ ~0,83·L de piste devant l'avion. `[0]` = aérodrome de départ.
  const respawnPoints = useMemo<RespawnPoint[]>(() => {
    const mk = (
      name: string,
      pos: readonly [number, number, number],
      heading: number,
      len: number,
    ): RespawnPoint => {
      const back = len * 0.33
      return {
        name,
        position: [pos[0] + Math.sin(heading) * back, pos[1], pos[2] + Math.cos(heading) * back],
        heading,
      }
    }
    return [
      mk(START_AIRPORT.name, [sx, TOP_Y, sz], START_AIRPORT.heading, START_AIRPORT.runwayLength),
      ...airports.map((a) => mk(a.name, a.position, a.heading, a.runwayLength)),
    ]
  }, [airports, sx, sz])

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
          {/* Nappe d'océan : SENSOR depuis C3 — l'avion pénètre l'eau (la
              flottaison/traînée d'eau sont calculées analytiquement depuis
              SEA_Y dans PlaneRig) ; le fond marin solide = heightfields. */}
          <CuboidCollider
            args={[WORLD_RADIUS * 1.2, 1, WORLD_RADIUS * 1.2]}
            position={[0, SEA_Y - 1, 0]}
            sensor
          />
        </RigidBody>

        <PlaneRig
          aircraft={aircraft}
          tunables={tunables}
          respawnPoints={respawnPoints}
          refuelPads={decor.refuelPads}
        />
      </Physics>
      <DiscoveryTracker airports={trackedAirports} />
    </>
  )
}
