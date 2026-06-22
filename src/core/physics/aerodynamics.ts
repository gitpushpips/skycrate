import * as THREE from 'three'

/**
 * Aérodynamique réaliste par SURFACES (étape 5b). Inspiré du modèle standard des
 * simulateurs : l'avion est décomposé en surfaces portantes ; chacune calcule sa
 * portance et sa traînée à partir de son angle d'incidence local (vent relatif vu
 * par la surface, incluant la rotation de l'avion) puis applique sa force À SA
 * POSITION. Les moments (stabilité, contrôle par gouvernes, amortissement) en
 * découlent naturellement — plus aucun couple « magique ».
 *
 * Repère local avion : nez = -Z, haut = +Y, aile droite = +X.
 */

/** Noms des gouvernes pilotées (physique + visuel partagent ces clés). */
export type ControlKey = 'elevator' | 'aileronL' | 'aileronR' | 'rudder'

export type Deflections = Record<ControlKey, number> // radians

export interface AeroSurfaceDef {
  name: string
  /** Centre de poussée de la surface (repère local). */
  position: readonly [number, number, number]
  /** Direction de la corde = avant de la surface (local), ~ (0,0,-1). */
  chord: readonly [number, number, number]
  /** Normale = sens de portance au repos (local), +Y aile / +X dérive. */
  normal: readonly [number, number, number]
  /** Surface (m²). */
  area: number
  /** Pente de portance dCL/dα (/rad), ~2π idéal, ~4–5 aile finie. */
  liftSlope: number
  /** Incidence de décrochage (rad). */
  stallAngle: number
  /** Traînée à portance nulle CD0. */
  zeroLiftDrag: number
  /** Calage fixe de la surface (rad). */
  incidence?: number
  /** Gouverne qui défléchit la surface (sinon surface fixe). */
  controlKey?: ControlKey
  /** Efficacité gouverne : rad d'incidence ajoutés par rad de déflexion. */
  controlEffectiveness?: number
}

export interface AeroParams {
  /** ρ effectif (0.5·ρ·v²·S·C) — calibration vs masses du jeu. */
  airDensity: number
  /** k de la traînée induite : CDi = k·CL². */
  inducedDrag: number
  /** Coef de traînée « plaque plane » à forte incidence. */
  flatPlateDrag: number
  /** Coef de traînée de pression des panneaux de corps (fuselage, moteur…). */
  bodyDrag: number
  /** Décalage longitudinal (m) des points d'application aéro vs centre de masse
   *  ⇒ règle la MARGE STATIQUE (>0 = plus stable, <0 = plus nerveux). */
  cgShift: number
}

/**
 * Panneau de traînée de PRESSION (étape 5c) : une face du corps (fuselage, moteur)
 * sans portance. Traîne selon son aire projetée face au vent ⇒ la traînée totale
 * dépend de la GÉOMÉTRIE et de l'orientation de l'avion (frontal vs travers).
 */
export interface DragPanelDef {
  name: string
  position: readonly [number, number, number]
  /** Normale extérieure de la face (local). */
  normal: readonly [number, number, number]
  /** Aire de la face (m²). */
  area: number
}

export interface SurfaceResult {
  force: THREE.Vector3 // monde
  point: THREE.Vector3 // monde
  aoaDeg: number
  /** « Face au vent » 0..1 (|normale·vent|) — pour la visu de l'étape 5c. */
  facing: number
  dragMag: number
  liftMag: number
}

export function makeSurfaceResult(): SurfaceResult {
  return {
    force: new THREE.Vector3(),
    point: new THREE.Vector3(),
    aoaDeg: 0,
    facing: 0,
    dragMag: 0,
    liftMag: 0,
  }
}

/** CL(α) : linéaire jusqu'au décrochage, puis CHUTE NETTE vers la plaque plane. */
function liftCoefficient(aoa: number, slope: number, stall: number): number {
  const a = THREE.MathUtils.clamp(aoa, -Math.PI / 2, Math.PI / 2)
  const abs = Math.abs(a)
  if (abs <= stall) return slope * a
  const sign = Math.sign(a)
  const clPeak = slope * stall
  const clFlat = Math.sin(2 * abs) // comportement très décroché (plaque plane)
  // Bande de transition courte (~9°) ⇒ décrochage franc : la portance tombe vite.
  const t = THREE.MathUtils.clamp((abs - stall) / 0.16, 0, 1)
  return sign * THREE.MathUtils.lerp(clPeak, clFlat, t)
}

