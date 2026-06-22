import * as THREE from 'three'
import type { FlightInputState } from './input'

/**
 * Assistance de pilotage « auto-steer » (étape 5d-E), ON par défaut, appliquée
 * PAR-DESSUS la physique réaliste (couple correctif additionnel). Façon Aviassembly :
 *   - amortit les taux de roulis/tangage/lacet (s'oppose à ω) ;
 *   - ramène doucement vers le palier quand on lâche les commandes (retour à
 *     l'horizon, dosé par (1 - |input|) pour ne pas se battre avec le joueur).
 *
 * Coupée ⇒ pilotage manuel pur (les gouvernes physiques seules).
 */
export interface AssistGains {
  enabled: boolean
  /** Amortissement du taux de tangage. */
  pitchDamp: number
  /** Amortissement du taux de roulis. */
  rollDamp: number
  /** Amortissement du taux de lacet. */
  yawDamp: number
  /** Maintien d'attitude : tient l'assiette/inclinaison CAPTURÉE au lâché des
   *  commandes (contre le retour aéro naturel) ⇒ l'avion garde sa direction. */
  holdGain: number
  /** OPTION (défaut 0) : rappel ACTIF des ailes à plat (bank → 0) au lâché du roulis. */
  levelReturn: number
  /** OPTION (défaut 0) : maintien d'altitude (vitesse verticale → 0) au lâché du tangage. */
  altHold: number
  /** Fermeté du rappel quand on dépasse les bornes d'attitude. */
  limitGain: number
  /** Anti-décrochage : couple piqueur quand l'incidence aile dépasse `stallGuardDeg`. */
  antiStall: number
  /** Incidence (deg) à partir de laquelle l'anti-décrochage agit. */
  stallGuardDeg: number
  /** Assiette de tangage max atteignable (degrés). */
  maxPitchDeg: number
  /** Inclinaison (bank) max atteignable (degrés). */
  maxBankDeg: number
}

const _qInv = new THREE.Quaternion()
const _omegaB = new THREE.Vector3()
const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _tauB = new THREE.Vector3()
const FWD = new THREE.Vector3(0, 0, -1)
const RIGHT = new THREE.Vector3(1, 0, 0)

/** Couple d'assistance (monde) écrit dans `out`. Axes locaux : X tangage, Y lacet, Z roulis. */
export function computeAssistTorque(
  quaternion: THREE.Quaternion,
  angularVelocity: THREE.Vector3,
  verticalSpeed: number,
  heldBank: number,
  wingAoaDeg: number,
  airspeed: number,
  input: FlightInputState,
  gains: AssistGains,
  out: THREE.Vector3,
): THREE.Vector3 {
  if (!gains.enabled) {
    out.set(0, 0, 0)
    return out
  }

  // Taux angulaires en repère avion.
  _qInv.copy(quaternion).conjugate()
  _omegaB.copy(angularVelocity).applyQuaternion(_qInv)

  // Attitude (radians) depuis les composantes verticales de l'avant / aile droite.
  _fwd.copy(FWD).applyQuaternion(quaternion)
  _right.copy(RIGHT).applyQuaternion(quaternion)
  const pitch = Math.asin(THREE.MathUtils.clamp(_fwd.y, -1, 1)) // nez au-dessus de l'horizon
  const bank = Math.asin(THREE.MathUtils.clamp(_right.y, -1, 1)) // aile droite au-dessus

  const maxP = THREE.MathUtils.degToRad(gains.maxPitchDeg)
  const maxB = THREE.MathUtils.degToRad(gains.maxBankDeg)
  const overP = Math.sign(pitch) * Math.max(0, Math.abs(pitch) - maxP)
  const overB = Math.sign(bank) * Math.max(0, Math.abs(bank) - maxB)

  // Anti-décrochage : couple piqueur quand l'incidence aile dépasse le seuil.
  // ⚠️ uniquement en vol établi : à basse vitesse l'incidence (atan2) est ininterprétable
  // (vent avant ≈ 0 au sol) ⇒ sinon couple aberrant = backflip au spawn.
  const stallFactor = THREE.MathUtils.clamp((airspeed - 15) / 12, 0, 1)
  const aoaOver =
    stallFactor * Math.sign(wingAoaDeg) * Math.max(0, Math.abs(wingAoaDeg) - gains.stallGuardDeg)

  // Tangage : amorti (tient le climb) + (option) maintien d'alt + borne + anti-décrochage.
  const pitchTorque =
    -gains.pitchDamp * _omegaB.x -
    gains.altHold * verticalSpeed * (1 - Math.abs(input.pitch)) -
    gains.limitGain * overP -
    gains.antiStall * aoaOver

  // Roulis : amorti + maintien de l'inclinaison CAPTURÉE au lâché (contre le
  // retour aéro) + (option) ailes à plat + borne. ⇒ l'avion garde son virage.
  const rollTorque =
    -gains.rollDamp * _omegaB.z -
    gains.holdGain * (bank - heldBank) -
    gains.levelReturn * bank * (1 - Math.abs(input.roll)) -
    gains.limitGain * overB

  _tauB.set(pitchTorque, -gains.yawDamp * _omegaB.y, rollTorque)

  out.copy(_tauB).applyQuaternion(quaternion)
  return out
}
