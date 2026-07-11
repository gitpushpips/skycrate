import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { RigidBody, BallCollider, CuboidCollider } from '@react-three/rapier'
import { Plane } from './Plane'
import type { CompiledAircraft } from '../core/build/compile'
import type { PlaneAssembly } from '../core/assembly'
import type { CrashPose } from '../store/crash'

/**
 * Débris d'explosion (C2) : l'avion ÉCLATE EN SES PIÈCES. Chaque pièce du
 * graphe compilé devient un corps Rapier indépendant (ses propres colliders,
 * réexprimés en repère pièce) lâché à sa pose monde au moment du crash, avec
 * une impulsion radiale depuis le centre + un couple aléatoire — les morceaux
 * volent, retombent et roulent. Nettoyés après `lifetime` secondes.
 */
interface DebrisSpec {
  key: string
  position: [number, number, number]
  rotation: [number, number, number]
  linearVelocity: [number, number, number]
  angularVelocity: [number, number, number]
  colliders: {
    half: [number, number, number]
    position: [number, number, number]
    rotation: [number, number, number]
    mass: number
    ball?: boolean
  }[]
  assembly: PlaneAssembly
}

const _q = new THREE.Quaternion()
const _pq = new THREE.Quaternion()
const _inv = new THREE.Quaternion()
const _cq = new THREE.Quaternion()
const _e = new THREE.Euler()
const _v = new THREE.Vector3()
const _dir = new THREE.Vector3()

/** RNG local (débris décoratifs — pas besoin de déterminisme seedé). */
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

function buildDebris(aircraft: CompiledAircraft, pose: CrashPose, impulse: number): DebrisSpec[] {
  const crashQ = _q.set(...pose.quaternion)
  const out: DebrisSpec[] = []
  for (const part of aircraft.placed) {
    if (!part.nodeId) continue
    const partQ = _pq.setFromEuler(_e.set(...(part.rotation ?? [0, 0, 0])))

    // Pose monde de la pièce = pose du crash ∘ transform pièce (repère avion).
    const wp = _v.set(...part.position).applyQuaternion(crashQ)
    const position: [number, number, number] = [
      pose.position[0] + wp.x,
      pose.position[1] + wp.y,
      pose.position[2] + wp.z,
    ]
    const worldQ = crashQ.clone().multiply(partQ)
    _e.setFromQuaternion(worldQ)
    const rotation: [number, number, number] = [_e.x, _e.y, _e.z]

    // Impulsion : radiale depuis le CG (repère avion), biaisée vers le haut,
    // + héritage partiel de la vitesse d'impact.
    _dir.set(part.position[0] + rnd(-0.4, 0.4), part.position[1] + rnd(-0.2, 0.2), part.position[2] + rnd(-0.4, 0.4))
    if (_dir.lengthSq() < 0.05) _dir.set(rnd(-1, 1), 0.5, rnd(-1, 1))
    _dir.normalize().applyQuaternion(crashQ)
    _dir.y = Math.abs(_dir.y) * 0.6 + 0.55 // vers le haut (gerbe)
    _dir.normalize()
    const speed = impulse * rnd(0.65, 1.35)
    // Héritage FAIBLE de la vitesse d'impact (sinon une chute verticale
    // écrase la gerbe d'éjection vers le haut).
    const linearVelocity: [number, number, number] = [
      pose.velocity[0] * 0.25 + _dir.x * speed,
      Math.max(pose.velocity[1] * 0.05, 0) + _dir.y * speed,
      pose.velocity[2] * 0.25 + _dir.z * speed,
    ]
    const angularVelocity: [number, number, number] = [rnd(-7, 7), rnd(-7, 7), rnd(-7, 7)]

    // Colliders de LA pièce (repère avion → repère pièce).
    _inv.copy(partQ).invert()
    const colliders = aircraft.colliders
      .filter((c) => c.nodeId === part.nodeId)
      .map((c) => {
        const lp = _v
          .set(c.position[0] - part.position[0], c.position[1] - part.position[1], c.position[2] - part.position[2])
          .applyQuaternion(_inv)
        _cq.setFromEuler(_e.set(...c.rotation))
        _e.setFromQuaternion(_cq.premultiply(_inv))
        return {
          half: c.half,
          position: [lp.x, lp.y, lp.z] as [number, number, number],
          rotation: [_e.x, _e.y, _e.z] as [number, number, number],
          mass: Math.max(0.05, c.mass),
          ball: c.ball,
        }
      })
    if (colliders.length === 0) continue

    out.push({
      key: part.nodeId,
      position,
      rotation,
      linearVelocity,
      angularVelocity,
      colliders,
      // La pièce est rendue à l'IDENTITÉ dans son corps (le RigidBody porte
      // la pose) ; `mirrored`/`fuselage` conservés (géométrie).
      assembly: {
        id: `debris-${part.nodeId}`,
        name: 'debris',
        parts: [{ ...part, position: [0, 0, 0], rotation: [0, 0, 0] }],
      },
    })
  }
  return out
}

export function CrashDebris({
  aircraft,
  pose,
  impulse,
  lifetime,
}: {
  aircraft: CompiledAircraft
  pose: CrashPose
  impulse: number
  lifetime: number
}) {
  const [gone, setGone] = useState(false)
  const debris = useMemo(() => buildDebris(aircraft, pose, impulse), [aircraft, pose, impulse])

  // Nettoyage après stabilisation (les corps Rapier sont retirés à l'unmount).
  useEffect(() => {
    setGone(false)
    const id = window.setTimeout(() => setGone(true), lifetime * 1000)
    return () => window.clearTimeout(id)
  }, [pose, lifetime])

  if (gone) return null
  return (
    <>
      {debris.map((d) => (
        <RigidBody
          key={d.key}
          position={d.position}
          rotation={d.rotation}
          linearVelocity={d.linearVelocity}
          angularVelocity={d.angularVelocity}
          colliders={false}
          ccd
          linearDamping={0.1}
          angularDamping={0.4}
        >
          {d.colliders.map((c, i) =>
            c.ball ? (
              <BallCollider key={i} args={[c.half[0]]} position={c.position} mass={c.mass} friction={0.6} />
            ) : (
              <CuboidCollider key={i} args={c.half} position={c.position} rotation={c.rotation} mass={c.mass} friction={0.6} />
            ),
          )}
          <Plane assembly={d.assembly} />
        </RigidBody>
      ))}
    </>
  )
}
