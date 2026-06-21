import * as THREE from 'three'
import { getPart } from '../parts'
import type { PlaneAssembly } from './types'

const FORWARD = new THREE.Vector3(0, 0, -1)

/**
 * Direction de poussée du moteur principal dans le repère LOCAL de l'avion
 * (règle 1 : la caméra et le sens des commandes suivent le moteur, pas le cockpit).
 *
 * Pour le J1 (moteur tracteur, nez = -Z, sans rotation), renvoie (0,0,-1). Une
 * config propulsive (moteur retourné) renverra l'opposé ⇒ caméra retournée et
 * commandes ressenties inversées.
 */
export function engineReferenceForward(assembly: PlaneAssembly): THREE.Vector3 {
  const engine = assembly.parts.find((placed) => getPart(placed.partId).category === 'engine')
  const dir = FORWARD.clone()
  if (engine?.rotation) {
    dir.applyEuler(new THREE.Euler(engine.rotation[0], engine.rotation[1], engine.rotation[2]))
  }
  return dir.normalize()
}
