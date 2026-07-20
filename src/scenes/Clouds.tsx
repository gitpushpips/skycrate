import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../core/rng'

/**
 * Nuages low-poly (détails du monde) : amas de « bouffées » instanciées,
 * déterministes par seed et streamés autour de la caméra — le ciel n'était
 * qu'un dégradé, or en vol ce sont les nuages qui donnent l'ÉCHELLE, l'altitude
 * et la sensation de vitesse.
 *
 * Un seul InstancedMesh (1 draw call) pour tout le ciel. **Statiques** : la
 * convention du monde est temps + soleil FIGÉS (cf. règle de navigation, le
 * soleil = nord est le seul repère de cap) — des nuages qui dérivent
 * contrediraient ce parti pris. Pas d'ombres portées (coût, et elles
 * assombriraient le sol de façon incohérente avec le soleil fixe).
 */
const CLOUD_CELL = 700 // taille de cellule de placement (m)
const MAX_PUFFS = 900

interface Puff {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  rot: number
  tint: number
}

/** Amas d'une cellule : 0-2 nuages, chacun = un chapelet de bouffées. */
function genCell(seed: number, cx: number, cz: number, altitude: number, spread: number, density: number): Puff[] {
  const rng = mulberry32(((cx * 92837111) ^ (cz * 689287499) ^ (seed + 909)) >>> 0)
  const out: Puff[] = []
  const n = rng() < density * 0.55 ? (rng() < density * 0.3 ? 2 : 1) : 0
  for (let c = 0; c < n; c++) {
    const baseX = cx * CLOUD_CELL + rng() * CLOUD_CELL
    const baseZ = cz * CLOUD_CELL + rng() * CLOUD_CELL
    const baseY = altitude + (rng() - 0.5) * 2 * spread
    // Un nuage = 4 à 9 bouffées aplaties, alignées sur un axe (aspect cumulus).
    const puffs = 4 + Math.floor(rng() * 6)
    const axis = rng() * Math.PI * 2
    const len = 14 + rng() * 26
    const scale = 0.8 + rng() * 0.9
    for (let i = 0; i < puffs; i++) {
      const t = puffs === 1 ? 0 : i / (puffs - 1) - 0.5
      // Les bouffées du centre sont plus grosses ⇒ silhouette bombée.
      const bulge = 1 - Math.abs(t) * 1.15
      const r = (9 + rng() * 7) * scale * Math.max(0.35, bulge)
      out.push({
        x: baseX + Math.cos(axis) * t * len + (rng() - 0.5) * 7,
        y: baseY + (rng() - 0.5) * 5 + bulge * 3,
        z: baseZ + Math.sin(axis) * t * len + (rng() - 0.5) * 7,
        sx: r,
        sy: r * (0.5 + rng() * 0.22), // aplaties : les cumulus sont larges, pas sphériques
        sz: r * (0.85 + rng() * 0.3),
        rot: rng() * Math.PI * 2,
        tint: rng(),
      })
    }
  }
  return out
}

const C_TOP = new THREE.Color('#ffffff')
const C_BELLY = new THREE.Color('#c3d4e2') // ventre légèrement bleuté (volume)

const tmpM = new THREE.Matrix4()
const tmpP = new THREE.Vector3()
const tmpQ = new THREE.Quaternion()
const tmpE = new THREE.Euler()
const tmpS = new THREE.Vector3()
const tmpC = new THREE.Color()

export function Clouds({
  seed,
  altitude,
  spread,
  density,
  radius,
}: {
  seed: number
  altitude: number
  spread: number
  density: number
  radius: number
}) {
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, metalness: 0 }),
    [],
  )
  const mesh = useRef<THREE.InstancedMesh>(null)
  const st = useRef({ cell: '', cells: new Map<string, Puff[]>() })

  useEffect(() => {
    st.current = { cell: '', cells: new Map() }
  }, [seed, altitude, spread, density, radius])

  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )

  useFrame(({ camera }) => {
    const s = st.current
    const ccx = Math.floor(camera.position.x / CLOUD_CELL)
    const ccz = Math.floor(camera.position.z / CLOUD_CELL)
    const cell = `${ccx},${ccz}`
    if (cell === s.cell) return
    s.cell = cell

    const r = Math.ceil(radius / CLOUD_CELL)
    const wanted = new Set<string>()
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const cx = ccx + dx
        const cz = ccz + dz
        const centerX = (cx + 0.5) * CLOUD_CELL
        const centerZ = (cz + 0.5) * CLOUD_CELL
        if (Math.hypot(centerX - camera.position.x, centerZ - camera.position.z) > radius) continue
        const key = `${cx},${cz}`
        wanted.add(key)
        if (!s.cells.has(key)) s.cells.set(key, genCell(seed, cx, cz, altitude, spread, density))
      }
    }
    for (const key of s.cells.keys()) if (!wanted.has(key)) s.cells.delete(key)

    const im = mesh.current
    if (!im) return
    let n = 0
    for (const list of s.cells.values()) {
      for (const p of list) {
        if (n >= MAX_PUFFS) break
        tmpP.set(p.x, p.y, p.z)
        tmpQ.setFromEuler(tmpE.set(0, p.rot, 0))
        tmpS.set(p.sx, p.sy, p.sz)
        tmpM.compose(tmpP, tmpQ, tmpS)
        im.setMatrixAt(n, tmpM)
        // Teinte : blanc pur au sommet, ventre bleuté ⇒ lecture du volume.
        tmpC.copy(C_TOP).lerp(C_BELLY, 0.25 + p.tint * 0.35)
        im.setColorAt(n, tmpC)
        n++
      }
    }
    im.count = n
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geo, mat, MAX_PUFFS]} frustumCulled={false} />
}
