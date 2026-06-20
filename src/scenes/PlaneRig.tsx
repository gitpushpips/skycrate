import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Plane } from './Plane'
import { aggregateStats } from '../core/assembly'
import type { PlaneAssembly } from '../core/assembly'
import { computeAeroForce } from '../core/physics/aero'
import type { AeroTunables } from '../core/physics/aero'
import { useEngineInput, throttleFrom } from '../core/flight/input'

/** Hauteur de repos : collider (centre -0,45, demi-haut 0,85) → bas à ~-1,3 ≈ roues. */
const REST_Y = 1.3

interface PlaneRigProps {
  assembly: PlaneAssembly
  tunables: AeroTunables
  friction: number
  linearDamping: number
  angularDamping: number
}

/**
 * Avion physique : RigidBody Rapier (masse = Σ poids via aggregateStats) + collider
 * composé, avec application par frame des forces aéro/poussée au centre de masse.
 *
 * Étape 4 : rotations VERROUILLÉES (forces sans couple ⇒ pas de tumbling), pour
 * tester proprement gravité / portance / traînée / poussée. L'étape 5 déverrouille
 * et ajoute les couples de contrôle + la caméra référencée moteur.
 */
export function PlaneRig({ assembly, tunables, friction, linearDamping, angularDamping }: PlaneRigProps) {
  const stats = useMemo(() => aggregateStats(assembly), [assembly])
  const body = useRef<RapierRigidBody>(null)
  const input = useEngineInput()

  const force = useRef(new THREE.Vector3())
  const quat = useRef(new THREE.Quaternion())
  const vel = useRef(new THREE.Vector3())

  useFrame(() => {
    const rb = body.current
    if (!rb) return

    const lv = rb.linvel()
    vel.current.set(lv.x, lv.y, lv.z)
    const rt = rb.rotation()
    quat.current.set(rt.x, rt.y, rt.z, rt.w)
    const throttle = throttleFrom(input.current)

    computeAeroForce(
      {
        quaternion: quat.current,
        velocity: vel.current,
        totalLift: stats.totalLift,
        totalDrag: stats.totalDrag,
        totalThrust: stats.totalThrust,
        throttle,
      },
      tunables,
      force.current,
    )

    rb.resetForces(false)
    rb.addForce(force.current, true)
  })

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={[0, REST_Y, 0]}
      enabledRotations={[false, false, false]}
      linearDamping={linearDamping}
      angularDamping={angularDamping}
      canSleep={false}
    >
      <CuboidCollider args={[0.6, 0.85, 2.1]} position={[0, -0.45, 0]} mass={stats.totalWeight} friction={friction} />
      <Plane assembly={assembly} />
    </RigidBody>
  )
}
