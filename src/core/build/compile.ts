import * as THREE from 'three'
import { getPart } from '../parts'
import type { SectionProfile } from '../parts'
import { getBlueprint } from '../parts/blueprints'
import type { BpLiftingSurface } from '../parts/blueprints'
import { aggregateStats } from '../assembly'
import type { AssemblyStats, FuselageShape, PlacedPart } from '../assembly'
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
  /** Nœud source (pour la sélection/surlignage dans l'éditeur). */
  nodeId: string
  half: [number, number, number]
  position: [number, number, number]
  rotation: [number, number, number]
  mass: number
  /** Sphère (rayon = half[0]) — roues du train (S1). */
  ball?: boolean
}

/** Point d'accroche d'une pièce posée, exprimé pour l'éditeur (Jalon 2-C). */
export interface CompiledMount {
  /** Identifiant stable du mount (host + index). */
  id: string
  /** Pièce qui porte ce mount (= parent de la pièce à poser). */
  hostNodeId: string
  /** Position en repère du host (= position relative de l'enfant à créer). */
  localPosition: [number, number, number]
  /** Normale en repère du host (axe de rotation de pose). */
  localNormal: [number, number, number]
  /** Position en repère avion (rendu + raycast). */
  position: [number, number, number]
  /** Normale en repère avion. */
  normal: [number, number, number]
}

export interface EngineInstance {
  /** Nœud source — clé des jauges par moteur (S2) et des visuels hélice/flamme. */
  nodeId: string
  partId: string
  dir: THREE.Vector3 // repère avion, normalisée, sens d'inversion appliqué
  point: THREE.Vector3
  thrust: number // poussée max (catalogue)
  fuelUsage: number
  limit: number // 0..1
  /** Postcombustion (si le moteur en a) : multiplie poussée/conso quand activée. */
  afterburner?: { thrustMult: number; fuelMult: number }
}

export interface CompiledAircraft {
  placed: PlacedPart[] // visuel
  surfaces: AeroSurfaceDef[] // repère avion
  dragPanels: DragPanelDef[]
  colliders: CompiledCollider[]
  engines: EngineInstance[]
  mounts: CompiledMount[] // points d'accroche (éditeur)
  transforms: Map<string, WorldTf> // repère avion par nœud (gizmo/miroir)
  centerOfMass: [number, number, number] // CG (repère avion) — indicateur hangar
  referenceForward: THREE.Vector3 // moteur principal
  stats: AssemblyStats
}

export interface WorldTf {
  quat: THREE.Quaternion
  pos: THREE.Vector3
}

/** Transform absolue (repère avion) de chaque nœud, par composition de la chaîne. */
export function worldTransforms(aircraft: Aircraft): Map<string, WorldTf> {
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

type ControlRole = 'roll' | 'pitch' | 'yaw'

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
  /** Rôle de gouverne ; la clé concrète (aileronL/R…) est résolue au repère avion. */
  controlRole?: ControlRole
  controlEffectiveness?: number
}

/**
 * Subdivise une surface portante (à UN côté) en bandes le long de l'envergure,
 * de la racine (centre−½span) au bout (centre+½span). La fraction extérieure
 * (`controlFraction`) porte la gouverne. La clé L/R est résolue plus tard selon
 * la position MONDE (compile), pour gérer les demi-ailes miroir.
 */
function generateStrips(s: BpLiftingSurface, nodeId: string): LocalStrip[] {
  const out: LocalStrip[] = []
  const span = new THREE.Vector3(s.spanAxis[0], s.spanAxis[1], s.spanAxis[2]).normalize()
  const center = new THREE.Vector3(s.center[0], s.center[1], s.center[2])
  const n = s.stripsPerSide ?? 1
  const areaPer = s.area / n
  const ctrlFrac = s.controlFraction ?? 1
  const prefix = s.control === 'roll' ? 'wing' : (s.control ?? 'surf')
  for (let i = 0; i < n; i++) {
    const along = (i + 0.5) / n // 0 = racine, 1 = bout
    const pos = center.clone().addScaledVector(span, (along - 0.5) * s.span)
    const isControl = s.control !== undefined && along >= 1 - ctrlFrac
    out.push({
      name: `${prefix}.${nodeId}.${i}`,
      position: [pos.x, pos.y, pos.z],
      chord: s.chord,
      normal: s.normal,
      area: areaPer,
      liftSlope: s.liftSlope,
      stallAngle: s.stallAngle,
      zeroLiftDrag: s.zeroLiftDrag,
      incidence: s.incidence,
      controlRole: isControl ? s.control : undefined,
      controlEffectiveness: isControl ? s.controlEffectiveness : undefined,
    })
  }
  return out
}

