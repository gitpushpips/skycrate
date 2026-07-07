import { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'
import { palette } from './palette'
import { mulberry32 } from './rng'

type Tree = { x: number; z: number; s: number; rot: number; tint: number }
type Hill = { x: number; z: number; s: number; rot: number }

const TREE_COUNT = 64

function useScatter() {
  return useMemo(() => {
    const rng = mulberry32(20260620)
    const trees: Tree[] = []
    let guard = 0
    while (trees.length < TREE_COUNT && guard++ < TREE_COUNT * 30) {
      const x = (rng() - 0.5) * 300
      const z = (rng() - 0.5) * 300
      const r = Math.hypot(x, z)
      // Garder dégagés : couloir de piste (nord-sud) + premier plan ; rester sur
      // le plateau de l'île de départ (rayon 150).
      if (Math.abs(x) < 26 && Math.abs(z) < 110) continue
      if (r < 34 || r > 140) continue
      trees.push({ x, z, s: 0.7 + rng() * 1.2, rot: rng() * Math.PI * 2, tint: rng() })
    }

    const hills: Hill[] = []
    return { trees, hills }
  }, [])
}

/**
 * Décor low-poly (instancié pour les perfs) : arbres coniques + collines
 * lointaines qui se fondent dans le fog. Purement décoratif / placeholder pour
 * mettre en valeur l'éclairage, les ombres et la profondeur — sera remplacé par
 * le vrai monde plus tard.
 */
export function Scenery() {
  const { trees, hills } = useScatter()

  return (
    <group>
      {/* Troncs */}
      <Instances limit={TREE_COUNT} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.22, 1.4, 6]} />
        <meshStandardMaterial color={palette.treeTrunk} flatShading />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 0.7 * t.s, t.z]} rotation={[0, t.rot, 0]} scale={t.s} />
        ))}
      </Instances>

      {/* Feuillage (cône bas) */}
      <Instances limit={TREE_COUNT} castShadow>
        <coneGeometry args={[1.35, 2.3, 7]} />
        <meshStandardMaterial color={palette.treeFoliage} flatShading />
        {trees.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, 2.1 * t.s, t.z]}
            rotation={[0, t.rot, 0]}
            scale={t.s}
            color={t.tint > 0.5 ? palette.treeFoliage : palette.treeFoliageAlt}
          />
        ))}
      </Instances>

      {/* Feuillage (cône haut) */}
      <Instances limit={TREE_COUNT} castShadow>
        <coneGeometry args={[0.95, 1.8, 7]} />
        <meshStandardMaterial color={palette.treeFoliageAlt} flatShading />
        {trees.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, 3.2 * t.s, t.z]}
            rotation={[0, t.rot + 0.4, 0]}
            scale={t.s}
            color={t.tint > 0.5 ? palette.treeFoliageAlt : palette.treeFoliage}
          />
        ))}
      </Instances>

      {/* Collines lointaines (silhouette dans le fog) */}
      <Instances limit={hills.length} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={palette.hill} flatShading />
        {hills.map((h, i) => (
          <Instance
            key={i}
            position={[h.x, h.s * 0.18, h.z]}
            rotation={[0, h.rot, 0]}
            scale={[h.s, h.s * 0.5, h.s]}
          />
        ))}
      </Instances>
    </group>
  )
}