// Scratch (instance unique du rig).
const _r = new THREE.Vector3()
const _vp = new THREE.Vector3()
const _chord = new THREE.Vector3()
const _normal = new THREE.Vector3()
const _span = new THREE.Vector3()
const _windDir = new THREE.Vector3()
const _liftDir = new THREE.Vector3()
const _np = new THREE.Vector3()
const _velDir = new THREE.Vector3()

export interface BodyState {
  quaternion: THREE.Quaternion
  position: THREE.Vector3
  velocity: THREE.Vector3
  angularVelocity: THREE.Vector3
}

/**
 * Calcule la force d'une surface et son point d'application (monde) dans `out`.
 * `deflection` = déflexion de la gouverne associée (rad, 0 si surface fixe).
 */
export function computeSurfaceForce(
  def: AeroSurfaceDef,
  deflection: number,
  body: BodyState,
  params: AeroParams,
  out: SurfaceResult,
): SurfaceResult {
  // Point d'application (monde) et vitesse de ce point (translation + rotation).
  _r.set(def.position[0], def.position[1], def.position[2] + params.cgShift).applyQuaternion(body.quaternion)
  out.point.copy(body.position).add(_r)
  _vp.copy(body.angularVelocity).cross(_r).add(body.velocity)

  const speed = _vp.length()
  if (speed < 0.05) {
    out.force.set(0, 0, 0)
    out.aoaDeg = 0
    out.facing = 0
    out.dragMag = 0
    out.liftMag = 0
    return out
  }

  // Axes de la surface (monde).
  _chord.set(def.chord[0], def.chord[1], def.chord[2]).applyQuaternion(body.quaternion).normalize()
  _normal.set(def.normal[0], def.normal[1], def.normal[2]).applyQuaternion(body.quaternion).normalize()
  _span.copy(_chord).cross(_normal).normalize()

  // Incidence : composantes de la vitesse du point dans le plan corde/normale.
  const vf = _vp.dot(_chord)
  const vn = _vp.dot(_normal)
  let aoa = Math.atan2(-vn, vf) + (def.incidence ?? 0)
  if (def.controlKey) aoa += (def.controlEffectiveness ?? 0) * deflection

  const cl = liftCoefficient(aoa, def.liftSlope, def.stallAngle)
  const cd = def.zeroLiftDrag + params.inducedDrag * cl * cl + params.flatPlateDrag * Math.sin(aoa) ** 2
  const q = 0.5 * params.airDensity * speed * speed

  // Directions : traînée le long du vent relatif, portance ⟂ vent (côté +normale).
  _windDir.copy(_vp).multiplyScalar(-1 / speed) // = vent relatif (opposé à la vitesse)
  _liftDir.copy(_span).cross(_vp).normalize()
  if (_liftDir.dot(_normal) < 0) _liftDir.multiplyScalar(-1)

  const liftMag = cl * q * def.area
  const dragMag = cd * q * def.area
  out.force.copy(_liftDir).multiplyScalar(liftMag).addScaledVector(_windDir, dragMag)

  out.aoaDeg = THREE.MathUtils.radToDeg(aoa)
  out.facing = Math.abs(_normal.dot(_windDir))
  out.liftMag = liftMag
  out.dragMag = dragMag
  return out
}

/**
 * Traînée de pression d'un panneau de corps : ∝ aire projetée face au vent.
 * `out.facing` = max(0, normale·sens de déplacement) ∈ [0,1] (1 = ⟂ au flux).
 */
export function computePanelDrag(
  def: DragPanelDef,
  body: BodyState,
  params: AeroParams,
  out: SurfaceResult,
): SurfaceResult {
  _r.set(def.position[0], def.position[1], def.position[2] + params.cgShift).applyQuaternion(body.quaternion)
  out.point.copy(body.position).add(_r)
  _vp.copy(body.angularVelocity).cross(_r).add(body.velocity)

  const speed = _vp.length()
  if (speed < 0.05) {
    out.force.set(0, 0, 0)
    out.facing = 0
    out.dragMag = 0
    return out
  }

  _velDir.copy(_vp).multiplyScalar(1 / speed)
  _np.set(def.normal[0], def.normal[1], def.normal[2]).applyQuaternion(body.quaternion).normalize()
  const facing = Math.max(0, _np.dot(_velDir)) // face avant exposée au flux

  const q = 0.5 * params.airDensity * speed * speed
  const dragMag = params.bodyDrag * q * def.area * facing
  out.force.copy(_velDir).multiplyScalar(-dragMag) // s'oppose au déplacement

  out.facing = facing
  out.dragMag = dragMag
  out.liftMag = 0
  out.aoaDeg = 0
  return out
}
