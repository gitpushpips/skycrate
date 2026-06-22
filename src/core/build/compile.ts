import * as THREE from 'three'
import { getPart } from '../parts'
import { getBlueprint } from '../parts/blueprints'
import type { BpLiftingSurface } from '../parts/blueprints'
import { aggregateStats } from '../assembly'
import type { AssemblyStats, PlacedPart } from '../assembly'
import type { AeroSurfaceDef, ControlKey, DragPanelDef } from '../physics/aerodynamics'
import type { Aircraft, PartNode } from './graph'

/**
 * Compilation graphe → forme consommée par la physique (Jalon 2-A).
 * Aplatit l'arbre (compose les transforms) puis transforme chaque blueprint de
 * pièce (repère local) en repère AVION : colliders, surfaces (bandes), panneaux
 * de traînée, moteurs, stats, référence directionnelle. Le système de vol ne lit
 * plus que ça — il ne sait rien d'un avion précis.
 */

export interface CompiledCollider {
  half: [number, number, number]
  position: [number, number, number]
  rotation: [number, number, number]
  mass: number
}

export interface EngineInstance {
  dir: THREE.Vector3 // repère avion, normalisée, sens d'inversion appliqué
  point: THREE.Vector3
  thrust: number // poussée max (catalogue)
  fuelUsage: number
  limit: number // 0..1
}

export interface CompiledAircraft {
  placed: PlacedPart[] // visuel
  surfaces: AeroSurfaceDef[] // repère avion
  dragPanels: DragPanelDef[]
  colliders: CompiledCollider[]
  engines: EngineInstance[]
  referenceForward: THREE.Vector3 // moteur principal
  stats: AssemblyStats
}

interface WorldTf {
  quat: THREE.Quaternion
  pos: THREE.Vector3
}

/** Transform absolue (repère avion) de chaque nœud, par composition de la chaîne. */
function worldTransforms(aircraft: Aircraft): Map<string, WorldTf> {
  const byId = new Map(aircraft.nodes.map((n) => [n.nodeId, n]))
  const cache = new Map<string, WorldTf>()
  const compute = (node: PartNode): WorldTf => {
    const cached = cache.get(node.nodeId)
    if (cached) return cached
    const localQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(node.rotation[0], node.rotation[1], node.rotation[2]),
    )
    const localPos = new THREE.Vector3(node.position[0], node.position[1], node.position[2])
    let world: WorldTf
    if (node.parentId === null) {
      world = { quat: localQuat, pos: localPos }
    } else {
      const parent = byId.get(node.parentId)
      if (!parent) throw new Error(`Parent introuvable: ${node.parentId}`)
      const pw = compute(parent)
      world = {
        quat: pw.quat.clone().multiply(localQuat),
        pos: localPos.clone().applyQuaternion(pw.quat).add(pw.pos),
      }
    }
    cache.set(node.nodeId, world)
    return world
  }
  for (const n of aircraft.nodes) compute(n)
  return cache
}

interface LocalStrip {
  name: string
  position: [number, number, number]
  chord: readonly [number, number, number]
  normal: readonly [number, number, number]
  area: number
  liftSlope: number
  stallAngle: number
  zeroLiftDrag: number
  incidence?: number
  controlKey?: ControlKey
  controlEffectiveness?: number
}

/** Subdivise une surface portante en bandes (repère pièce). */
function generateStrips(s: BpLiftingSurface, nodeId: string): LocalStrip[] {
  const out: LocalStrip[] = []
  const span = new THREE.Vector3(s.spanAxis[0], s.spanAxis[1], s.spanAxis[2]).normalize()
  const center = new THREE.Vector3(s.center[0], s.center[1], s.center[2])
  const make = (
    pos: THREE.Vector3,
    area: number,
    controlKey: ControlKey | undefined,
    name: string,
  ): LocalStrip => ({
    name,
    position: [pos.x, pos.y, pos.z],
    chord: s.chord,
    normal: s.normal,
    area,
    liftSlope: s.liftSlope,
    stallAngle: s.stallAngle,
    zeroLiftDrag: s.zeroLiftDrag,
    incidence: s.incidence,
    controlKey,
    controlEffectiveness: controlKey ? s.controlEffectiveness : undefined,
  })

  if (s.control === 'roll') {
    const per = s.stripsPerSide ?? 4
    const halfSpan = s.span / 2
    const rootGap = s.rootGap ?? 0
    const areaPer = s.area / (2 * per)
    const cf = s.controlFraction ?? 0.5
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < per; i++) {
        const frac = (i + 0.5) / per
        const dist = side * (rootGap + frac * (halfSpan - rootGap))
        const pos = center.clone().addScaledVector(span, dist)
        const key: ControlKey | undefined = frac > cf ? (side < 0 ? 'aileronL' : 'aileronR') : undefined
        out.push(make(pos, areaPer, key, `wing.${nodeId}.${side < 0 ? 'L' : 'R'}${i}`))
      }
    }
  } else {
    const n = s.stripsPerSide ?? 1
    const areaPer = s.area / n
    const key: ControlKey | undefined =
      s.control === 'pitch' ? 'elevator' : s.control === 'yaw' ? 'rudder' : undefined
    for (let i = 0; i < n; i++) {
      const frac = (i + 0.5) / n - 0.5
      const pos = center.clone().addScaledVector(span, frac * s.span)
      out.push(make(pos, areaPer, key, `${s.control ?? 'surf'}.${nodeId}.${i}`))
    }
  }
  return out
}