const _v = new THREE.Vector3()
const _e = new THREE.Euler()

// ── Fuselage déformable (S4-C) ────────────────────────────────────────────────
/** Bornes des réglages d'instance (partagées avec l'inspecteur). */
export const FUS_LIMITS = {
  length: [0.6, 4] as const,
  endScale: [0.25, 1.5] as const,
  offsetY: [-0.6, 0.6] as const,
}

/**
 * Section ARRIÈRE (de sortie) qu'une pièce offre à un enfant : cockpit = son
 * `section` ; fuselage = sa section de sortie (récursif — chaînage) ; sinon null.
 */
function rearSectionOf(
  nodeId: string,
  byId: Map<string, PartNode>,
  memo: Map<string, SectionProfile | null>,
): SectionProfile | null {
  const cached = memo.get(nodeId)
  if (cached !== undefined) return cached
  const node = byId.get(nodeId)
  let out: SectionProfile | null = null
  if (node) {
    const part = getPart(node.partId)
    if (part.category === 'cockpit') out = part.section
    else if (part.category === 'fuselage') out = fuselageShapeOf(node, byId, memo).end
  }
  memo.set(nodeId, out)
  return out
}

/** Forme résolue d'un segment : entrée HÉRITÉE du parent + settings d'instance. */
function fuselageShapeOf(
  node: PartNode,
  byId: Map<string, PartNode>,
  memo: Map<string, SectionProfile | null>,
): FuselageShape {
  const part = getPart(node.partId)
  if (part.category !== 'fuselage') throw new Error(`Pas un fuselage: ${node.partId}`)
  const start = (node.parentId && rearSectionOf(node.parentId, byId, memo)) || part.section
  const s = node.settings
  const endScale = THREE.MathUtils.clamp(s?.fusEndScale ?? 1, ...FUS_LIMITS.endScale)
  return {
    start,
    end: {
      halfWidth: start.halfWidth * endScale,
      halfHeight: start.halfHeight * endScale,
      round: start.round,
    },
    length: THREE.MathUtils.clamp(s?.fusLength ?? part.baseLength, ...FUS_LIMITS.length),
    offsetY: THREE.MathUtils.clamp(s?.fusOffsetY ?? 0, ...FUS_LIMITS.offsetY),
  }
}

