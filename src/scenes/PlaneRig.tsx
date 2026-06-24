import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider, useBeforePhysicsStep } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Plane } from './Plane'
import { DetachedWing } from './DetachedWing'
import { ControlsContext } from './controlsContext'
import { useHud } from '../store/hud'
import type { PlaneAssembly } from '../core/assembly'
import { computeSurfaceForce, computePanelDrag, makeSurfaceResult } from '../core/physics/aerodynamics'
import type { Deflections } from '../core/physics/aerodynamics'
import { useFlightInput } from '../core/flight/input'
import { computeAssistTorque } from '../core/flight/assist'
import type { CompiledAircraft } from '../core/build/compile'
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
}

export function PlaneRig({ aircraft, tunables }: PlaneRigProps) {
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
  const dragResults = useMemo(() => dragPanels.map(makeSurfaceResult), [dragPanels])
  const vizPanels = useMemo<VizPanel[]>(
    () => [
      ...surfaces.map((s) => ({ position: s.position, normal: s.normal, area: s.area })),
      ...dragPanels.map((p) => ({ position: p.position, normal: p.normal, area: p.area })),
    ],
    [surfaces, dragPanels],
  )
  const facings = useRef<number[]>(new Array(surfaces.length + dragPanels.length).fill(0))

  const body = useRef<RapierRigidBody>(null)
  const input = useFlightInput()
  const controls = useRef<Deflections>({ elevator: 0, aileronL: 0, aileronR: 0, rudder: 0 })
  // Inclinaison capturée au dernier lâché du roulis (cible du maintien).
  const held = useRef({ bank: 0 })
  const camera = useThree((s) => s.camera)

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
    const av = rb.angvel()
    _omega.set(av.x, av.y, av.z)
    const rt = rb.rotation()
    _Q.set(rt.x, rt.y, rt.z, rt.w)
    const tr = rb.translation()
    _P.set(tr.x, tr.y, tr.z)
    const inp = input.current
    const speed = _vel.length()

    // Carburant : conso = Σ fuelUsage × |throttle| × dt (× fuelMult en PC) ; coupé à sec.
    const boosting = inp.boost > 0 && inp.throttle > 0
    if (inp.throttle !== 0 && fuel.current > 0) {
      let burn = 0
      for (const eng of engines) {
        burn += eng.fuelUsage * (boosting && eng.afterburner ? eng.afterburner.fuelMult : 1)
      }
      fuel.current = Math.max(0, fuel.current - burn * Math.abs(inp.throttle) * FIXED_DT)
    }
    const effThrottle = fuel.current > 0 ? inp.throttle : 0

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
    const md = THREE.MathUtils.degToRad(tunables.maxDeflectionDeg)
    const k = Math.min(1, FIXED_DT * tunables.servoRate)
    const c = controls.current
    // Gouvernes d'aile = élevons : roulis (différentiel) + tangage (collectif).
    const elevon = -inp.pitch * md * tunables.wingElevon
    c.elevator += (-inp.pitch * md - c.elevator) * k
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

    // Poussée : chaque moteur applique sa force à SON point, le long de SON axe.
    // Postcombustion (Espace, gaz vers l'avant) : ×thrustMult sur les moteurs équipés.
    const boostThrust = inp.boost > 0 && effThrottle > 0
    for (const eng of engines) {
      _thrust.copy(eng.dir).applyQuaternion(_Q)
      const ab = boostThrust && eng.afterburner ? eng.afterburner.thrustMult : 1
      const mag = tunables.thrustCoef * eng.thrust * eng.limit * tunables.maxThrustLimit * effThrottle * ab
      _thrust.multiplyScalar(mag)
      _ePoint.copy(eng.point).applyQuaternion(_Q).add(_P)
      rb.addForceAtPoint(_thrust, _ePoint, true)
    }

    // Capture l'inclinaison tant qu'on roule ; figée au lâché ⇒ cible du maintien
    // (clampée dans la borne pour éviter tout conflit hold ↔ borne).
    _att.set(1, 0, 0).applyQuaternion(_Q)
    const curBank = Math.asin(THREE.MathUtils.clamp(_att.y, -1, 1))
    if (Math.abs(inp.roll) > 0.02) {
      const maxB = THREE.MathUtils.degToRad(tunables.maxBankDeg)
      held.current.bank = THREE.MathUtils.clamp(curBank, -maxB, maxB)
    }

    _gains.enabled = tunables.assistEnabled
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
      useHud.setState({
        speed,
        altitude: _P.y,
        fuel: fuel.current,
        fuelMax,
        overspeed: speed > stats.warningSpeedMs,
        broken: brokenRef.current,
        outOfFuel: fuel.current <= 0,
      })
    }
  })

  // RENDU — caméra référencée moteur + télémétrie.
  useFrame(() => {
    const rb = body.current
    if (!rb) return
    const rt = rb.rotation()
    _Q.set(rt.x, rt.y, rt.z, rt.w)
    const tr = rb.translation()
    _P.set(tr.x, tr.y, tr.z)

    _offset.copy(referenceForward).multiplyScalar(-tunables.camDistance).addScaledVector(UP, tunables.camHeight)
    _camPos.copy(_offset).applyQuaternion(_Q).add(_P)
    camera.position.lerp(_camPos, 0.12)
    _camQuat.copy(_Q).multiply(camAlign)
    camera.quaternion.slerp(_camQuat, 0.12)

    if (import.meta.env.DEV) {
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
        thr: input.current.throttle,
        snap: stats.snapSpeedMs,
        broken: brokenRef.current,
      }
    }
  })

  // Reset (touche R) : réinitialise position/vitesses + carburant + rupture.
  useEffect(() => {
    const onReset = (e: KeyboardEvent) => {
      if (e.code !== 'KeyR') return
      const rb = body.current
      if (!rb) return
      rb.setTranslation({ x: 0, y: REST_Y, z: 0 }, true)
      rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
      fuel.current = fuelMax
      brokenRef.current = false
      held.current.bank = 0
      setBreakInfo(null)
    }
    window.addEventListener('keydown', onReset)
    return () => window.removeEventListener('keydown', onReset)
  }, [fuelMax])

  return (
    <>
      <RigidBody
        ref={body}
        colliders={false}
        position={[0, REST_Y, 0]}
      linearDamping={tunables.linearDamping}
      angularDamping={tunables.angularDamping}
      canSleep={false}
      ccd
    >
        {colliders.map((col, i) => (
          <CuboidCollider
            key={i}
            args={col.half}
            position={col.position}
            rotation={col.rotation}
            mass={col.mass}
            friction={tunables.groundFriction}
          />
        ))}

        <ControlsContext.Provider value={controls}>
          <Plane assembly={visualAssembly} hideWings={!!breakInfo} />
        </ControlsContext.Provider>

        <AirflowPanels panels={vizPanels} facings={facings} visible={tunables.showAirflow} />
      </RigidBody>

      {breakInfo && <DetachedWing {...breakInfo} />}
    </>
  )
}
