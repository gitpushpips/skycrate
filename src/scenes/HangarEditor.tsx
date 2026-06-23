import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import { Plane } from './Plane'
import { GhostPlane } from './GhostPlane'
import { compileAircraft } from '../core/build/compile'
import { descendantsOf } from '../core/build/graph'
import type { CompiledAircraft, CompiledMount } from '../core/build/compile'
import type { Aircraft, PartNode } from '../core/build/graph'
import { useBuild } from '../store/build'

/**
 * Couche interactive de l'éditeur (Jalon 2-C). Sur le build affiché :
 *  - palette sélectionnée ⇒ surligne les MOUNTS, fantôme sous le pointeur,
 *    clic = pose (orthogonale à la surface, `R` = rotation snap 90°/45°).
 *  - sinon ⇒ boîtes de sélection cliquables ; `Del` retire, `Ctrl+Z` annule.
 * La connectivité est garantie par l'arbre (toute pièce a un parent).
 */

/** Rotation (Euler relatif au host) = `angle` autour de la normale du mount. */
function rotationForMount(mount: CompiledMount, angle: number): [number, number, number] {
  const axis = new THREE.Vector3(...mount.localNormal).normalize()
  const q = new THREE.Quaternion().setFromAxisAngle(axis, angle)
  const e = new THREE.Euler().setFromQuaternion(q)
  return [e.x, e.y, e.z]
}

export function HangarEditor({ aircraft }: { aircraft: CompiledAircraft }) {
  const graph = useBuild((s) => s.aircraft)
  const selectedPartId = useBuild((s) => s.selectedPartId)
  const selectedNodeId = useBuild((s) => s.selectedNodeId)
  const addPart = useBuild((s) => s.addPart)
  const removeNode = useBuild((s) => s.removeNode)
  const undo = useBuild((s) => s.undo)
  const selectPart = useBuild((s) => s.selectPart)
  const selectNode = useBuild((s) => s.selectNode)

  const [hoveredMountId, setHoveredMountId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [ghostAngle, setGhostAngle] = useState(0)

  // Télémétrie DEV (comme window.__plane en vol) : accès au store + projection des
  // mounts à l'écran, pour piloter/vérifier l'éditeur depuis la preview.
  const { camera, size } = useThree()
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as Record<string, unknown>).__hangar = {
      store: useBuild,
      mounts: aircraft.mounts,
      project: (p: [number, number, number]) => {
        const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera)
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height]
      },
    }
  }, [aircraft, camera, size])

  // Reset de la pose quand on change de pièce de palette.
  useEffect(() => {
    setGhostAngle(0)
    setHoveredMountId(null)
  }, [selectedPartId])

  // Raccourcis éditeur (actifs seulement en hangar : ce composant n'y est monté).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectPart(null)
        selectNode(null)
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        undo()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault()
        removeNode(selectedNodeId)
        return
      }
      if ((e.key === 'r' || e.key === 'R') && selectedPartId) {
        setGhostAngle((a) => a + (e.shiftKey ? Math.PI / 4 : Math.PI / 2))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedNodeId, selectedPartId, removeNode, undo, selectPart, selectNode])

  const assembly = useMemo(
    () => ({ id: 'build', name: 'build', parts: aircraft.placed }),
    [aircraft],
  )

  const hoveredMount = useMemo(
    () => aircraft.mounts.find((m) => m.id === hoveredMountId) ?? null,
    [aircraft, hoveredMountId],
  )

  // Fantôme : on compile un graphe temporaire (graphe + candidat) et on rend le
  // dernier `placed` ⇒ WYSIWYG exact avec la pose réelle.
  const ghostPlaced = useMemo(() => {
    if (!selectedPartId || !hoveredMount) return null
    const tempNode: PartNode = {
      nodeId: '__ghost__',
      partId: selectedPartId,
      parentId: hoveredMount.hostNodeId,
      position: hoveredMount.localPosition,
      rotation: rotationForMount(hoveredMount, ghostAngle),
    }
    const temp: Aircraft = { ...graph, nodes: [...graph.nodes, tempNode] }
    const compiled = compileAircraft(temp)
    return compiled.placed[compiled.placed.length - 1]
  }, [selectedPartId, hoveredMount, ghostAngle, graph])

  // Sous-arbre surligné = pièce sélectionnée + descendants (ce que `Del` retire).
  const highlighted = useMemo(() => {
    if (!selectedNodeId) return null
    const set = new Set([selectedNodeId, ...descendantsOf(graph, selectedNodeId).map((n) => n.nodeId)])
    return set
  }, [selectedNodeId, graph])

  const placeAt = (mount: CompiledMount) => {
    if (!selectedPartId) return
    addPart(mount.hostNodeId, selectedPartId, mount.localPosition, rotationForMount(mount, ghostAngle))
  }

  return (
    <group>
      <Plane assembly={assembly} />

      {/* Fantôme de pose. */}
      {ghostPlaced && <GhostPlane placed={ghostPlaced} />}

      {/* Mounts cliquables (uniquement quand une pièce de palette est sélectionnée). */}
      {selectedPartId &&
        aircraft.mounts.map((m) => {
          const hot = hoveredMountId === m.id
          return (
            <mesh
              key={m.id}
              position={m.position}
              onPointerOver={(e) => {
                e.stopPropagation()
                setHoveredMountId(m.id)
              }}
              onPointerMove={(e) => {
                e.stopPropagation()
                if (hoveredMountId !== m.id) setHoveredMountId(m.id)
              }}
              onPointerOut={() => setHoveredMountId((cur) => (cur === m.id ? null : cur))}
              onClick={(e) => {
                e.stopPropagation()
                placeAt(m)
              }}
            >
              <sphereGeometry args={[hot ? 0.26 : 0.2, 16, 16]} />
              <meshBasicMaterial
                color={hot ? '#ffd24a' : '#5bd06a'}
                transparent
                opacity={hot ? 0.95 : 0.55}
                depthTest={false}
              />
            </mesh>
          )
        })}

      {/* Boîtes de sélection (quand aucune pièce de palette n'est sélectionnée). */}
      {!selectedPartId &&
        aircraft.colliders.map((c, i) => {
          const hot = hoveredNodeId === c.nodeId
          return (
            <mesh
              key={`pick${i}`}
              position={c.position}
              rotation={c.rotation}
              onClick={(e) => {
                e.stopPropagation()
                selectNode(c.nodeId)
              }}
              onPointerOver={(e) => {
                e.stopPropagation()
                setHoveredNodeId(c.nodeId)
              }}
              onPointerOut={() => setHoveredNodeId((cur) => (cur === c.nodeId ? null : cur))}
            >
              <boxGeometry args={[c.half[0] * 2, c.half[1] * 2, c.half[2] * 2]} />
              <meshBasicMaterial transparent opacity={hot ? 0.12 : 0} depthWrite={false} color="#ffffff" />
            </mesh>
          )
        })}

      {/* Surlignage du sous-arbre sélectionné (arêtes). */}
      {highlighted &&
        aircraft.colliders
          .filter((c) => highlighted.has(c.nodeId))
          .map((c, i) => (
            <mesh key={`hl${i}`} position={c.position} rotation={c.rotation} raycast={() => null}>
              <boxGeometry args={[c.half[0] * 2 + 0.06, c.half[1] * 2 + 0.06, c.half[2] * 2 + 0.06]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              <Edges color={c.nodeId === selectedNodeId ? '#ffcf5a' : '#7fa8ff'} />
            </mesh>
          ))}
    </group>
  )
}
