import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider, BallCollider, useBeforePhysicsStep } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import type { Collider } from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { Plane } from './Plane'
import { DetachedWing } from './DetachedWing'
import { CrashDebris } from './CrashDebris'
import { CrashExplosion } from './CrashExplosion'
import { playSfx } from '../core/audio/sfx'
import { ControlsContext } from './controlsContext'
import { useHud } from '../store/hud'
import { useThrottle } from '../store/throttle'
import { useGear } from '../store/gear'
import { useCrash } from '../store/crash'
import { useSettings } from '../store/settings'
import { getPart } from '../core/parts'
import type { PlaneAssembly } from '../core/assembly'
import { computeSurfaceForce, computePanelDrag, makeSurfaceResult } from '../core/physics/aerodynamics'
import type { Deflections } from '../core/physics/aerodynamics'
import { useFlightInput } from '../core/flight/input'
import { computeAssistTorque } from '../core/flight/assist'
import { recordContact, installContactsApi } from './contactProbe'
import type { CompiledAircraft } from '../core/build/compile'
import type { RefuelPad } from '../core/world/airportDecor'
import { SEA_Y } from '../core/world/world'
import { AirflowPanels } from './AirflowPanels'
import type { VizPanel } from './AirflowPanels'
import type { FlightTunables } from './flightControls'

const REST_Y = 1.3
// Pas de temps physique fixe (= timeStep par défaut de <Physics>). L'aéro et
// l'assistance tournent ici (pas au rendu) pour une boucle de contrôle stable.
const FIXED_DT = 1 / 60

// Scratch.
const _P = new THREE.Vector3()
const _Q = new THREE.Quaternion()
const _vel = new THREE.Vector3()
const _omega = new THREE.Vector3()
const _thrust = new THREE.Vector3()
const _ePoint = new THREE.Vector3()
const _offset = new THREE.Vector3()
const _camPos = new THREE.Vector3()
const _camQuat = new THREE.Quaternion()
const _assist = new THREE.Vector3()
const _att = new THREE.Vector3()
const _dbg = new THREE.Vector3()
const _euler = new THREE.Euler()
const _m4 = new THREE.Matrix4()
const _aabbC = new THREE.Vector3()
const _wDrag = new THREE.Vector3()

/** Transform + vitesses capturés à la rupture pour lâcher l'aile détachée. */
interface DetachInfo {
  position: [number, number, number]
  rotation: [number, number, number]
  linearVelocity: [number, number, number]
  angularVelocity: [number, number, number]
}
const _gains = {
  enabled: true,
  pitchDamp: 0,
  rollDamp: 0,
  yawDamp: 0,
  holdGain: 0,
  levelReturn: 0,
  altHold: 0,
  limitGain: 150,
  antiStall: 8,
  stallGuardDeg: 12,
  maxPitchDeg: 35,
  maxBankDeg: 55,
}
const UP = new THREE.Vector3(0, 1, 0)
const BACK_Z = new THREE.Vector3(0, 0, -1)

interface PlaneRigProps {
  aircraft: CompiledAircraft
  tunables: FlightTunables
  /** Point de spawn (sol) ; l'avion est posé à `spawn.y + REST_Y`. */
  spawn?: [number, number, number]
  /** Zones de ravitaillement (pads d'aérodromes, S5). */
  refuelPads?: RefuelPad[]
}

