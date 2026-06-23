import * as THREE from 'three'
import { worldTransforms } from './compile'
import { isHanded } from '../parts/blueprints'
import type { Aircraft } from './graph'

/**
 * Miroir de construction (mode Mirror, façon Aviassembly) — symétrie par rapport
 * au plan médian de l'avion (X = 0). On mirroite en repère AVION (monde) puis on
 * ré-exprime en LOCAL sous le parent du jumeau, de sorte que la physique (compile)
 * voie une vraie paire symétrique (masse/CG/portance des deux côtés).
 */

/** Seuil sous lequel une pièce est « sur l'axe » (pas de jumeau). */
export const MIRROR_EPS = 0.05

/** Quaternion reflété par le plan X=0 (négation de y,z ⇒ rotation propre). */
function mirrorQuat(q: THREE.Quaternion): THREE.Quaternion {
  return new THREE.Quaternion(q.x, -q.y, -q.z, q.w)
}

export interface TwinTransform {
  /** Parent du jumeau = miroir du parent (ou le même s'il est sur l'axe). */
  twinParentId: string
  position: [number, number, number]
  rotation: [number, number, number]
}

/**
 * Transform du jumeau d'une pièce `partId` posée en `localPos`/`localRot` sous
 * `parentId`. Les pièces « à un côté » (`handed` : aile, demi-stab) ont TOUJOURS
 * un jumeau (reflété), même sur l'axe ; les pièces symétriques uniquement hors-axe.
 */
export function computeTwin(
  aircraft: Aircraft,
  parentId: string,
  partId: string,
  localPos: [number, number, number],
  localRot: [number, number, number],
): TwinTransform | null {
  const wt = worldTransforms(aircraft)
  const pw = wt.get(parentId)
  if (!pw) return null

  const lq = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(localRot[0], localRot[1], localRot[2]),
  )
  const lp = new THREE.Vector3(localPos[0], localPos[1], localPos[2])

  // Transform monde de la pièce.
  const worldPos = lp.clone().applyQuaternion(pw.quat).add(pw.pos)
  const worldQuat = pw.quat.clone().multiply(lq)
  // Pièce symétrique sur l'axe ⇒ pas de jumeau ; pièce à un côté ⇒ toujours.
  if (!isHanded(partId) && Math.abs(worldPos.x) < MIRROR_EPS) return null

  // Miroir (plan X=0).
  const mPos = new THREE.Vector3(-worldPos.x, worldPos.y, worldPos.z)
  const mQuat = mirrorQuat(worldQuat)

  // Parent du jumeau : le miroir du parent s'il existe, sinon le même.
  const parent = aircraft.nodes.find((n) => n.nodeId === parentId)
  const twinParentId = parent?.mirrorId ?? parentId
  const tpw = wt.get(twinParentId)
  if (!tpw) return null

  // Repère avion → local sous le parent du jumeau.
  const inv = tpw.quat.clone().invert()
  const tLocalPos = mPos.clone().sub(tpw.pos).applyQuaternion(inv)
  const tLocalQuat = inv.clone().multiply(mQuat)
  const e = new THREE.Euler().setFromQuaternion(tLocalQuat)

  return {
    twinParentId,
    position: [tLocalPos.x, tLocalPos.y, tLocalPos.z],
    rotation: [e.x, e.y, e.z],
  }
}