const _v = new THREE.Vector3()
const _e = new THREE.Euler()

export function compileAircraft(aircraft: Aircraft): CompiledAircraft {
  const wt = worldTransforms(aircraft)
  const placed: PlacedPart[] = []
  const surfaces: AeroSurfaceDef[] = []
  const dragPanels: DragPanelDef[] = []
  const colliders: CompiledCollider[] = []
  const engines: EngineInstance[] = []
  let referenceForward: THREE.Vector3 | null = null

  for (const node of aircraft.nodes) {
    const part = getPart(node.partId)
    const bp = getBlueprint(node.partId)
    const { quat, pos } = wt.get(node.nodeId)!
    _e.setFromQuaternion(quat)
    const rotEuler: [number, number, number] = [_e.x, _e.y, _e.z]

    placed.push({ partId: node.partId, position: [pos.x, pos.y, pos.z], rotation: rotEuler })

    for (const col of bp.colliders) {
      const off = col.offset ?? [0, 0, 0]
      _v.set(off[0], off[1], off[2]).applyQuaternion(quat).add(pos)
      colliders.push({ half: col.half, position: [_v.x, _v.y, _v.z], rotation: rotEuler, mass: part.weight })
    }

    for (const s of bp.surfaces ?? []) {
      for (const strip of generateStrips(s, node.nodeId)) {
        const p = new THREE.Vector3(strip.position[0], strip.position[1], strip.position[2])
          .applyQuaternion(quat)
          .add(pos)
        const c = new THREE.Vector3(strip.chord[0], strip.chord[1], strip.chord[2]).applyQuaternion(quat)
        const n = new THREE.Vector3(strip.normal[0], strip.normal[1], strip.normal[2]).applyQuaternion(quat)
        surfaces.push({
          name: strip.name,
          position: [p.x, p.y, p.z],
          chord: [c.x, c.y, c.z],
          normal: [n.x, n.y, n.z],
          area: strip.area,
          liftSlope: strip.liftSlope,
          stallAngle: strip.stallAngle,
          zeroLiftDrag: strip.zeroLiftDrag,
          incidence: strip.incidence,
          controlKey: strip.controlKey,
          controlEffectiveness: strip.controlEffectiveness,
        })
      }
    }

    bp.dragPanels?.forEach((panel, idx) => {
      const p = new THREE.Vector3(panel.position[0], panel.position[1], panel.position[2])
        .applyQuaternion(quat)
        .add(pos)
      const n = new THREE.Vector3(panel.normal[0], panel.normal[1], panel.normal[2]).applyQuaternion(quat)
      dragPanels.push({ name: `${node.nodeId}.panel${idx}`, position: [p.x, p.y, p.z], normal: [n.x, n.y, n.z], area: panel.area })
    })

    if (bp.engine && part.category === 'engine') {
      const dir = new THREE.Vector3(
        bp.engine.thrustDir[0],
        bp.engine.thrustDir[1],
        bp.engine.thrustDir[2],
      ).applyQuaternion(quat)
      if (node.settings?.engineReversed) dir.negate()
      dir.normalize()
      const point = new THREE.Vector3(
        bp.engine.point[0],
        bp.engine.point[1],
        bp.engine.point[2],
      )
        .applyQuaternion(quat)
        .add(pos)
      engines.push({
        dir,
        point,
        thrust: part.thrust,
        fuelUsage: part.fuelUsage,
        limit: node.settings?.thrustLimit ?? 1,
      })
      if (!referenceForward) referenceForward = dir.clone()
    }
  }

  const stats = aggregateStats({ id: aircraft.id, name: aircraft.name, parts: placed })
  return {
    placed,
    surfaces,
    dragPanels,
    colliders,
    engines,
    referenceForward: referenceForward ?? new THREE.Vector3(0, 0, -1),
    stats,
  }
}
