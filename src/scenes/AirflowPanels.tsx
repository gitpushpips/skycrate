import { useRef } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const Z = new THREE.Vector3(0, 0, 1)

export interface VizPanel {
  position: readonly [number, number, number]
  normal: readonly [number, number, number]
  area: number
}

/**
 * Visualisation des zones exposées au flux (étape 5c). Un quad par panneau/surface,
 * orienté selon sa normale, recoloré chaque frame selon « face au vent » :
 * vert = aérodynamique (parallèle au flux), rouge = perpendiculaire (forte traînée).
 */
export function AirflowPanels({
  panels,
  facings,
  visible,
}: {
  panels: VizPanel[]
  facings: MutableRefObject<number[]>
  visible: boolean
}) {
  const meshes = useRef<(THREE.Mesh | null)[]>([])

  useFrame(() => {
    if (!visible) return
    const f = facings.current
    for (let i = 0; i < panels.length; i++) {
      const m = meshes.current[i]
      if (!m) continue
      const v = THREE.MathUtils.clamp(f[i] ?? 0, 0, 1)
      ;(m.material as THREE.MeshBasicMaterial).color.setRGB(v, 1 - v, 0.08)
    }
  })

  return (
    <group visible={visible}>
      {panels.map((p, i) => {
        const q = new THREE.Quaternion().setFromUnitVectors(
          Z,
          new THREE.Vector3(p.normal[0], p.normal[1], p.normal[2]).normalize(),
        )
        const s = Math.max(0.35, Math.sqrt(p.area))
        return (
          <mesh
            key={i}
            ref={(el) => {
              meshes.current[i] = el
            }}
            position={[p.position[0], p.position[1], p.position[2]]}
            quaternion={q}
          >
            <planeGeometry args={[s, s]} />
            <meshBasicMaterial color="#22cc44" side={THREE.DoubleSide} transparent opacity={0.55} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}
