import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { palette } from './palette'
import { AIRPORTS, SEA_Y } from '../core/world/world'
import type { Airport } from '../core/world/world'
import type { Terrain, TerrainParams } from '../core/world/terrain'
import { buildWorld } from '../core/world/airports'
import { buildAirportDecor } from '../core/world/airportDecor'
import { AirportDecor } from './AirportDecor'
import { TerrainChunks } from './Terrain'
import { Vegetation } from './Vegetation'
import { useWorldTunables } from './worldControls'
import { useWorldUi } from '../store/world'

/**
 * Monde ouvert (3+A/B/C/D) — rendu : océan + terrain procédural chunké +
 * végétation + aérodromes (piste de départ fixe + sites générés, terrain
 * aplani sous chaque pad). Convention soleil = NORD = -Z. Les colliders
 * physiques sont montés à part dans `FlightScene` (mêmes données buildWorld).
 */
function Runway({ airport }: { airport: Airport }) {
  const [x, y, z] = airport.position
  const { runwayLength: L, runwayWidth: W } = airport
  // Marquages (seuils + pointillés d'axe) FUSIONNÉS en une seule géométrie :
  // 2 draw calls par piste au lieu de ~13 (jalon perf).
  const markings = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    const quad = (w: number, l: number, zz: number, yy: number) => {
      const g = new THREE.PlaneGeometry(w, l)
      g.rotateX(-Math.PI / 2)
      g.translate(0, yy, zz)
      parts.push(g)
    }
    quad(W * 0.8, 1.6, -L / 2 + 3, 0.02) // seuils
    quad(W * 0.8, 1.6, L / 2 - 3, 0.02)
    const n = Math.max(5, Math.round(L / 18))
    const gap = L / n
    for (let i = 0; i < n; i++) quad(0.6, 6, -L / 2 + gap * (i + 0.5), 0.03) // axe
    const merged = mergeGeometries(parts)
    for (const g of parts) g.dispose()
    return merged
  }, [L, W])
  return (
    <group position={[x, y + 0.02, z]} rotation={[0, airport.heading, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial color={palette.runway} roughness={0.95} />
      </mesh>
      <mesh geometry={markings}>
        <meshStandardMaterial color={palette.runwayLine} />
      </mesh>
    </group>
  )
}

/** Faisceau vertical au marqueur posé sur la carte (repère de navigation). */
function MarkerBeam({ terrain, x, z }: { terrain: Terrain; x: number; z: number }) {
  const y = useMemo(() => Math.max(terrain.heightAt(x, z), SEA_Y), [terrain, x, z])
  return (
    <mesh position={[x, y + 260, z]}>
      <cylinderGeometry args={[2.4, 2.4, 520, 8, 1, true]} />
      <meshBasicMaterial
        color={palette.windsock}
        transparent
        opacity={0.4}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/**
 * Landmark (3+E) : PHARE posé sur le cap côtier le plus avancé du continent —
 * repère de navigation distinctif, déterministe par seed (les autres repères
 * sont organiques : pic culminant, grands lacs, découpes de côte).
 */
function findCape(terrain: Terrain): [number, number, number] | null {
  const R = terrain.params.worldRadius
  let best: { r: number; th: number } | null = null
  for (let k = 0; k < 96; k++) {
    const th = (k / 96) * Math.PI * 2
    let lastLand: number | null = null
    for (let r = R * 0.55; r < R * 1.02; r += 22) {
      if (terrain.heightAt(Math.cos(th) * r, Math.sin(th) * r) > 1.5) lastLand = r
    }
    if (lastLand !== null && (best === null || lastLand > best.r)) best = { r: lastLand, th }
  }
  if (!best) return null
  const x = Math.cos(best.th) * (best.r - 8)
  const z = Math.sin(best.th) * (best.r - 8)
  return [x, terrain.heightAt(x, z), z]
}

function Lighthouse({ at }: { at: [number, number, number] }) {
  const [x, y, z] = at
  return (
    <group position={[x, y, z]}>
      {/* Socle rocheux */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <icosahedronGeometry args={[4.6, 0]} />
        <meshStandardMaterial color={palette.terrainRock} flatShading />
      </mesh>
      {/* Tour à bandes (blanc/rouge) */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 3.4 + i * 3.1, 0]} castShadow>
          <cylinderGeometry args={[2.15 - i * 0.22, 2.3 - i * 0.22, 3.1, 10]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#e8e4da' : '#c0392b'} flatShading />
        </mesh>
      ))}
      {/* Lanterne */}
      <mesh position={[0, 16.2, 0]}>
        <cylinderGeometry args={[1.25, 1.25, 1.7, 8]} />
        <meshStandardMaterial color={palette.planeGlass} emissive="#ffd97a" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 17.6, 0]} castShadow>
        <coneGeometry args={[1.5, 1.4, 8]} />
        <meshStandardMaterial color="#c0392b" flatShading />
      </mesh>
    </group>
  )
}

/** Manche à air en bord de piste — repère visuel d'aérodrome, ANIMÉE (S5) :
 *  la chaussette oscille doucement (phase par position ⇒ pas de synchro). */
function Windsock({ airport }: { airport: Airport }) {
  const [x, y, z] = airport.position
  const sock = useRef<THREE.Group>(null)
  const phase = useMemo(() => ((x * 3.1 + z * 1.7) % Math.PI) * 2, [x, z])
  useFrame(({ clock }) => {
    const g = sock.current
    if (!g) return
    const t = clock.elapsedTime
    g.rotation.y = Math.sin(t * 0.6 + phase) * 0.5 + Math.sin(t * 1.9 + phase * 2) * 0.12
    g.rotation.z = Math.sin(t * 2.6 + phase) * 0.05 // flottement léger
  })
  return (
    <group position={[x, y, z]} rotation={[0, airport.heading, 0]}>
      <group position={[airport.runwayWidth / 2 + 6, 0, -airport.runwayLength * 0.25]}>
        <mesh position={[0, 2.1, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 4.2, 5]} />
          <meshStandardMaterial color={palette.planeStrut} />
        </mesh>
        <group position={[0, 4.0, 0]} ref={sock}>
          <mesh position={[0.7, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
            <coneGeometry args={[0.32, 1.4, 6, 1, true]} />
            <meshStandardMaterial color={palette.windsock} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

export function World() {
  const tunables = useWorldTunables()
  const marker = useWorldUi((s) => s.marker)
  // Régénération uniquement quand un param change réellement (clé par valeur) ;
  // buildWorld mémoïse par la même clé ⇒ instance partagée avec FlightScene.
  const terrainKey = JSON.stringify(tunables.terrain)
  const world = useMemo(() => buildWorld(JSON.parse(terrainKey) as TerrainParams), [terrainKey])
  const { terrain, airports } = world
  const decor = useMemo(() => buildAirportDecor(world), [world])
  const cape = useMemo(() => findCape(terrain), [terrain])

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
      {/* Décor d'aérodromes (S5) : hangars/tour/citernes/caisses/feux par biome. */}
      <AirportDecor decor={decor} />

      {cape && <Lighthouse at={cape} />}
      {marker && <MarkerBeam terrain={terrain} x={marker[0]} z={marker[1]} />}
    </group>
  )
}
