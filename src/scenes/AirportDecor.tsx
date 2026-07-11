import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Instances, Instance } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { AirportDecorData, DecorInstance, DecorKind } from '../core/world/airportDecor'

/**
 * Rendu du décor d'aérodromes (S5) : chaque archétype (hangar, toit, tour,
 * citerne, caisse, feu de piste…) = UN InstancedMesh pour TOUS les aérodromes
 * (~10 draw calls au total, statique). Les couleurs par biome viennent des
 * données (`core/world/airportDecor`). Seul le gyrophare est animé (pulse de
 * matériau partagé, coût nul).
 */

// ——— Géométries unitaires (base au sol, mises à l'échelle par instance) ———
function makeGeometries() {
  const apron = new THREE.PlaneGeometry(1, 1)
  apron.rotateX(-Math.PI / 2)

  const hangar = new THREE.BoxGeometry(1, 1, 1)

  // Toit à deux pans : prisme triangulaire (base 1×1 au sol, faîte à y=1,
  // arête le long de Z) depuis un cylindre 3 segments couché.
  const roof = new THREE.CylinderGeometry(0.5774, 0.5774, 1, 3)
  roof.rotateX(-Math.PI / 2)
  roof.translate(0, 0.2887, 0)
  roof.scale(1, 1 / 0.866, 1)

  const door = new THREE.PlaneGeometry(1, 1)

  // Tour : fût évasé (hauteur unitaire, scale y = hauteur réelle).
  const tower = new THREE.CylinderGeometry(1.05, 1.55, 1, 8)
  tower.translate(0, 0.5, 0)

  // Vigie : cube vitré + casquette basse (unité, scale ~[3.4, 2.2, 3.4]).
  const cabBox = new THREE.BoxGeometry(1, 1, 1)
  const cabBrim = new THREE.BoxGeometry(1.35, 0.06, 1.35)
  cabBrim.translate(0, -0.52, 0)
  const towerCab = mergeGeometries([cabBox, cabBrim])

  // Citerne : cuve horizontale sur berceaux + pompe et colonne de remplissage.
  const drum = new THREE.CylinderGeometry(1.05, 1.05, 3.2, 10)
  drum.rotateX(Math.PI / 2)
  drum.translate(0, 1.55, 0)
  const leg1 = new THREE.BoxGeometry(2.0, 1.0, 0.35)
  leg1.translate(0, 0.5, -1.0)
  const leg2 = new THREE.BoxGeometry(2.0, 1.0, 0.35)
  leg2.translate(0, 0.5, 1.0)
  const pump = new THREE.BoxGeometry(0.7, 1.1, 0.5)
  pump.translate(1.5, 0.55, 1.9)
  const pipe = new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6)
  pipe.translate(1.5, 1.5, 1.9)
  const tank = mergeGeometries([drum, leg1, leg2, pump, pipe])

  const crate = new THREE.BoxGeometry(1, 1, 1)
  const edgeLight = new THREE.OctahedronGeometry(0.26, 0)
  const beacon = new THREE.SphereGeometry(0.34, 10, 8)

  return { apron, hangar, roof, door, tower, towerCab, tank, crate, edgeLight, beacon }
}

// Matériaux partagés (couleur PAR INSTANCE sur le blanc, comme la végétation).
const tintMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true })
const apronMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 })
const doorMat = new THREE.MeshStandardMaterial({ color: '#23262b', roughness: 0.8 })
const lightMat = new THREE.MeshBasicMaterial({ color: '#ffb347' })
const beaconMat = new THREE.MeshStandardMaterial({
  color: '#d8423a',
  emissive: '#ff4b3a',
  emissiveIntensity: 1.5,
})

function Batch({
  items,
  geometry,
  material,
  castShadow = false,
  receiveShadow = false,
}: {
  items: DecorInstance[]
  geometry: THREE.BufferGeometry
  material: THREE.Material
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  if (items.length === 0) return null
  return (
    <Instances
      key={items.length} // remonte le buffer si le seed change le nombre d'items
      limit={items.length}
      geometry={geometry}
      material={material}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    >
      {items.map((it, i) => (
        <Instance
          key={i}
          position={it.position}
          rotation={[0, it.rotY, 0]}
          scale={it.scale}
          color={it.color}
        />
      ))}
    </Instances>
  )
}

export function AirportDecor({ decor }: { decor: AirportDecorData }) {
  const geos = useMemo(makeGeometries, [])
  const byKind = useMemo(() => {
    const m = new Map<DecorKind, DecorInstance[]>()
    for (const it of decor.items) {
      const list = m.get(it.kind)
      if (list) list.push(it)
      else m.set(it.kind, [it])
    }
    return (k: DecorKind) => m.get(k) ?? []
  }, [decor])

  // Gyrophares : pulse du matériau PARTAGÉ (tous en phase — un seul uniform).
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current += dt
    beaconMat.emissiveIntensity = 1.1 + Math.max(0, Math.sin(t.current * 3.2)) * 2.2
  })

  return (
    <group>
      <Batch items={byKind('apron')} geometry={geos.apron} material={apronMat} receiveShadow />
      <Batch items={byKind('hangar')} geometry={geos.hangar} material={tintMat} castShadow receiveShadow />
      <Batch items={byKind('hangarRoof')} geometry={geos.roof} material={tintMat} castShadow />
      <Batch items={byKind('hangarDoor')} geometry={geos.door} material={doorMat} />
      <Batch items={byKind('tower')} geometry={geos.tower} material={tintMat} castShadow />
      <Batch items={byKind('towerCab')} geometry={geos.towerCab} material={tintMat} castShadow />
      <Batch items={byKind('tank')} geometry={geos.tank} material={tintMat} castShadow />
      <Batch items={byKind('crate')} geometry={geos.crate} material={tintMat} castShadow receiveShadow />
      <Batch items={byKind('edgeLight')} geometry={geos.edgeLight} material={lightMat} />
      <Batch items={byKind('beacon')} geometry={geos.beacon} material={beaconMat} />
    </group>
  )
}
