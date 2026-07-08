import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, HeightfieldCollider } from '@react-three/rapier'
import type { Terrain } from '../core/world/terrain'

/**
 * Colliders de terrain (3+E) : un HEIGHTFIELD Rapier par chunk, streamé autour
 * de la caméra (≈ l'avion) dans un rayon physique réduit — bien plus léger
 * qu'un trimesh, déchargé au-delà du rayon. L'avion roule, atterrit et crashe
 * vraiment sur le relief. Même découpe (256 m) et même résolution que le
 * maillage visuel proche (64 quads ⇒ surfaces identiques par construction).
 */
const CHUNK_SIZE = 256
const RES = 64 // quads par côté (= LOD proche du rendu)
const GEN_BUDGET = 1 // heightfields construits max par frame (création BVH coûteuse)

interface ChunkHeights {
  key: string
  cx: number
  cz: number
  heights: number[]
}

/**
 * Échantillonne le chunk pour Rapier : matrice (RES+1)² en COLUMN-MAJOR,
 * colonnes le long de X, lignes le long de Z, centrée sur le chunk.
 */
function buildHeights(terrain: Terrain, cx: number, cz: number): number[] {
  const n = RES + 1
  const step = CHUNK_SIZE / RES
  const arr = new Array<number>(n * n)
  for (let j = 0; j < n; j++) {
    const x = cx * CHUNK_SIZE + j * step
    for (let i = 0; i < n; i++) {
      arr[j * n + i] = terrain.heightAt(x, cz * CHUNK_SIZE + i * step)
    }
  }
  return arr
}

export function TerrainColliders({
  terrain,
  radius,
  friction,
}: {
  terrain: Terrain
  radius: number
  friction: number
}) {
  const [chunks, setChunks] = useState<ChunkHeights[]>([])
  const st = useRef({
    cell: '',
    desired: [] as { key: string; cx: number; cz: number; dist: number }[],
    desiredKeys: new Set<string>(),
    have: new Map<string, ChunkHeights>(),
  })

  useEffect(() => {
    st.current = { cell: '', desired: [], desiredKeys: new Set(), have: new Map() }
    setChunks([])
  }, [terrain, radius])

  useFrame(({ camera }) => {
    const s = st.current
    const ccx = Math.floor(camera.position.x / CHUNK_SIZE)
    const ccz = Math.floor(camera.position.z / CHUNK_SIZE)
    const cell = `${ccx},${ccz}`
    if (cell !== s.cell) {
      s.cell = cell
      const r = Math.ceil(radius / CHUNK_SIZE)
      const desired: typeof s.desired = []
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const cx = ccx + dx
          const cz = ccz + dz
          const centerX = (cx + 0.5) * CHUNK_SIZE
          const centerZ = (cz + 0.5) * CHUNK_SIZE
          const dist = Math.hypot(centerX - camera.position.x, centerZ - camera.position.z)
          if (dist > radius) continue
          if (Math.hypot(centerX, centerZ) > terrain.params.worldRadius + CHUNK_SIZE) continue
          desired.push({ key: `${cx},${cz}`, cx, cz, dist })
        }
      }
      desired.sort((a, b) => a.dist - b.dist)
      s.desired = desired
      s.desiredKeys = new Set(desired.map((d) => d.key))
    }

    let dirty = false
    for (const key of s.have.keys()) {
      if (!s.desiredKeys.has(key)) {
        s.have.delete(key)
        dirty = true
      }
    }
    let budget = GEN_BUDGET
    for (const d of s.desired) {
      if (budget <= 0) break
      if (!s.have.has(d.key)) {
        s.have.set(d.key, { key: d.key, cx: d.cx, cz: d.cz, heights: buildHeights(terrain, d.cx, d.cz) })
        dirty = true
        budget--
      }
    }
    if (dirty) setChunks([...s.have.values()])
  })

  return (
    <RigidBody type="fixed" colliders={false}>
      {chunks.map((c) => (
        <HeightfieldCollider
          key={c.key}
          args={[RES, RES, c.heights, { x: CHUNK_SIZE, y: 1, z: CHUNK_SIZE }]}
          position={[(c.cx + 0.5) * CHUNK_SIZE, 0, (c.cz + 0.5) * CHUNK_SIZE]}
          friction={friction}
        />
      ))}
    </RigidBody>
  )
}
