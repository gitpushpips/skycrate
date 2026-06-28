import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import { Plane } from './Plane'
import { GhostPlane } from './GhostPlane'
import { TransformGizmo } from './TransformGizmo'
import { compileAircraft } from '../core/build/compile'
import { descendantsOf } from '../core/build/graph'
import { getPart } from '../core/parts'
import { getBlueprint } from '../core/parts/blueprints'
import { canAfford } from '../core/economy'
import type { CompiledAircraft, WorldTf } from '../core/build/compile'
import type { Aircraft, PartNode } from '../core/build/graph'
import { useBuild } from '../store/build'

/**
 * Couche interactive de l'éditeur. Sur le build affiché :
 *  - palette sélectionnée ⇒ **snap par surface** : on survole n'importe quelle
 *    pièce, un fantôme se pose au contact (orienté selon la normale, `R` = pivote)
 *    et le clic pose la pièce comme enfant de la pièce touchée.
 *  - sinon ⇒ boîtes de sélection cliquables + gizmo ; `Del` retire, `Ctrl+Z` annule.
 * La connectivité est garantie par l'arbre (toute pièce a un parent).
 */
const UP = new THREE.Vector3(0, 1, 0)

/** Surface touchée par le pointeur (repère avion). */
interface SurfaceHit {
  nodeId: string
  point: [number, number, number]
  normal: [number, number, number]
}

/** Distance origine → face inférieure de la pièce (pour la poser SUR la surface). */
function attachOffset(partId: string): number {
  let lowest = 0
  for (const col of getBlueprint(partId).colliders) {
    lowest = Math.min(lowest, (col.offset?.[1] ?? 0) - col.half[1])
  }
  return -lowest
}

/** Transform LOCAL (sous le host) d'une pièce posée sur une surface, +Y le long
 *  de la normale, pivotée de `angle` autour de la normale, décalée pour poser dessus. */
function placementOnSurface(
  parentWorld: WorldTf,
  point: THREE.Vector3,
  normal: THREE.Vector3,
  angle: number,
  offset: number,
): { position: [number, number, number]; rotation: [number, number, number] } {
  const orient = new THREE.Quaternion().setFromUnitVectors(UP, normal)
  const worldQuat = new THREE.Quaternion().setFromAxisAngle(normal, angle).multiply(orient)
  const worldPos = point.clone().addScaledVector(normal, offset)
  const inv = parentWorld.quat.clone().invert()
  const lp = worldPos.clone().sub(parentWorld.pos).applyQuaternion(inv)
  const lq = inv.clone().multiply(worldQuat)
  const e = new THREE.Euler().setFromQuaternion(lq)
  return { position: [lp.x, lp.y, lp.z], rotation: [e.x, e.y, e.z] }
}

