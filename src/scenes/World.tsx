import { useMemo } from 'react'
import { palette } from './palette'
import { AIRPORTS, ISLANDS, SEA_Y, TOP_Y, WORLD_RADIUS } from '../core/world/world'
import type { Airport, Biome, Island } from '../core/world/world'

/**
 * Monde ouvert (spec §10) — rendu : océan + îles (plateaux biomés au-dessus de
 * l'eau) + pistes. Convention soleil = NORD = -Z. Les colliders physiques sont
 * montés à part dans `FlightScene` (à partir des mêmes données `core/world`).
 */
const BIOME_COLORS: Record<Biome, { top: string; cliff: string }> = {
  green: { top: palette.biomeGreen, cliff: palette.biomeGreenCliff },
  snow: { top: palette.biomeSnow, cliff: palette.biomeSnowCliff },
  desert: { top: palette.biomeDesert, cliff: palette.biomeDesertCliff },
}

function IslandMesa({ island }: { island: Island }) {
  const c = BIOME_COLORS[island.biome]
  const [cx, cz] = island.center
  const cliffH = TOP_Y - SEA_Y + 4 // descend sous l'océan
  return (
    <group position={[cx, 0, cz]}>
      {/* Plateau plat (posable). */}
      <mesh position={[0, -0.4, 0]} rotation={[0, 0.3, 0]} receiveShadow>
        <cylinderGeometry args={[island.radius, island.radius, 0.8, 9]} />
        <meshStandardMaterial color={c.top} flatShading roughness={0.95} />
      </mesh>
      {/* Falaise / base qui s'évase vers le fond. */}
      <mesh position={[0, -0.8 - cliffH / 2, 0]} rotation={[0, 0.3, 0]} receiveShadow>
        <cylinderGeometry args={[island.radius * 0.98, island.radius + 30, cliffH, 9]} />
        <meshStandardMaterial color={c.cliff} flatShading roughness={1} />
      </mesh>
    </group>
  )
}

function Runway({ airport }: { airport: Airport }) {
  const [x, , z] = airport.position
  const { runwayLength: L, runwayWidth: W } = airport
  const dashes = useMemo(() => {
    const n = Math.max(5, Math.round(L / 18))
    const gap = L / n
    return Array.from({ length: n }, (_, i) => -L / 2 + gap * (i + 0.5))
  }, [L])
  return (
    <group position={[x, TOP_Y + 0.02, z]} rotation={[0, airport.heading, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial color={palette.runway} roughness={0.95} />
      </mesh>
      {/* Seuils (bandes claires aux deux bouts). */}
      {[-L / 2 + 3, L / 2 - 3].map((zz) => (
        <mesh key={zz} position={[0, 0.02, zz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W * 0.8, 1.6]} />
          <meshStandardMaterial color={palette.runwayLine} />
        </mesh>
      ))}
      {/* Marquage axial. */}
      {dashes.map((zz, i) => (
        <mesh key={i} position={[0, 0.03, zz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 6]} />
          <meshStandardMaterial color={palette.runwayLine} />
        </mesh>
      ))}
    </group>
  )
}

export function World() {
  return (
    <group>
      {/* Océan (grande étendue sous les plateaux). */}
      <mesh position={[0, SEA_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD_RADIUS * 2.4, WORLD_RADIUS * 2.4]} />
        <meshStandardMaterial color={palette.ocean} roughness={0.4} metalness={0.15} />
      </mesh>

      {ISLANDS.map((i) => (
        <IslandMesa key={i.id} island={i} />
      ))}
      {AIRPORTS.map((a) => (
        <Runway key={a.id} airport={a} />
      ))}
    </group>
  )
}
