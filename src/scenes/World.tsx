import { useMemo } from 'react'
import * as THREE from 'three'
import { palette } from './palette'
import { AIRPORTS, SEA_Y } from '../core/world/world'
import type { Airport } from '../core/world/world'
import type { TerrainParams } from '../core/world/terrain'
import { buildWorld } from '../core/world/airports'
import { TerrainChunks } from './Terrain'
import { Vegetation } from './Vegetation'
import { useWorldTunables } from './worldControls'

/**
 * Monde ouvert (3+A/B/C/D) — rendu : océan + terrain procédural chunké +
 * végétation + aérodromes (piste de départ fixe + sites générés, terrain
 * aplani sous chaque pad). Convention soleil = NORD = -Z. Les colliders
 * physiques sont montés à part dans `FlightScene` (mêmes données buildWorld).
 */
function Runway({ airport }: { airport: Airport }) {
  const [x, y, z] = airport.position
  const { runwayLength: L, runwayWidth: W } = airport
  const dashes = useMemo(() => {
    const n = Math.max(5, Math.round(L / 18))
    const gap = L / n
    return Array.from({ length: n }, (_, i) => -L / 2 + gap * (i + 0.5))
  }, [L])
  return (
    <group position={[x, y + 0.02, z]} rotation={[0, airport.heading, 0]}>
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

/** Manche à air en bord de piste — repère visuel d'aérodrome. */
function Windsock({ airport }: { airport: Airport }) {
  const [x, y, z] = airport.position
  return (
    <group position={[x, y, z]} rotation={[0, airport.heading, 0]}>
      <group position={[airport.runwayWidth / 2 + 6, 0, -airport.runwayLength * 0.25]}>
        <mesh position={[0, 2.1, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 4.2, 5]} />
          <meshStandardMaterial color={palette.planeStrut} />
        </mesh>
        <mesh position={[0.7, 4.0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[0.32, 1.4, 6, 1, true]} />
          <meshStandardMaterial color={palette.windsock} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

export function World() {
  const tunables = useWorldTunables()
  // Régénération uniquement quand un param change réellement (clé par valeur) ;
  // buildWorld mémoïse par la même clé ⇒ instance partagée avec FlightScene.
  const terrainKey = JSON.stringify(tunables.terrain)
  const { terrain, airports } = useMemo(
    () => buildWorld(JSON.parse(terrainKey) as TerrainParams),
    [terrainKey],
  )

  return (
    <group>
      {/* Océan (nappe globale au niveau de la mer ; les creux du terrain sous
          SEA_Y deviennent naturellement baies, étangs et lacs). Semi-transparent
          pour laisser lire la profondeur (fond sableux clair → vase sombre). */}
      <mesh position={[0, SEA_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[tunables.terrain.worldRadius * 2.6, tunables.terrain.worldRadius * 2.6]} />
        <meshStandardMaterial
          color={palette.ocean}
          roughness={0.4}
          metalness={0.15}
          transparent
          opacity={0.82}
        />
      </mesh>
      {/* Fond marin opaque sous la nappe : le large reste profond/opaque là où
          aucun chunk de terrain n'existe (sinon le ciel transparaîtrait). */}
      <mesh position={[0, SEA_Y - 10, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[tunables.terrain.worldRadius * 2.6, tunables.terrain.worldRadius * 2.6]} />
        <meshStandardMaterial color={palette.seabed} roughness={1} />
      </mesh>

      <TerrainChunks
        terrain={terrain}
        snowTemp={tunables.snowTemp}
        viewRadius={tunables.viewRadius}
        nearRadius={tunables.nearRadius}
      />
      <Vegetation
        terrain={terrain}
        airports={airports}
        snowTemp={tunables.snowTemp}
        density={tunables.vegDensity}
        radius={tunables.vegRadius}
      />

      {AIRPORTS.map((a) => (
        <group key={a.id}>
          <Runway airport={a} />
          <Windsock airport={a} />
        </group>
      ))}
      {airports.map((a) => (
        <group key={a.id}>
          <Runway airport={a} />
          <Windsock airport={a} />
        </group>
      ))}
    </group>
  )
}
