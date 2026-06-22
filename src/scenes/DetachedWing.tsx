import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { palette } from './palette'

/**
 * Aile détachée (étape 6) : quand l'avion casse en survitesse, on masque l'aile
 * du fuselage et on lâche ce corps physique indépendant, qui chute en tournoyant
 * avec la vitesse/rotation capturées au moment de la rupture.
 */
export function DetachedWing({
  position,
  rotation,
  linearVelocity,
  angularVelocity,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  linearVelocity: [number, number, number]
  angularVelocity: [number, number, number]
}) {
  return (
    <RigidBody
      position={position}
      rotation={rotation}
      linearVelocity={linearVelocity}
      angularVelocity={angularVelocity}
      colliders={false}
      ccd
    >
      <CuboidCollider args={[3.6, 0.1, 0.75]} position={[0, -0.05, 0.15]} mass={1.5} />
      <mesh position={[0, -0.05, 0.15]} castShadow>
        <boxGeometry args={[7.2, 0.16, 1.4]} />
        <meshStandardMaterial color={palette.planeWing} flatShading />
      </mesh>
    </RigidBody>
  )
}
