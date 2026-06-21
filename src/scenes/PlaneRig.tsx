import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Plane } from './Plane'
import { ControlsContext } from './controlsContext'
import { aggregateStats, engineReferenceForward, J1_AERO_SURFACES } from '../core/assembly'
import type { PlaneAssembly } from '../core/assembly'
import { getPart } from '../core/parts'
import type { PartCategory } from '../core/parts'
import {
  computeSurfaceForce,
  makeSurfaceResult,
} from '../core/physics/aerodynamics'
import type { Deflections } from '../core/physics/aerodynamics'
import { useFlightInput } from '../core/flight/input'
import type { FlightTunables } from './flightControls'

const REST_Y = 1.3

// Forme de collider par catégorie (demi-extents + décalage), calée sur le visuel.
const COLLIDER: Record<PartCategory, { half: [number, number, number]; offset: [number, number, number] }> = {
  fuselage: { half: [0.45, 0.475, 2.0], offset: [0, 0, 0] },
  wing: { half: [3.6, 0.08, 0.75], offset: [0, 0, 0] },
  stabilizer: { half: [1.4, 0.065, 0.6], offset: [0, 0.18, 0.55] },
  engine: { half: [0.5, 0.5, 0.4], offset: [0, 0, 0] },
  landingGear: { half: [1.0, 0.12, 1.4], offset: [0, -1.15, 0] },
}

// Scratch.
const _P = new THREE.Vector3()
const _Q = new THREE.Quaternion()
const _vel = new THREE.Vector3()
const _omega = new THREE.Vector3()
const _thrust = new THREE.Vector3()
const _offset = new THREE.Vector3()
const _camPos = new THREE.Vector3()
const _camQuat = new THREE.Quaternion()
const UP = new THREE.Vector3(0, 1, 0)
const BACK_Z = new THREE.Vector3(0, 0, -1)

interface PlaneRigProps {
  assembly: PlaneAssembly
  tunables: FlightTunables
}

export function PlaneRig({ assembly, tunables }: PlaneRigProps) {
  const stats = useMemo(() => aggregateStats(assembly), [assembly])
  const referenceForward = useMemo(() => engineReferenceForward(assembly), [assembly])
  const camAlign = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(BACK_Z, referenceForward),
    [referenceForward],
  )

  const surfaces = J1_AERO_SURFACES
  const results = useMemo(() => surfaces.map(makeSurfaceResult), [surfaces])

  const body = useRef<RapierRigidBody>(null)
  const input = useFlightInput()
  const controls = useRef<Deflections>({ elevator: 0, aileronL: 0, aileronR: 0, rudder: 0 })
  const camera = useThree((s) => s.camera)

  useFrame((_, delta) => {
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

    // Gouvernes : cible depuis l'input → lissage « servo ».
    const md = THREE.MathUtils.degToRad(tunables.maxDeflectionDeg)
    const k = Math.min(1, delta * tunables.servoRate)
    const c = controls.current
    c.elevator += (-inp.pitch * md - c.elevator) * k
    c.aileronL += (inp.roll * md - c.aileronL) * k
    c.aileronR += (-inp.roll * md - c.aileronR) * k
    c.rudder += (-inp.yaw * md - c.rudder) * k

    rb.resetForces(false)
    rb.resetTorques(false)

    // Forces aérodynamiques par surface, appliquées à leur point.
    const bodyState = {
      quaternion: _Q,
      position: _P,
      velocity: _vel,
      angularVelocity: _omega,
    }
    for (let i = 0; i < surfaces.length; i++) {
      const def = surfaces[i]
      const defl = def.controlKey ? c[def.controlKey] : 0
      const res = computeSurfaceForce(def, defl, bodyState, tunables, results[i])
      rb.addForceAtPoint(res.force, res.point, true)
    }

    // Poussée (finie) le long de l'axe moteur, au centre de masse.
    _thrust.copy(referenceForward).applyQuaternion(_Q)
    const thrustMag = tunables.thrustCoef * stats.totalThrust * tunables.maxThrustLimit * inp.throttle
    _thrust.multiplyScalar(thrustMag)
    rb.addForce(_thrust, true)

    // Caméra 3e personne référencée moteur.
    _offset.copy(referenceForward).multiplyScalar(-tunables.camDistance).addScaledVector(UP, tunables.camHeight)
    _camPos.copy(_offset).applyQuaternion(_Q).add(_P)
    camera.position.lerp(_camPos, 0.12)
    _camQuat.copy(_Q).multiply(camAlign)
    camera.quaternion.slerp(_camQuat, 0.12)
  })

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={[0, REST_Y, 0]}
      linearDamping={tunables.linearDamping}
      angularDamping={tunables.angularDamping}
      canSleep={false}
      ccd
    >
      {assembly.parts.map((placed, i) => {
        const part = getPart(placed.partId)
        const shape = COLLIDER[part.category]
        return (
          <CuboidCollider
            key={`${placed.partId}#${i}`}
            args={shape.half}
            position={[
              placed.position[0] + shape.offset[0],
              placed.position[1] + shape.offset[1],
              placed.position[2] + shape.offset[2],
            ]}
            mass={part.weight}
            friction={tunables.groundFriction}
          />
        )
      })}

      <ControlsContext.Provider value={controls}>
        <Plane assembly={assembly} />
      </ControlsContext.Provider>
    </RigidBody>
  )
}