export function compileAircraft(aircraft: Aircraft): CompiledAircraft {
  const wt = worldTransforms(aircraft)
  const byId = new Map(aircraft.nodes.map((n) => [n.nodeId, n]))
  const rearMemo = new Map<string, SectionProfile | null>()
  const placed: PlacedPart[] = []
  const surfaces: AeroSurfaceDef[] = []
  const dragPanels: DragPanelDef[] = []
  const colliders: CompiledCollider[] = []
  const engines: EngineInstance[] = []
  const mounts: CompiledMount[] = []
  let referenceForward: THREE.Vector3 | null = null

  for (const node of aircraft.nodes) {
    const part = getPart(node.partId)
    const bp = getBlueprint(node.partId)
    const { quat, pos } = wt.get(node.nodeId)!
    _e.setFromQuaternion(quat)
    const rotEuler: [number, number, number] = [_e.x, _e.y, _e.z]
    // Pièce miroir : géométrie reflétée par le plan X LOCAL (négation de la
    // composante x) avant la transform monde ⇒ vraie symétrie gauche/droite.
    const mx = node.mirrored ? -1 : 1
    const toWorld = (v: readonly [number, number, number]) =>
      _v.set(v[0] * mx, v[1], v[2]).applyQuaternion(quat).add(pos)
    const dirToWorld = (v: readonly [number, number, number]) =>
      new THREE.Vector3(v[0] * mx, v[1], v[2]).applyQuaternion(quat)

    // Fuselage déformable (S4-C) : forme résolue (héritage de section) + stats
    // ∝ volume (relatif au volume par défaut de la pièce).
    let fusShape: FuselageShape | undefined
    let statScale: number | undefined
    if (part.category === 'fuselage') {
      fusShape = fuselageShapeOf(node, byId, rearMemo)
      const defArea = part.section.halfWidth * part.section.halfHeight
      const avgArea =
        (fusShape.start.halfWidth * fusShape.start.halfHeight +
          fusShape.end.halfWidth * fusShape.end.halfHeight) /
        2
      statScale = (avgArea * fusShape.length) / (defArea * part.baseLength)
    }

    placed.push({
      partId: node.partId,
      nodeId: node.nodeId,
      position: [pos.x, pos.y, pos.z],
      rotation: rotEuler,
      mirrored: node.mirrored,
      fuselage: fusShape,
      statScale,
    })

    if (part.category === 'fuselage' && fusShape) {
      // Colliders/panneaux GÉNÉRÉS par instance (le blueprint n'est qu'un repli).
      // Repère pièce : entrée en z=0, corps vers +Z, sortie décalée de offsetY.
      const { start, end, length: L, offsetY } = fusShape
      const midHw = (start.halfWidth + end.halfWidth) / 2
      const midHh = (start.halfHeight + end.halfHeight) / 2
      const scaledWeight = part.weight * (statScale ?? 1)
      // 2 boîtes = approximation du fût effilé (masse ∝ volume, répartie).
      const segs = [
        { hw: Math.max(start.halfWidth, midHw), hh: Math.max(start.halfHeight, midHh), yc: offsetY * 0.25, z: L * 0.25 },
        { hw: Math.max(midHw, end.halfWidth), hh: Math.max(midHh, end.halfHeight), yc: offsetY * 0.75, z: L * 0.75 },
      ]
      for (const sg of segs) {
        const w = toWorld([0, sg.yc, sg.z])
        colliders.push({
          nodeId: node.nodeId,
          half: [sg.hw, sg.hh, L / 4],
          position: [w.x, w.y, w.z],
          rotation: rotEuler,
          mass: scaledWeight / 2,
        })
      }
      // Traînée ∝ dimensions déformées (coefficients calés sur l'ancien caisson).
      const fusPanels: { p: [number, number, number]; n: [number, number, number]; area: number }[] = [
        { p: [0, offsetY, L], n: [0, 0, 1], area: 2.8 * end.halfWidth * end.halfHeight }, // arrière
        { p: [0, midHh + offsetY / 2, L / 2], n: [0, 1, 0], area: 2 * midHw * L }, // dessus
        { p: [0, -midHh + offsetY / 2, L / 2], n: [0, -1, 0], area: 2 * midHw * L }, // dessous
        { p: [-midHw, offsetY / 2, L / 2], n: [-1, 0, 0], area: 2 * midHh * L }, // gauche
        { p: [midHw, offsetY / 2, L / 2], n: [1, 0, 0], area: 2 * midHh * L }, // droite
      ]
      fusPanels.forEach((panel, idx) => {
        const p = toWorld(panel.p)
        const n = dirToWorld(panel.n)
        dragPanels.push({
          name: `${node.nodeId}.fus${idx}`,
          position: [p.x, p.y, p.z],
          normal: [n.x, n.y, n.z],
          area: panel.area,
        })
      })
      // Mount de SORTIE (face arrière) pour chaîner/auto-snapper un segment suivant.
      const rw = toWorld([0, offsetY, L])
      const rn = dirToWorld([0, 0, 1]).normalize()
      mounts.push({
        id: `${node.nodeId}.rear`,
        hostNodeId: node.nodeId,
        localPosition: [0, offsetY, L],
        localNormal: [0, 0, 1],
        position: [rw.x, rw.y, rw.z],
        normal: [rn.x, rn.y, rn.z],
      })
    } else {
      // Masse de la pièce répartie entre ses colliders (train = roues + structure).
      const colMass = part.weight / bp.colliders.length
      for (const col of bp.colliders) {
        const off = col.offset ?? [0, 0, 0]
        const w = toWorld(off)
        colliders.push({
          nodeId: node.nodeId,
          half: col.half,
          position: [w.x, w.y, w.z],
          rotation: rotEuler,
          mass: colMass,
          ball: col.ball,
        })
      }
    }

    bp.mounts?.forEach((m, idx) => {
      const wp = toWorld(m.position)
      const wpArr: [number, number, number] = [wp.x, wp.y, wp.z]
      const wn = dirToWorld(m.normal).normalize()
      mounts.push({
        id: `${node.nodeId}.mount${idx}`,
        hostNodeId: node.nodeId,
        localPosition: [m.position[0] * mx, m.position[1], m.position[2]],
        localNormal: [m.normal[0] * mx, m.normal[1], m.normal[2]],
        position: wpArr,
        normal: [wn.x, wn.y, wn.z],
      })
    })

    for (const s of bp.surfaces ?? []) {
      for (const strip of generateStrips(s, node.nodeId)) {
        const p = toWorld(strip.position)
        const pArr: [number, number, number] = [p.x, p.y, p.z]
        const c = dirToWorld(strip.chord)
        const n = dirToWorld(strip.normal)
        // Résolution L/R de la gouverne selon la position MONDE (gère le miroir).
        let controlKey: ControlKey | undefined
        if (strip.controlRole === 'roll') controlKey = p.x < 0 ? 'aileronL' : 'aileronR'
        else if (strip.controlRole === 'pitch') controlKey = 'elevator'
        else if (strip.controlRole === 'yaw') controlKey = 'rudder'
        surfaces.push({
          name: strip.name,
          position: pArr,
          chord: [c.x, c.y, c.z],
          normal: [n.x, n.y, n.z],
          area: strip.area,
          liftSlope: strip.liftSlope,
          stallAngle: strip.stallAngle,
          zeroLiftDrag: strip.zeroLiftDrag,
          incidence: strip.incidence,
          controlKey,
          controlEffectiveness: strip.controlEffectiveness,
        })
      }
    }

    bp.dragPanels?.forEach((panel, idx) => {
      const p = toWorld(panel.position)
      const n = dirToWorld(panel.normal)
      dragPanels.push({ name: `${node.nodeId}.panel${idx}`, position: [p.x, p.y, p.z], normal: [n.x, n.y, n.z], area: panel.area })
    })

    if (bp.engine && part.category === 'engine') {
      const dir = dirToWorld(bp.engine.thrustDir)
      if (node.settings?.engineReversed) dir.negate()
      dir.normalize()
      const point = toWorld(bp.engine.point)
      engines.push({
        nodeId: node.nodeId,
        partId: node.partId,
        dir,
        point: point.clone(),
        thrust: part.thrust,
        fuelUsage: part.fuelUsage,
        limit: node.settings?.thrustLimit ?? 1,
        afterburner: part.afterburner,
      })
      if (!referenceForward) referenceForward = dir.clone()
    }
  }

  // Centre de gravité = barycentre des colliders pondéré par leur masse (= ce que
  // Rapier calcule pour le corps composé). Sert d'indicateur dans le hangar.
  const com = new THREE.Vector3()
  let comMass = 0
  for (const c of colliders) {
    com.addScaledVector(_v.set(c.position[0], c.position[1], c.position[2]), c.mass)
    comMass += c.mass
  }
  if (comMass > 0) com.multiplyScalar(1 / comMass)

  const stats = aggregateStats({ id: aircraft.id, name: aircraft.name, parts: placed })
  return {
    placed,
    surfaces,
    dragPanels,
    colliders,
    engines,
    mounts,
    transforms: wt,
    centerOfMass: [com.x, com.y, com.z],
    referenceForward: referenceForward ?? new THREE.Vector3(0, 0, -1),
    stats,
  }
}