export function HangarEditor({
  aircraft,
  coinsAvailable,
}: {
  aircraft: CompiledAircraft
  coinsAvailable: number
}) {
  const graph = useBuild((s) => s.aircraft)
  const selectedPartId = useBuild((s) => s.selectedPartId)
  const selectedNodeId = useBuild((s) => s.selectedNodeId)
  const addPart = useBuild((s) => s.addPart)
  const removeNode = useBuild((s) => s.removeNode)
  const undo = useBuild((s) => s.undo)
  const selectPart = useBuild((s) => s.selectPart)
  const selectNode = useBuild((s) => s.selectNode)

  const [hoveredSurface, setHoveredSurface] = useState<SurfaceHit | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [ghostAngle, setGhostAngle] = useState(0)

  // Télémétrie DEV : accès au store/compilé + projection + pose sur surface (vérif).
  const { camera, size } = useThree()
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as Record<string, unknown>).__hangar = {
      store: useBuild,
      compiled: aircraft,
      project: (p: [number, number, number]) => {
        const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera)
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height]
      },
      // Pose programmatique sur une surface (debug) : place `partId` sur la pièce
      // `nodeId` au point/normale donnés (repère avion).
      placeOnSurface: (
        partId: string,
        nodeId: string,
        point: [number, number, number],
        normal: [number, number, number],
        angle = 0,
      ) => {
        const pw = aircraft.transforms.get(nodeId)
        if (!pw) return
        const { position, rotation } = placementOnSurface(
          pw,
          new THREE.Vector3(...point),
          new THREE.Vector3(...normal).normalize(),
          angle,
          attachOffset(partId),
        )
        useBuild.getState().addPart(nodeId, partId, position, rotation)
      },
    }
  }, [aircraft, camera, size])

  // Reset de la pose quand on change de pièce de palette.
  useEffect(() => {
    setGhostAngle(0)
    setHoveredSurface(null)
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

  // Pose courante (host + transform local) déduite de la surface survolée.
  const placement = useMemo(() => {
    if (!selectedPartId || !hoveredSurface) return null
    const parentWorld = aircraft.transforms.get(hoveredSurface.nodeId)
    if (!parentWorld) return null
    const t = placementOnSurface(
      parentWorld,
      new THREE.Vector3(...hoveredSurface.point),
      new THREE.Vector3(...hoveredSurface.normal),
      ghostAngle,
      attachOffset(selectedPartId),
    )
    return { hostNodeId: hoveredSurface.nodeId, ...t }
  }, [selectedPartId, hoveredSurface, ghostAngle, aircraft])

  // Fantôme WYSIWYG : compile un graphe temporaire (graphe + candidat).
  const ghostPlaced = useMemo(() => {
    if (!selectedPartId || !placement) return null
    const tempNode: PartNode = {
      nodeId: '__ghost__',
      partId: selectedPartId,
      parentId: placement.hostNodeId,
      position: placement.position,
      rotation: placement.rotation,
    }
    const temp: Aircraft = { ...graph, nodes: [...graph.nodes, tempNode] }
    return compileAircraft(temp).placed.at(-1) ?? null
  }, [selectedPartId, placement, graph])

  // Sous-arbre surligné = pièce sélectionnée + descendants (ce que `Del` retire).
  const highlighted = useMemo(() => {
    if (!selectedNodeId) return null
    return new Set([selectedNodeId, ...descendantsOf(graph, selectedNodeId).map((n) => n.nodeId)])
  }, [selectedNodeId, graph])

  // Gizmo de transform sur la pièce sélectionnée (pas la racine, hors mode pose).
  const gizmo = useMemo(() => {
    if (!selectedNodeId || selectedPartId) return null
    const node = graph.nodes.find((n) => n.nodeId === selectedNodeId)
    if (!node || node.parentId === null) return null
    const world = aircraft.transforms.get(selectedNodeId)
    const parentWorld = aircraft.transforms.get(node.parentId)
    if (!world || !parentWorld) return null
    return { world, parentWorld }
  }, [selectedNodeId, selectedPartId, graph, aircraft])

  const placeHere = () => {
    if (!selectedPartId || !placement) return
    if (!canAfford(getPart(selectedPartId).cost, coinsAvailable)) return
    addPart(placement.hostNodeId, selectedPartId, placement.position, placement.rotation)
  }

  return (
    <group>
      <Plane assembly={assembly} />

      {/* Centre de gravité (toujours visible, façon Aviassembly) : place tes pièces
          pour le garder près du centre de portance des ailes. */}
      <group position={aircraft.centerOfMass}>
        <mesh raycast={() => null}>
          <sphereGeometry args={[0.16, 18, 14]} />
          <meshBasicMaterial color="#ffce3a" depthTest={false} transparent opacity={0.96} />
        </mesh>
        <mesh raycast={() => null} scale={1.04}>
          <sphereGeometry args={[0.16, 10, 8]} />
          <meshBasicMaterial color="#241a06" wireframe depthTest={false} transparent opacity={0.9} />
        </mesh>
      </group>

      {/* Fantôme de pose (snap sur la surface survolée). */}
      {ghostPlaced && <GhostPlane placed={ghostPlaced} />}

      {/* Boîtes de pièces = cibles de raycast : snap de pose OU sélection. */}
      {aircraft.colliders.map((c, i) => {
        const hot = hoveredNodeId === c.nodeId
        return (
          <mesh
            key={`pick${i}`}
            position={c.position}
            rotation={c.rotation}
            onPointerMove={(e) => {
              if (!selectedPartId) return
              e.stopPropagation()
              if (!e.face) return
              const n = e.face.normal.clone().transformDirection(e.object.matrixWorld).normalize()
              setHoveredSurface({
                nodeId: c.nodeId,
                point: [e.point.x, e.point.y, e.point.z],
                normal: [n.x, n.y, n.z],
              })
            }}
            onPointerOver={(e) => {
              if (selectedPartId) return
              e.stopPropagation()
              setHoveredNodeId(c.nodeId)
            }}
            onPointerOut={() => setHoveredNodeId((cur) => (cur === c.nodeId ? null : cur))}
            onClick={(e) => {
              e.stopPropagation()
              if (selectedPartId) placeHere()
              else selectNode(c.nodeId)
            }}
          >
            <boxGeometry args={[c.half[0] * 2, c.half[1] * 2, c.half[2] * 2]} />
            <meshBasicMaterial transparent opacity={hot ? 0.12 : 0} depthWrite={false} color="#ffffff" />
          </mesh>
        )
      })}

      {/* Gizmo translate/rotate sur la pièce sélectionnée. */}
      {gizmo && (
        <TransformGizmo key={selectedNodeId} world={gizmo.world} parentWorld={gizmo.parentWorld} />
      )}

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
