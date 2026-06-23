import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import type { WorldTf } from '../core/build/compile'
import { useBuild } from '../store/build'

/**
 * Gizmo de transformation (Jalon 2-C bis) sur la pièce sélectionnée : flèches
 * (translate) ou sphère d'axes (rotate), façon Aviassembly. Le gizmo manipule un
 * proxy au transform MONDE de la pièce ; on reconvertit en LOCAL (sous le parent)
 * et on écrit dans le graphe ⇒ la physique suit. Pas d'angle réglable (90/45/libre).
 */
export function TransformGizmo({
  world,
  parentWorld,
}: {
  world: WorldTf
  parentWorld: WorldTf
}) {
  const selectedNodeId = useBuild((s) => s.selectedNodeId)
  const transformMode = useBuild((s) => s.transformMode)
  const rotateSnapDeg = useBuild((s) => s.rotateSnapDeg)
  const updateNode = useBuild((s) => s.updateNode)
  const pushHistory = useBuild((s) => s.pushHistory)

  const [proxy, setProxy] = useState<THREE.Object3D | null>(null)
  const dragging = useRef(false)
  const orbit = useThree((s) => s.controls) as { enabled?: boolean } | null

  // Resynchronise le proxy sur le transform monde de la pièce (hors drag).
  useEffect(() => {
    if (!proxy || dragging.current) return
    proxy.position.copy(world.pos)
    proxy.quaternion.copy(world.quat)
    proxy.updateMatrixWorld()
  }, [proxy, world])

  const commit = () => {
    if (!proxy || !selectedNodeId) return
    const inv = parentWorld.quat.clone().invert()
    const lp = proxy.position.clone().sub(parentWorld.pos).applyQuaternion(inv)
    const lq = inv.clone().multiply(proxy.quaternion)
    const e = new THREE.Euler().setFromQuaternion(lq)
    updateNode(selectedNodeId, { position: [lp.x, lp.y, lp.z], rotation: [e.x, e.y, e.z] })
  }

  const snap = transformMode === 'rotate' && rotateSnapDeg > 0 ? THREE.MathUtils.degToRad(rotateSnapDeg) : null

  return (
    <>
      <object3D ref={setProxy} />
      {proxy && (
        <TransformControls
          object={proxy}
          mode={transformMode}
          space={transformMode === 'rotate' ? 'local' : 'world'}
          rotationSnap={snap}
          size={0.8}
          onMouseDown={() => {
            dragging.current = true
            if (orbit) orbit.enabled = false
            pushHistory()
          }}
          onMouseUp={() => {
            dragging.current = false
            if (orbit) orbit.enabled = true
          }}
          onObjectChange={commit}
        />
      )}
    </>
  )
}