export function PlaneRig({ aircraft, tunables, spawn = [0, 0, 0], refuelPads }: PlaneRigProps) {
  const { stats, referenceForward, surfaces, dragPanels, colliders, engines } = aircraft
  const camAlign = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(BACK_Z, referenceForward),
    [referenceForward],
  )
  const visualAssembly = useMemo<PlaneAssembly>(
    () => ({ id: 'compiled', name: 'compiled', parts: aircraft.placed }),
    [aircraft],
  )

  const results = useMemo(() => surfaces.map(makeSurfaceResult), [surfaces])
  // Régime effectif par moteur (S2), recalculé au pas fixe (scratch, pas d'alloc).
  const engineLevels = useMemo(() => engines.map(() => ({ dry: 0, pc: false })), [engines])
  const dragResults = useMemo(() => dragPanels.map(makeSurfaceResult), [dragPanels])
  const vizPanels = useMemo<VizPanel[]>(
    () => [
      ...surfaces.map((s) => ({ position: s.position, normal: s.normal, area: s.area })),
      ...dragPanels.map((p) => ({ position: p.position, normal: p.normal, area: p.area })),
    ],
    [surfaces, dragPanels],
  )
  const facings = useRef<number[]>(new Array(surfaces.length + dragPanels.length).fill(0))

  // Train (S4-D) : inventaire des pièces de train du build — rupture light
  // (seuil = min strength × facteur leva) + rétraction physique (touche G).
  const gearInfo = useMemo(() => {
    let hasFixed = false
    let hasRetract = false
    let minStrength = Infinity
    const retractByNode = new Map<string, boolean>()
    for (const p of aircraft.placed) {
      const part = getPart(p.partId)
      if (part.category !== 'landingGear') continue
      if (part.retractable) hasRetract = true
      else hasFixed = true
      minStrength = Math.min(minStrength, part.strength)
      if (p.nodeId) retractByNode.set(p.nodeId, part.retractable)
    }
    return { hasFixed, hasRetract, minStrength, retractByNode }
  }, [aircraft])
  // AABB de l'avion (repère avion, depuis les colliders) — la fraction de
  // submersion (C3) compare son étendue VERTICALE monde à la ligne d'eau.
  const aabb = useMemo(() => {
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    for (const col of colliders) {
      for (let a = 0; a < 3; a++) {
        const h = col.ball ? col.half[0] : col.half[a]
        min[a] = Math.min(min[a], col.position[a] - h)
        max[a] = Math.max(max[a], col.position[a] + h)
      }
    }
    if (min[0] === Infinity) return { center: new THREE.Vector3(), half: new THREE.Vector3(0.5, 0.5, 0.5) }
    return {
      center: new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2),
      half: new THREE.Vector3((max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2),
    }
  }, [colliders])

  const gearDown = useGear((s) => s.down)
  const gearBroken = useGear((s) => s.broken)
  // Colliders effectifs : les ROUES (sphères) d'un train cassé — ou rentré (G) —
  // sont RETIRÉES du corps ⇒ l'avion repose/frotte sur le ventre (pas de support
  // fantôme). La boîte de structure (en soute) reste.
  const activeColliders = useMemo(
    () =>
      colliders.filter((col) => {
        if (!col.ball || !col.nodeId) return true
        const retract = gearInfo.retractByNode.get(col.nodeId)
        if (retract === undefined) return true // sphère hors train (aucune à ce jour)
        if (gearBroken) return false
        return retract ? gearDown : true
      }),
    [colliders, gearInfo, gearDown, gearBroken],
  )
  // Vitesse ENTRANT dans le pas physique (pré-impact) — rupture de train et
  // détection de crash (C1) comparent cette valeur (onContactForce arrive
  // APRÈS la résolution, la vitesse post-impact est déjà amortie).
  const prevVel = useRef(new THREE.Vector3())
  // Handle de collider → est-ce une ROUE ? (les roues encaissent l'impact ;
  // toute autre pièce au sol à vitesse notable = crash). Les handles sont
  // (ré)enregistrés au montage de chaque collider ; un handle réutilisé par un
  // de nos colliders est réécrit à son remontage.
  const colliderIsWheel = useRef(new Map<number, boolean>())

  const body = useRef<RapierRigidBody>(null)
  const input = useFlightInput()
  const controls = useRef<Deflections>({ elevator: 0, aileronL: 0, aileronR: 0, rudder: 0 })
  // Inclinaison capturée au dernier lâché du roulis (cible du maintien).
  const held = useRef({ bank: 0 })
  const camera = useThree((s) => s.camera)

  // Crash terre (C2) : avion remplacé par débris + explosion ; secousse caméra.
  const crashedUi = useCrash((s) => s.crashed)
  const crashCause = useCrash((s) => s.cause)
  const crashPose = useCrash((s) => s.pose)
  const exploded = crashedUi && crashCause !== 'water' && crashPose !== null
  const shake = useRef(0)
  // Fraction de submersion courante (C3) — télémétrie DEV.
  const subRef = useRef(0)
  useEffect(() => {
    if (!exploded) return
    shake.current = tunables.shakeIntensity
    playSfx('explosion')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- déclenché par le crash seul
  }, [exploded])

  // Carburant + rupture structurelle (étape 6).
  const fuelMax = stats.totalFuelUnits
  const fuel = useRef(fuelMax)
  const brokenRef = useRef(false) // autorité physique (frais dans le pas fixe)
  const hudTick = useRef(0)
  const [breakInfo, setBreakInfo] = useState<DetachInfo | null>(null)

  // PHYSIQUE — pas fixe : aéro par surfaces + poussée + assistance.
  useBeforePhysicsStep(() => {
    const rb = body.current
    if (!rb) return

    const lv = rb.linvel()
    _vel.set(lv.x, lv.y, lv.z)
    prevVel.current.copy(_vel)
    const av = rb.angvel()
    _omega.set(av.x, av.y, av.z)
    const rt = rb.rotation()
    _Q.set(rt.x, rt.y, rt.z, rt.w)
    const tr = rb.translation()
    _P.set(tr.x, tr.y, tr.z)
    const inp = input.current
    const speed = _vel.length()

    // GAZ (S2) : la consigne est un régime continu 0..1 rampé au clavier
    // (Maj +, Ctrl −) dans le pas fixe ; les jauges du HUD écrivent directement.
    const th = useThrottle.getState()
    const dThr = (inp.throttleUp - inp.throttleDown) * tunables.throttleRamp * FIXED_DT
    if (dThr !== 0) {
      if (th.linked) {
        useThrottle.setState({ master: THREE.MathUtils.clamp(th.master + dThr, 0, 1) })
      } else {
        // Délié : le clavier rampe TOUS les moteurs du même pas (les écarts restent).
        const pe: Record<string, number> = { ...th.perEngine }
        for (const eng of engines) {
          pe[eng.nodeId] = THREE.MathUtils.clamp((pe[eng.nodeId] ?? th.master) + dThr, 0, 1)
        }
        useThrottle.setState({ perEngine: pe })
      }
    }
    const cmd = useThrottle.getState()
    const reverse = inp.reverse > 0
    if (reverse !== cmd.reverse) useThrottle.setState({ reverse })

    // Régime par moteur : sous le CRAN = plage « sèche » (0..100 % de poussée) ;
    // au-delà (moteurs équipés, gaz avant) = POSTCOMBUSTION (règle 2 + S2).
    // Conso = Σ fuelUsage × régime × dt (× fuelMult en PC) ; coupé à sec.
    let burn = 0
    for (let i = 0; i < engines.length; i++) {
      const eng = engines[i]
      const lvl = cmd.linked ? cmd.master : (cmd.perEngine[eng.nodeId] ?? cmd.master)
      const dry = eng.afterburner ? Math.min(1, lvl / tunables.pcDetent) : lvl
      const pc = !!eng.afterburner && !reverse && lvl > tunables.pcDetent
      engineLevels[i].dry = dry
      engineLevels[i].pc = pc
      burn += eng.fuelUsage * dry * (pc && eng.afterburner ? eng.afterburner.fuelMult : 1)
    }
    if (burn > 0 && fuel.current > 0) {
      fuel.current = Math.max(0, fuel.current - burn * FIXED_DT)
    }

    // RAVITAILLEMENT (S5) : posé sur le pad d'un aérodrome, quasi à l'arrêt ⇒
    // le plein se refait (débit leva 🟡 hors dossier). Gratuit, comme le cargo.
    let padName: string | null = null
    if (refuelPads) {
      for (const pad of refuelPads) {
        const dx = _P.x - pad.x
        const dz = _P.z - pad.z
        // Repère local piste (même convention que le flatten du terrain).
        const lx = dx * pad.cos - dz * pad.sin
        const lz = dx * pad.sin + dz * pad.cos
        if (Math.abs(lx) < pad.hw && Math.abs(lz) < pad.hl && _P.y - pad.y < 6) {
          padName = pad.name
          break
        }
      }
    }
    // Crash (C1) : avion détruit ⇒ moteurs morts, pas de ravitaillement.
    const crashedNow = useCrash.getState().crashed
    const refueling =
      padName !== null && speed < tunables.refuelMaxSpeed && fuel.current < fuelMax && !crashedNow
    if (refueling) {
      fuel.current = Math.min(fuelMax, fuel.current + tunables.refuelRate * FIXED_DT)
    }
    const fuelOk = fuel.current > 0 && !crashedNow

    // Rupture structurelle : l'aile casse si vitesse > strength×100 (règle 5).
    if (!brokenRef.current && speed > stats.snapSpeedMs) {
      brokenRef.current = true
      _euler.setFromQuaternion(_Q)
      setBreakInfo({
        position: [_P.x, _P.y, _P.z],
        rotation: [_euler.x, _euler.y, _euler.z],
        linearVelocity: [_vel.x, _vel.y, _vel.z],
        angularVelocity: [_omega.x, _omega.y, _omega.z + 6],
      })
    }

    // Gouvernes : cible depuis l'input → lissage « servo » (pas fixe).
    // TRIM (S3) : déflexion permanente ajoutée à l'élévateur — la position de
    // gouverne fixe l'incidence/la vitesse d'équilibre (pas d'incidence figée).
    const md = THREE.MathUtils.degToRad(tunables.maxDeflectionDeg)
    const trim = THREE.MathUtils.degToRad(tunables.elevatorTrim)
    const k = Math.min(1, FIXED_DT * tunables.servoRate)
    const c = controls.current
    // Gouvernes d'aile = élevons : roulis (différentiel) + tangage (collectif).
    const elevon = -inp.pitch * md * tunables.wingElevon
    c.elevator += (trim + -inp.pitch * md - c.elevator) * k
    c.aileronL += (inp.roll * md + elevon - c.aileronL) * k
    c.aileronR += (-inp.roll * md + elevon - c.aileronR) * k
    c.rudder += (-inp.yaw * md - c.rudder) * k

    rb.resetForces(false)
    rb.resetTorques(false)

    const bodyState = {
      quaternion: _Q,
      position: _P,
      velocity: _vel,
      angularVelocity: _omega,
    }
    for (let i = 0; i < surfaces.length; i++) {
      const def = surfaces[i]
      // Aile cassée ⇒ ses bandes ne portent plus (l'avion chute).
      if (brokenRef.current && def.name.startsWith('wing')) {
        facings.current[i] = 0
        continue
      }
      const defl = def.controlKey ? c[def.controlKey] : 0
      const res = computeSurfaceForce(def, defl, bodyState, tunables, results[i])
      rb.addForceAtPoint(res.force, res.point, true)
      facings.current[i] = res.facing
    }
    for (let j = 0; j < dragPanels.length; j++) {
      const res = computePanelDrag(dragPanels[j], bodyState, tunables, dragResults[j])
      rb.addForceAtPoint(res.force, res.point, true)
      facings.current[surfaces.length + j] = res.facing
    }

    // Poussée : chaque moteur applique SA force à SON point, le long de SON axe,
    // à SON régime (S2). C maintenu = inverse de poussée au régime courant.
    let vizLevel = 0
    let vizBoost = false
    for (let i = 0; i < engines.length; i++) {
      const eng = engines[i]
      const st = engineLevels[i]
      const dry = fuelOk ? st.dry : 0
      const pc = fuelOk && st.pc
      if (dry === 0) continue
      _thrust.copy(eng.dir).applyQuaternion(_Q)
      const ab = pc && eng.afterburner ? eng.afterburner.thrustMult : 1
      const sign = reverse ? -1 : 1
      const mag =
        tunables.thrustCoef * eng.thrust * eng.limit * tunables.maxThrustLimit * dry * ab * sign
      _thrust.multiplyScalar(mag)
      _ePoint.copy(eng.point).applyQuaternion(_Q).add(_P)
      rb.addForceAtPoint(_thrust, _ePoint, true)
      vizLevel = Math.max(vizLevel, dry)
      vizBoost = vizBoost || pc
    }
    // Régimes réels → animation hélices/flammes (par moteur + global de repli).
    const actual: Record<string, { level: number; boost: boolean }> = {}
    for (let i = 0; i < engines.length; i++) {
      actual[engines[i].nodeId] = {
        level: fuelOk ? engineLevels[i].dry : 0,
        boost: fuelOk && engineLevels[i].pc,
      }
    }
    useThrottle.setState({ level: vizLevel, boost: vizBoost, actual })

    // EAU (C3) : fraction de submersion = (ligne d'eau − bas de l'avion) /
    // hauteur verticale MONDE (AABB orientée : demi-hauteur = Σ |R1j|·hj —
    // un avion piqué du nez présente une étendue verticale plus grande).
    // ≤ seuil : RÉCUPÉRABLE — flottaison (équilibre du poids à
    // `waterBuoyancyEq`) + forte traînée d'eau ∝ v² ⇒ on effleure, ça freine
    // fort, on ressort en tirant. > seuil : NAUFRAGE — crash 'water',
    // flottaison coupée ⇒ l'avion coule (visuels C4). Marche aussi pour les
    // lacs (même nappe d'eau globale à SEA_Y).
    _m4.makeRotationFromQuaternion(_Q)
    const me = _m4.elements
    const halfY =
      Math.abs(me[1]) * aabb.half.x + Math.abs(me[5]) * aabb.half.y + Math.abs(me[9]) * aabb.half.z
    _aabbC.copy(aabb.center).applyQuaternion(_Q).add(_P)
    const subFrac =
      halfY > 0 ? Math.min(1, Math.max(0, (SEA_Y - (_aabbC.y - halfY)) / (2 * halfY))) : 0
    subRef.current = subFrac
    if (subFrac > 0) {
      const m = rb.mass()
      const crashState = useCrash.getState()
      if (!crashState.crashed && subFrac > tunables.waterSinkFraction) {
        const rq = rb.rotation()
        crashState.crash('water', {
          position: [_P.x, _P.y, _P.z],
          quaternion: [rq.x, rq.y, rq.z, rq.w],
          velocity: [_vel.x, _vel.y, _vel.z],
        })
        useThrottle.getState().resetCommand()
      }
      const sinking = useCrash.getState().cause === 'water'
      if (!sinking) {
        rb.addForce(
          { x: 0, y: m * tunables.gravity * (subFrac / tunables.waterBuoyancyEq), z: 0 },
          true,
        )
      }
      // Traînée d'eau (∝ submersion × v²) + viscosité verticale + amorti angulaire.
      _wDrag.copy(_vel).multiplyScalar(-tunables.waterDrag * subFrac * speed)
      _wDrag.y -= tunables.waterViscosity * subFrac * m * _vel.y
      rb.addForce(_wDrag, true)
      rb.addTorque(
        {
          x: -_omega.x * tunables.waterAngularDrag * subFrac * m,
          y: -_omega.y * tunables.waterAngularDrag * subFrac * m,
          z: -_omega.z * tunables.waterAngularDrag * subFrac * m,
        },
        true,
      )
    }

    // Capture l'inclinaison tant qu'on roule ; figée au lâché ⇒ cible du maintien
    // (clampée dans la borne pour éviter tout conflit hold ↔ borne).
    _att.set(1, 0, 0).applyQuaternion(_Q)
    const curBank = Math.asin(THREE.MathUtils.clamp(_att.y, -1, 1))
    if (Math.abs(inp.roll) > 0.02) {
      const maxB = THREE.MathUtils.degToRad(tunables.maxBankDeg)
      held.current.bank = THREE.MathUtils.clamp(curBank, -maxB, maxB)
    }

    // Assistance : ET du toggle joueur (menu Paramètres S6) ET du dev leva.
    _gains.enabled = tunables.assistEnabled && useSettings.getState().assist
    _gains.pitchDamp = tunables.pitchDamp
    _gains.rollDamp = tunables.rollDamp
    _gains.yawDamp = tunables.yawDamp
    _gains.holdGain = tunables.holdGain
    _gains.levelReturn = tunables.levelReturn
    _gains.altHold = tunables.altHold
    _gains.limitGain = tunables.limitGain
    _gains.antiStall = tunables.antiStall
    _gains.stallGuardDeg = tunables.stallGuardDeg
    _gains.maxPitchDeg = tunables.maxPitchDeg
    _gains.maxBankDeg = tunables.maxBankDeg
    // AoA aile représentative (bande interne) pour l'anti-décrochage.
    computeAssistTorque(
      _Q,
      _omega,
      _vel.y,
      held.current.bank,
      results[0].aoaDeg,
      _vel.length(),
      inp,
      _gains,
      _assist,
    )
    rb.addTorque(_assist, true)

    // HUD : push à cadence réduite (~15 Hz) vers le store.
    if (++hudTick.current % 4 === 0) {
      _dbg.copy(referenceForward).applyQuaternion(_Q)
      useHud.setState({
        speed,
        altitude: _P.y,
        fuel: fuel.current,
        fuelMax,
        overspeed: speed > stats.warningSpeedMs,
        broken: brokenRef.current,
        outOfFuel: fuel.current <= 0,
        gearBroken: useGear.getState().broken,
        gearUp: gearInfo.hasRetract && !useGear.getState().down,
        refueling,
        padName,
        x: _P.x,
        z: _P.z,
        heading: Math.atan2(_dbg.x, -_dbg.z), // 0 = nord (-Z), sens horaire vu de dessus
      })
    }
  })

  // RENDU — caméra référencée moteur + télémétrie + secousse (C2).
  useFrame((_, dt) => {
    const rb = body.current
    if (rb) {
      const rt = rb.rotation()
      _Q.set(rt.x, rt.y, rt.z, rt.w)
      const tr = rb.translation()
      _P.set(tr.x, tr.y, tr.z)

      _offset.copy(referenceForward).multiplyScalar(-tunables.camDistance).addScaledVector(UP, tunables.camHeight)
      _camPos.copy(_offset).applyQuaternion(_Q).add(_P)
      camera.position.lerp(_camPos, 0.12)
      _camQuat.copy(_Q).multiply(camAlign)
      camera.quaternion.slerp(_camQuat, 0.12)
    }

    // Secousse (C2) : offset aléatoire amorti — actif aussi quand l'avion a
    // explosé (corps démonté, caméra figée sur le point de crash).
    if (shake.current > 0.001) {
      const s = shake.current
      camera.position.x += (Math.random() - 0.5) * s
      camera.position.y += (Math.random() - 0.5) * s * 0.7
      camera.position.z += (Math.random() - 0.5) * s
      shake.current = Math.max(0, s - dt * (1.2 + s * 2.5))
    }

    if (import.meta.env.DEV && rb) {
      const lv = rb.linvel()
      _vel.set(lv.x, lv.y, lv.z)
      _dbg.set(0, 0, -1).applyQuaternion(_Q)
      const pitch = Math.round(THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(_dbg.y, -1, 1))))
      _dbg.set(1, 0, 0).applyQuaternion(_Q)
      const bank = Math.round(THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(_dbg.y, -1, 1))))
      ;(window as unknown as Record<string, unknown>).__plane = {
        speed: +_vel.length().toFixed(1),
        alt: +_P.y.toFixed(1),
        vy: +_vel.y.toFixed(1),
        aoa: +results[0].aoaDeg.toFixed(1),
        pitch,
        bank,
        thr: +useThrottle.getState().level.toFixed(2),
        snap: stats.snapSpeedMs,
        broken: brokenRef.current,
        crashed: useCrash.getState().crashed,
        crashCause: useCrash.getState().cause,
        sub: +subRef.current.toFixed(2),
      }
    }
  })

  // Reset (touche R) : réinitialise position/vitesses + carburant + rupture.
  useEffect(() => {
    const onReset = (e: KeyboardEvent) => {
      if (e.code !== 'KeyR') return
      // Stores D'ABORD : après une explosion le RigidBody est DÉMONTÉ
      // (body.current = null) — le reset du store crash le fait remonter
      // au spawn (props initiales : position + vitesses nulles).
      fuel.current = fuelMax
      brokenRef.current = false
      held.current.bank = 0
      useThrottle.getState().resetCommand()
      useGear.getState().reset()
      useCrash.getState().reset()
      setBreakInfo(null)
      const rb = body.current
      if (!rb) return
      rb.setTranslation({ x: spawn[0], y: spawn[1] + REST_Y, z: spawn[2] }, true)
      rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
    window.addEventListener('keydown', onReset)
    return () => window.removeEventListener('keydown', onReset)
  }, [fuelMax, spawn])

  // Train rétractable : G = rentrer / sortir (S4-D).
  useEffect(() => {
    const onGear = (e: KeyboardEvent) => {
      if (e.code === 'KeyG' && gearInfo.hasRetract) useGear.getState().toggle()
    }
    window.addEventListener('keydown', onGear)
    return () => window.removeEventListener('keydown', onGear)
  }, [gearInfo])

  // Retour au hangar : altitude HUD à 0 + gaz à zéro + train sorti/réparé.
  useEffect(
    () => () => {
      useHud.setState({ altitude: 0, gearBroken: false, gearUp: false, refueling: false, padName: null })
      useThrottle.getState().resetCommand()
      useGear.getState().reset()
      useCrash.getState().reset()
    },
    [],
  )

  // Sonde de contacts S1 (diagnostic « coups » au sol) — DEV only.
  useEffect(() => {
    if (import.meta.env.DEV) installContactsApi()
  }, [])

  // Harnais de test DEV (C2+) : téléporte l'avion avec une vitesse imposée —
  // impacts/immersions REPRODUCTIBLES en preview (un piqué « au manche » est
  // trop doux pour atteindre les seuils de crash de façon fiable).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as Record<string, unknown>).__planeApi = {
      launch: (x: number, y: number, z: number, vx: number, vy: number, vz: number) => {
        const rb = body.current
        if (!rb) return false
        try {
          rb.setTranslation({ x, y, z }, true)
          rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
          rb.setLinvel({ x: vx, y: vy, z: vz }, true)
          rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
          return true
        } catch {
          return false // handle rapier libéré (unmount/HMR) — réessayer
        }
      },
    }
  }, [])

  return (
    <>
      {/* Avion : DÉMONTÉ après explosion (remplacé par les débris C2) ;
          remonté au spawn quand le store crash est réinitialisé (R / C5). */}
      {!exploded && (
      <RigidBody
        ref={body}
        colliders={false}
        position={[spawn[0], spawn[1] + REST_Y, spawn[2]]}
      linearDamping={tunables.linearDamping}
      angularDamping={tunables.angularDamping}
      canSleep={false}
      ccd
      onContactForce={(e) => {
        const rb = body.current
        if (!rb) return
        if (import.meta.env.DEV) recordContact(e, rb)

        // CRASH terre (C1) : contre le MONDE. ⚠️ Les heightfields de terrain
        // sont créés SANS corps parent (TerrainColliders, world.createCollider)
        // ⇒ `e.other.rigidBody` est NULL sur le vrai relief (seuls le pad de
        // spawn et les bâtiments ont un RigidBody fixe). « Monde » = autre
        // corps ABSENT (terrain) OU fixe (pad/bâtiment) ; on exclut seulement
        // les corps dynamiques (débris, aile détachée). Deux déclencheurs :
        //  (a) vitesse d'approche pré-impact projetée sur la normale de
        //      contact > seuil fatal (touchdown trop dur, flanc, mur) ;
        //  (b) une pièce NON-roue touche à vitesse totale notable (ventre,
        //      cockpit, bout d'aile) — une glissade lente reste survivable.
        const other = e.other.rigidBody
        const isWorld = !other || other.isFixed()
        const crashStore = useCrash.getState()
        if (!crashStore.crashed && isWorld) {
          const n = e.maxForceDirection
          const nMag = Math.hypot(n.x, n.y, n.z)
          const pv = prevVel.current
          const approach = nMag > 1e-6 ? Math.abs((pv.x * n.x + pv.y * n.y + pv.z * n.z) / nMag) : 0
          const handle = e.target.collider?.handle
          const isWheel = handle !== undefined && colliderIsWheel.current.get(handle) === true
          const fatalImpact = approach > tunables.crashImpactSpeed
          const structureHit = !isWheel && pv.length() > tunables.crashContactSpeed
          if (fatalImpact || structureHit) {
            const p = rb.translation()
            const rq = rb.rotation()
            // Pose complète capturée (position + orientation + vitesse
            // pré-impact) : ancre de l'explosion et héritage des débris (C2).
            crashStore.crash(fatalImpact ? 'impact' : 'structure', {
              position: [p.x, p.y, p.z],
              quaternion: [rq.x, rq.y, rq.z, rq.w],
              velocity: [pv.x, pv.y, pv.z],
            })
            useThrottle.getState().resetCommand()
          }
        }

        // Rupture LIGHT du train (S4-D) : contact avec une vitesse verticale
        // pré-impact trop dure, roues déployées ⇒ roues perdues (alerte HUD).
        if (gearInfo.minStrength === Infinity) return
        const g = useGear.getState()
        if (g.broken) return
        const wheelsExposed = gearInfo.hasFixed || (gearInfo.hasRetract && g.down)
        if (!wheelsExposed) return
        if (prevVel.current.y < -gearInfo.minStrength * tunables.gearBreakFactor) g.setBroken(true)
      }}
    >
        {activeColliders.map((col, i) =>
          col.ball ? (
            // Roues : sphères (roulent sur les arêtes du terrain — S1).
            <BallCollider
              key={i}
              ref={(c: Collider | null) => {
                if (c) colliderIsWheel.current.set(c.handle, true)
              }}
              args={[col.half[0]]}
              position={col.position}
              mass={col.mass}
              friction={tunables.groundFriction}
              contactSkin={tunables.contactSkin}
            />
          ) : (
            <CuboidCollider
              key={i}
              ref={(c: Collider | null) => {
                if (c) colliderIsWheel.current.set(c.handle, false)
              }}
              args={col.half}
              position={col.position}
              rotation={col.rotation}
              mass={col.mass}
              friction={tunables.groundFriction}
              contactSkin={tunables.contactSkin}
            />
          ),
        )}

        <ControlsContext.Provider value={controls}>
          <Plane assembly={visualAssembly} hideWings={!!breakInfo} />
        </ControlsContext.Provider>

        <AirflowPanels panels={vizPanels} facings={facings} visible={tunables.showAirflow} />
      </RigidBody>
      )}

      {/* Explosion soignée (C2) : éclatement en pièces + flash/feu/fumée/
          braises/onde — style arcade, pas de gore. */}
      {exploded && crashPose && (
        <>
          <CrashDebris
            aircraft={aircraft}
            pose={crashPose}
            impulse={tunables.debrisImpulse}
            lifetime={tunables.debrisLifetime}
          />
          <CrashExplosion
            center={crashPose.position}
            radius={tunables.explosionRadius}
            duration={tunables.explosionDuration}
          />
        </>
      )}

      {breakInfo && <DetachedWing {...breakInfo} />}
    </>
  )
}
