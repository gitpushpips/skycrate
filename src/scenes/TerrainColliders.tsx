import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { ColliderDesc, HeightFieldFlags } from '@dimforge/rapier3d-compat'
import type { Collider } from '@dimforge/rapier3d-compat'
import type { Terrain } from '../core/world/terrain'

/**
 * Colliders de terrain (3+E) : un HEIGHTFIELD Rapier par chunk, streamé autour
 * de la caméra (≈ l'avion) dans un rayon physique réduit — bien plus léger
 * qu'un trimesh, déchargé au-delà du rayon. L'avion roule, atterrit et crashe
 * vraiment sur le relief. Même découpe (256 m) et même résolution que le
 * maillage visuel proche (64 quads ⇒ surfaces identiques par construction).
 *
 * S1 : créés en IMPÉRATIF (world.createCollider) — le composant
 * <HeightfieldCollider> ne transmet pas les flags, or il faut
 * `FIX_INTERNAL_EDGES` : sans lui, les normales de contact aux arêtes
 * internes des triangles éjectent l'avion (« coups » fantômes mesurés à
 * 245× la force médiane, direction horizontale).
 */
const CHUNK_SIZE = 256
const RES = 64 // quads par côté (= LOD proche du rendu)
const GEN_BUDGET = 1 // heightfields construits max par frame (création BVH coûteuse)

/**
 * Échantillonne le chunk pour Rapier : matrice (RES+1)² en COLUMN-MAJOR,
 * colonnes le long de X, lignes le long de Z, centrée sur le chunk.
 */
function buildHeights(terrain: Terrain, cx: number, cz: number): Float32Array {
  const n = RES + 1
  const step = CHUNK_SIZE / RES
  const arr = new Float32Array(n * n)
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
  const { world } = useRapier()
  const st = useRef({
    cell: '',
    desired: [] as { key: string; cx: number; cz: number; dist: number }[],
    desiredKeys: new Set<string>(),
    have: new Map<string, Collider>(),
  })

  // Terrain/rayon changé ou démontage ⇒ retire tous les colliders du monde.
  useEffect(() => {
    const s = st.current
    return () => {
      for (const col of s.have.values()) world.removeCollider(col, false)
      s.have.clear()
      s.cell = ''
    }
  }, [terrain, radius, world])

  // Friction leva appliquée à chaud aux heightfields déjà créés.
  useEffect(() => {
    for (const col of st.current.have.values()) col.setFriction(friction)
  }, [friction])

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

    // Décharge immédiate de ce qui est sorti du rayon.
    for (const [key, col] of s.have) {
      if (!s.desiredKeys.has(key)) {
        world.removeCollider(col, false)
        s.have.delete(key)
      }
    }
    // Génération au budget, du plus proche au plus loin (collider fixe autonome).
    let budget = GEN_BUDGET
    for (const d of s.desired) {
      if (budget <= 0) break
      if (!s.have.has(d.key)) {
        const desc = ColliderDesc.heightfield(
          RES,
          RES,
          buildHeights(terrain, d.cx, d.cz),
          { x: CHUNK_SIZE, y: 1, z: CHUNK_SIZE },
          HeightFieldFlags.FIX_INTERNAL_EDGES,
        )
          .setTranslation((d.cx + 0.5) * CHUNK_SIZE, 0, (d.cz + 0.5) * CHUNK_SIZE)
          .setFriction(friction)
        s.have.set(d.key, world.createCollider(desc))
        budget--
      }
    }
  })

  return null
}
