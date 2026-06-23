import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { Plane } from './Plane'
import type { PlacedPart } from '../core/assembly'

/**
 * Fantôme de pose (Jalon 2-C) : rend le VRAI modèle de la pièce candidate, mais
 * translucide et teinté (vert = pose valide). On réutilise `Plane` puis on mute
 * les matériaux de l'instance — ils sont créés inline par mesh, donc propres à ce
 * fantôme (aucun effet sur l'avion réel).
 */
export function GhostPlane({ placed, valid = true }: { placed: PlacedPart; valid?: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const tint = valid ? '#6cff8f' : '#ff6b6b'
  const glow = valid ? '#1d6b2f' : '#6b1d1d'

  useLayoutEffect(() => {
    const g = ref.current
    if (!g) return
    g.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        const m = mesh.material as THREE.MeshStandardMaterial
        m.transparent = true
        m.opacity = 0.45
        m.depthWrite = false
        m.color.set(tint)
        if (m.emissive) m.emissive.set(glow)
      }
      o.raycast = () => null // ne capte jamais le pointeur
    })
  }, [placed, tint, glow])

  return (
    <group ref={ref}>
      <Plane assembly={{ id: 'ghost', name: 'ghost', parts: [placed] }} />
    </group>
  )
}
