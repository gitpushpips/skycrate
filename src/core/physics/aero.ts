import * as THREE from 'three'

/**
 * Modèle aérodynamique FORFAITAIRE (dossier §4, règle 4) — pas de Cl/Cd ni de
 * surface alaire. La portance et la traînée sont des valeurs fixes par pièce
 * (agrégées dans `core/assembly`), modulées par une fonction de la vitesse `f(v)`.
 *
 * Choix (cf. CLAUDE.md §8, valeur NON issue du dossier, donc dans leva) :
 *   f(v) = v ^ liftExponent   (exponent ~2 ⇒ aéro standard, le poids impose une
 *   vitesse de décollage). Coefficients globaux portance/traînée/poussée exposés
 *   dans leva pour calibrer le « feel ».
 *
 * Repère local de l'avion : nez = -Z (sens de poussée), haut = +Y.
 *
 * Étape 4 : forces appliquées au CENTRE DE MASSE (aucun couple). Les couples de
 * contrôle (tangage/roulis/lacet) arrivent à l'étape 5.
 */

const FORWARD = new THREE.Vector3(0, 0, -1)
const UP = new THREE.Vector3(0, 1, 0)

// Scratch (évite toute alloc par frame).
const _up = new THREE.Vector3()
const _fwd = new THREE.Vector3()
const _vdir = new THREE.Vector3()

export interface AeroTunables {
  /** Coefficient global de portance (calibrage, leva). */
  liftCoef: number
  /** Exposant de f(v) (≈2). */
  liftExponent: number
  /** Coefficient global de traînée (leva). */
  dragCoef: number
  /** Coefficient global de poussée (leva). */
  thrustCoef: number
  /** Limite de poussée max par moteur, 0..1 (règle 2). */
  maxThrustLimit: number
  /**
   * Vitesse (m/s) au-delà de laquelle f(v) SATURE pour la PORTANCE seulement.
   * Sans retour d'incidence (tangage verrouillé étape 4), une portance ∝ v² non
   * bornée diverge (montée explosive → NaN). La traînée, elle, reste non bornée
   * pour conserver une vitesse terminale. Valeur non issue du dossier (leva).
   */
  maxAeroSpeed: number
}

export interface AeroInputs {
  /** Orientation de l'avion. */
  quaternion: THREE.Quaternion
  /** Vitesse (monde). */
  velocity: THREE.Vector3
  /** Σ portance forfaitaire de l'avion. */
  totalLift: number
  /** Σ traînée forfaitaire. */
  totalDrag: number
  /** Poussée max cumulée des moteurs. */
  totalThrust: number
  /** État moteur : 1 = plein, 0 = arrêt, -1 = inverse (règle 2). */
  throttle: number
}

/**
 * Calcule la force aéro+poussée nette (hors gravité, gérée par Rapier) et l'écrit
 * dans `out`. Retourne `out`.
 */
export function computeAeroForce(
  inputs: AeroInputs,
  tun: AeroTunables,
  out: THREE.Vector3,
): THREE.Vector3 {
  const speed = inputs.velocity.length()
  // Portance : f(v) saturée (anti-divergence) ; traînée : f(v) non bornée (vitesse terminale).
  const liftSpeed = Math.min(speed, tun.maxAeroSpeed)
  const liftFv = Math.pow(liftSpeed, tun.liftExponent)
  const dragFv = Math.pow(speed, tun.liftExponent)

  out.set(0, 0, 0)

  // Portance : le long du « haut » de l'avion.
  _up.copy(UP).applyQuaternion(inputs.quaternion)
  out.addScaledVector(_up, tun.liftCoef * inputs.totalLift * liftFv)

  // Traînée : opposée à la vitesse.
  if (speed > 1e-4) {
    _vdir.copy(inputs.velocity).multiplyScalar(1 / speed)
    out.addScaledVector(_vdir, -tun.dragCoef * inputs.totalDrag * dragFv)
  }

  // Poussée : le long de l'avant (= sens du moteur), plein/arrêt/inverse + limite.
  _fwd.copy(FORWARD).applyQuaternion(inputs.quaternion)
  const thrustMag = tun.thrustCoef * inputs.totalThrust * tun.maxThrustLimit * inputs.throttle
  out.addScaledVector(_fwd, thrustMag)

  return out
}
