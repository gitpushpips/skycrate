import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Terrain } from '../core/world/terrain'

/**
 * Terrain chunké (3+A) : le monde est découpé en tuiles carrées générées à la
 * demande autour de la caméra (streaming), déchargées au-delà du rayon de vue.
 * - LOD 2 niveaux : plein détail près de l'avion, demi-résolution au loin.
 * - Budget de génération par frame ⇒ pas de hitch en vol (apparition progressive).
 * - Couleurs de sommets par altitude/pente (placeholder lisible : sable → herbe
 *   → roche sur pentes → neige de sommet) ; les vrais biomes fondus = 3+C.
 */
const CHUNK_SIZE = 256 // taille d'une tuile (m)
const RES_NEAR = 64 // quads par côté (plein détail : 4 m/sommet)
const RES_FAR = 32 // quads par côté (LOD lointain : 8 m/sommet)
const GEN_BUDGET = 3 // géométries construites max par frame

interface ChunkSpec {
  key: string
  cx: number
  cz: number
  res: number
}

// Rampe biomique partagée avec la carte (MapOverlay) — cf. terrainRamp.ts.
import { rampColor } from './terrainRamp'

function buildChunkGeometry(
  terrain: Terrain,
  cx: number,
  cz: number,
  res: number,
  snowTemp: number,
): THREE.BufferGeometry {
  const step = CHUNK_SIZE / res
  const n = res + 1
  const ox = cx * CHUNK_SIZE
  const oz = cz * CHUNK_SIZE

  // 1er passage : hauteurs (grille), positions en repère LOCAL du chunk.
  const heights = new Float32Array(n * n)
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) heights[j * n + i] = terrain.heightAt(ox + i * step, oz + j * step)

  // 2e passage : couleurs (pente estimée par différences sur la grille — gratuit).
  const positions = new Float32Array(n * n * 3)
  const colors = new Float32Array(n * n * 3)
  const color = new THREE.Color()
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i
      const h = heights[k]
      const wx = ox + i * step
      const wz = oz + j * step
      positions[k * 3] = i * step
      positions[k * 3 + 1] = h
      positions[k * 3 + 2] = j * step

      const i0 = Math.max(0, i - 1)
      const i1 = Math.min(res, i + 1)
      const j0 = Math.max(0, j - 1)
      const j1 = Math.min(res, j + 1)
      const dx = (heights[j * n + i1] - heights[j * n + i0]) / ((i1 - i0) * step)
      const dz = (heights[j1 * n + i] - heights[j0 * n + i]) / ((j1 - j0) * step)
      const { temperature, humidity } = terrain.climateAt(wx, wz, h)
      rampColor(color, h, Math.hypot(dx, dz), temperature, humidity, snowTemp)
      colors[k * 3] = color.r
      colors[k * 3 + 1] = color.g
      colors[k * 3 + 2] = color.b
    }
  }

  // Index (2 triangles/quad, CCW vus de dessus → normales +Y).
  const indices = new Uint32Array(res * res * 6)
  let ptr = 0
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const a = j * n + i
      const b = a + 1
      const c = a + n
      const d = c + 1
      indices[ptr++] = a
      indices[ptr++] = c
      indices[ptr++] = b
      indices[ptr++] = b
      indices[ptr++] = c
      indices[ptr++] = d
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  geo.computeVertexNormals()
  return geo
}

/** Matériau partagé (flat shading = D.A. low-poly, couleurs par sommet). */
const terrainMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.96,
  metalness: 0,
})

function TerrainChunk({
  terrain,
  spec,
  snowTemp,
}: {
  terrain: Terrain
  spec: ChunkSpec
  snowTemp: number
}) {
  const geometry = useMemo(
    () => buildChunkGeometry(terrain, spec.cx, spec.cz, spec.res, snowTemp),
    [terrain, spec.cx, spec.cz, spec.res, snowTemp],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh
      geometry={geometry}
      material={terrainMaterial}
      position={[spec.cx * CHUNK_SIZE, 0, spec.cz * CHUNK_SIZE]}
      receiveShadow
    />
  )
}

export function TerrainChunks({
  terrain,
  snowTemp,
  viewRadius,
  nearRadius,
}: {
  terrain: Terrain
  snowTemp: number
  viewRadius: number
  nearRadius: number
}) {
  const [chunks, setChunks] = useState<ChunkSpec[]>([])
  const st = useRef({
    cell: '',
    desired: [] as (ChunkSpec & { dist: number })[],
    desiredRes: new Map<string, number>(),
    have: new Map<string, number>(),
  })

  // Terrain ou réglages changés ⇒ reset complet du streaming (régénération).
  useEffect(() => {
    st.current.cell = ''
    st.current.desired = []
    st.current.desiredRes = new Map()
    st.current.have = new Map()
    setChunks([])
  }, [terrain, snowTemp, viewRadius, nearRadius])

  useFrame(({ camera }) => {
    const s = st.current
    const ccx = Math.floor(camera.position.x / CHUNK_SIZE)
    const ccz = Math.floor(camera.position.z / CHUNK_SIZE)
    const cell = `${ccx},${ccz}`

    // Liste des chunks voulus, recalculée seulement au changement de cellule.
    if (cell !== s.cell) {
      s.cell = cell
      const r = Math.ceil(viewRadius / CHUNK_SIZE)
      const desired: (ChunkSpec & { dist: number })[] = []
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const cx = ccx + dx
          const cz = ccz + dz
          const centerX = (cx + 0.5) * CHUNK_SIZE
          const centerZ = (cz + 0.5) * CHUNK_SIZE
          const dist = Math.hypot(centerX - camera.position.x, centerZ - camera.position.z)
          if (dist > viewRadius) continue
          // Tuiles entièrement au large (continent + marge) : l'océan suffit.
          if (Math.hypot(centerX, centerZ) > terrain.params.worldRadius + CHUNK_SIZE) continue
          const res = dist < nearRadius ? RES_NEAR : RES_FAR
          desired.push({ key: `${cx},${cz}`, cx, cz, res, dist })
        }
      }
      desired.sort((a, b) => a.dist - b.dist)
      s.desired = desired
      s.desiredRes = new Map(desired.map((d) => [d.key, d.res]))
    }

    let dirty = false
    // Décharge immédiate de ce qui est sorti du rayon.
    for (const key of s.have.keys()) {
      if (!s.desiredRes.has(key)) {
        s.have.delete(key)
        dirty = true
      }
    }
    // Génération/changement de LOD au budget, du plus proche au plus loin.
    let budget = GEN_BUDGET
    for (const d of s.desired) {
      if (budget <= 0) break
      if (s.have.get(d.key) !== d.res) {
        s.have.set(d.key, d.res)
        dirty = true
        budget--
      }
    }
    if (dirty) {
      setChunks(
        [...s.have.entries()].map(([key, res]) => {
          const [cx, cz] = key.split(',').map(Number)
          return { key, cx, cz, res }
        }),
      )
    }
  })

  return (
    <>
      {chunks.map((c) => (
        <TerrainChunk key={`${c.key}:${c.res}`} terrain={terrain} spec={c} snowTemp={snowTemp} />
      ))}
    </>
  )
}
