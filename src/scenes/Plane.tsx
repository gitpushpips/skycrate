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

// Demi-aile : racine en x=0, s'étend vers +X (le miroir applique scale.x=-1).
// L'aileron suit la clé de gouverne du côté (gauche si la pièce est miroir).
function WingModel({ mirrored }: { mirrored?: boolean }) {
  return (
    <group>
      <mesh position={[1.7, 0, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.16, 1.0]} />
        <meshStandardMaterial color={palette.planeWing} flatShading />
      </mesh>
      {/* Élevon (bord de fuite, moitié extérieure) */}
      <ControlFlap
        controlKey={mirrored ? 'aileronL' : 'aileronR'}
        axis="x"
        hinge={[2.55, 0, 0.45]}
        size={[1.7, 0.12, 0.45]}
      />
    </group>
  )
}

// Demi-stabilisateur horizontal : racine x=0 → +X, gouverne = profondeur.
function HorizontalStabModel() {
  return (
    <group>
      <mesh position={[0.7, 0, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.13, 0.6]} />
        <meshStandardMaterial color={palette.planeWing} flatShading />
      </mesh>
      <ControlFlap controlKey="elevator" axis="x" hinge={[0.7, 0, 0.15]} size={[1.3, 0.11, 0.4]} />
    </group>
  )
}

// Dérive verticale : racine y=0 → +Y, gouverne = gouvernail (lacet).
function VerticalFinModel() {
  return (
    <group>
      <mesh position={[0, 0.52, -0.05]} castShadow>
        <boxGeometry args={[0.14, 1.05, 0.6]} />
        <meshStandardMaterial color={palette.planeTail} flatShading />
      </mesh>
      <ControlFlap controlKey="rudder" axis="y" hinge={[0, 0.52, 0.25]} sign={-1} size={[0.13, 1.0, 0.4]} />
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

function PartModel({ part, mirrored }: { part: Part; mirrored?: boolean }) {
  switch (part.category) {
    case 'fuselage':
      return <FuselageModel />
    case 'wing':
      return <WingModel mirrored={mirrored} />
    case 'stabilizer':
      return part.id === 'fin.mk1' ? <VerticalFinModel /> : <HorizontalStabModel />
    case 'engine':
      return <EngineModel />
    case 'landingGear':
      return <LandingGearModel />
  }
}

function PlacedPartModel({ placed }: { placed: PlacedPart }) {
  const part = getPart(placed.partId)
  // Miroir : reflet par X (scale.x = -1) ⇒ la pièce « gauche » d'une paire.
  const scale: [number, number, number] = placed.mirrored ? [-1, 1, 1] : [1, 1, 1]
  return (
    <group position={placed.position} rotation={placed.rotation} scale={scale}>
      <PartModel part={part} mirrored={placed.mirrored} />
    </group>
  )
}

export function Plane({
  assembly,
  position = [0, 0, 0],
  hideWings = false,
}: {
  assembly: PlaneAssembly
  position?: [number, number, number]
  hideWings?: boolean
}) {
  return (
    <group position={position}>
      {assembly.parts.map((placed, i) => {
        if (hideWings && getPart(placed.partId).category === 'wing') return null
        return <PlacedPartModel key={`${placed.partId}#${i}`} placed={placed} />
      })}
    </group>
  )
}
