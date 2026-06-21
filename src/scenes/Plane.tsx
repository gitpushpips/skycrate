import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getPart } from '../core/parts'
import type { Part } from '../core/parts'
import type { PlaneAssembly, PlacedPart } from '../core/assembly'
import type { ControlKey } from '../core/physics/aerodynamics'
import { palette } from './palette'
import { useControlsRef } from './controlsContext'

/**
 * Rendu low-poly procédural de l'avion. Repère local : nez = -Z, haut = +Y.
 * Les gouvernes (ailerons / élévateur / gouvernail) sont des sous-groupes qui
 * pivotent à leur charnière selon la déflexion courante (ControlsContext),
 * synchronisées avec la physique de PlaneRig.
 */

/** Surface mobile : pivote autour de `axis` à la charnière `hinge` selon la gouverne. */
function ControlFlap({
  controlKey,
  axis,
  hinge,
  sign = 1,
  size,
}: {
  controlKey: ControlKey
  axis: 'x' | 'y'
  hinge: [number, number, number]
  sign?: number
  size: [number, number, number]
}) {
  const ref = useRef<THREE.Group>(null)
  const controls = useControlsRef()
  useFrame(() => {
    if (!ref.current) return
    const d = controls ? controls.current[controlKey] * sign : 0
    if (axis === 'x') ref.current.rotation.x = d
    else ref.current.rotation.y = d
  })
  return (
    <group ref={ref} position={hinge}>
      {/* La gouverne s'étend vers l'arrière (+Z) depuis la charnière. */}
      <mesh position={[0, 0, size[2] / 2]} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={palette.planeWing} flatShading />
      </mesh>
    </group>
  )
}

function FuselageModel() {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.95, 4.0]} />
        <meshStandardMaterial color={palette.planeBody} flatShading />
      </mesh>
      <mesh position={[0, 0.05, 2.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.52, 1.1, 8]} />
        <meshStandardMaterial color={palette.planeBody} flatShading />
      </mesh>
      <mesh position={[0, 0.56, -0.5]} castShadow>
        <boxGeometry args={[0.62, 0.42, 1.2]} />
        <meshStandardMaterial color={palette.planeGlass} flatShading metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  )
}

function WingModel() {
  return (
    <group>
      {/* Caisson d'aile fixe (partie avant) */}
      <mesh position={[0, 0, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[7.2, 0.16, 1.0]} />
        <meshStandardMaterial color={palette.planeWing} flatShading />
      </mesh>
      {/* Ailerons (bord de fuite, extérieurs) */}
      <ControlFlap controlKey="aileronL" axis="x" hinge={[-2.2, 0, 0.45]} size={[1.9, 0.12, 0.45]} />
      <ControlFlap controlKey="aileronR" axis="x" hinge={[2.2, 0, 0.45]} size={[1.9, 0.12, 0.45]} />
    </group>
  )
}

function StabilizerModel() {
  return (
    <group>
      {/* Plan horizontal fixe + élévateur */}
      <mesh position={[0, 0, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.13, 0.6]} />
        <meshStandardMaterial color={palette.planeWing} flatShading />
      </mesh>
      <ControlFlap controlKey="elevator" axis="x" hinge={[0, 0, 0.15]} size={[2.6, 0.11, 0.4]} />

      {/* Dérive fixe + gouvernail */}
      <mesh position={[0, 0.55, -0.05]} castShadow>
        <boxGeometry args={[0.14, 1.05, 0.6]} />
        <meshStandardMaterial color={palette.planeTail} flatShading />
      </mesh>
      <ControlFlap controlKey="rudder" axis="y" hinge={[0, 0.55, 0.25]} sign={-1} size={[0.13, 1.0, 0.4]} />
    </group>
  )
}

function EngineModel() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.56, 0.7, 12]} />
        <meshStandardMaterial color={palette.planeCowl} flatShading metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.2, 8]} />
        <meshStandardMaterial color={palette.planeHub} flatShading />
      </mesh>
      <mesh position={[0, 0, -0.52]} rotation={[0, 0, 0.25]} castShadow>
        <boxGeometry args={[0.13, 2.2, 0.05]} />
        <meshStandardMaterial color={palette.planeProp} flatShading />
      </mesh>
    </group>
  )
}

function Wheel({ position, radius }: { position: [number, number, number]; radius: number }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[radius, radius, 0.2, 14]} />
      <meshStandardMaterial color={palette.planeTire} flatShading />
    </mesh>
  )
}

function Strut({ position, height }: { position: [number, number, number]; height: number }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[0.1, height, 0.1]} />
      <meshStandardMaterial color={palette.planeStrut} flatShading metalness={0.4} roughness={0.5} />
    </mesh>
  )
}

function LandingGearModel() {
  return (
    <group>
      <Strut position={[1.05, -0.72, -0.3]} height={0.55} />
      <Strut position={[-1.05, -0.72, -0.3]} height={0.55} />
      <Wheel position={[1.05, -0.95, -0.3]} radius={0.34} />
      <Wheel position={[-1.05, -0.95, -0.3]} radius={0.34} />
      <Strut position={[0, -0.82, 2.0]} height={0.55} />
      <Wheel position={[0, -1.09, 2.0]} radius={0.2} />
    </group>
  )
}

function PartModel({ part }: { part: Part }) {
  switch (part.category) {
    case 'fuselage':
      return <FuselageModel />
    case 'wing':
      return <WingModel />
    case 'stabilizer':
      return <StabilizerModel />
    case 'engine':
      return <EngineModel />
    case 'landingGear':
      return <LandingGearModel />
  }
}

function PlacedPartModel({ placed }: { placed: PlacedPart }) {
  const part = getPart(placed.partId)
  return (
    <group position={placed.position} rotation={placed.rotation} scale={placed.scale}>
      <PartModel part={part} />
    </group>
  )
}

export function Plane({
  assembly,
  position = [0, 0, 0],
}: {
  assembly: PlaneAssembly
  position?: [number, number, number]
}) {
  return (
    <group position={position}>
      {assembly.parts.map((placed, i) => (
        <PlacedPartModel key={`${placed.partId}#${i}`} placed={placed} />
      ))}
    </group>
  )
}
