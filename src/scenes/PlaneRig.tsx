import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Plane } from './Plane'
import { aggregateStats, engineReferenceForward } from '../core/assembly'
import type { PlaneAssembly } from '../core/assembly'
import { computeAeroForce } from '../core/physics/aero'
import { useFlightInput } from '../core/flight/input'
import type { FlightTunables } from './flightControls'

/** Hauteur de repos : collider (centre -0,45, demi-haut 0,85) → bas à ~-1,3 ≈ roues. */
const REST_Y = 1.3

// Scratch partagé (instance unique) — évite toute alloc par frame.
const _P = new THREE.Vector3()
const _Q = new THREE.Quaternion()
const _vel = new THREE.Vector3()
const _force = new THREE.Vector3()
const _torque = new THREE.Vector3()
const _offset = new THREE.Vector3()
const _camPos = new THREE.Vector3()
const _camQuat = new THREE.Quaternion()
const UP = new THREE.Vector3(0, 1, 0)
const BACK_Z = new THREE.Vector3(0, 0, -1)

interface PlaneRigProps {
  assembly: PlaneAssembly
  tunables: FlightTunables
}

/**
 * Avion physique pilotable (étape 5) : RigidBody Rapier (masse = Σ poids),
 * forces aéro/poussée au centre de masse + couples de contrôle (tangage/roulis/
 * lacet) dans le repère local. Caméra 3ᵉ personne accrochée à l'orientation du
 * MOTEUR (règle 1).
 */
export function PlaneRig({ assembly, tunables }: PlaneRigProps) {
  const stats = useMemo(() => aggregateStats(assembly), [assembly])
  const referenceForward = useMemo(() => engineReferenceForward(assembly), [assembly])
  // Oriente la caméra pour que son -Z regarde dans l'axe du moteur.
  const camAlign = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(BACK_Z, referenceForward),
    [referenceForward],
  )

  const body = useRef<RapierRigidBody>(null)
  const input = useFlightInput()
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    const rb = body.current
    if (!rb) return

    const lv = rb.linvel()
    _vel.set(lv.x, lv.y, lv.z)
    const rt = rb.rotation()
    _Q.set(rt.x, rt.y, rt.z, rt.w)
    const tr = rb.translation()
    _P.set(tr.x, tr.y, tr.z)
    const inp = input.current

    // Forces aéro + poussée au centre de masse.
    computeAeroForce(
      {
        quaternion: _Q,
        velocity: _vel,
        totalLift: stats.totalLift,
        totalDrag: stats.totalDrag,
        totalThrust: stats.totalThrust,
        throttle: inp.throttle,
      },
      tunables,
      _force,
    )
    rb.resetForces(false)
    rb.addForce(_force, true)

    // Couples de contrôle (repère local → monde) : X tangage, Y lacet, Z roulis.
    _torque.set(
      tunables.pitchAuthority * inp.pitch,
      -tunables.yawAuthority * inp.yaw,
      -tunables.rollAuthority * inp.roll,
    )
    _torque.applyQuaternion(_Q)
    rb.resetTorques(false)
    rb.addTorque(_torque, true)

    // Caméra 3e personne, derrière le moteur, suivant son orientation.
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
      <CuboidCollider
        args={[0.6, 0.85, 2.1]}
        position={[0, -0.45, 0]}
        mass={stats.totalWeight}
        friction={tunables.groundFriction}
      />
      <Plane assembly={assembly} />
    </RigidBody>
  )
}
