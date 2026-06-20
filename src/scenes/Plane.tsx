import { getPart } from '../core/parts'
import type { Part } from '../core/parts'
import type { PlaneAssembly, PlacedPart } from '../core/assembly'
import { palette } from './palette'

/**
 * Rendu low-poly procédural de l'avion à partir de sa description d'assemblage.
 * Repère local : nez = -Z, haut = +Y, aile droite = +X (cf. core/assembly).
 *
 * La géométrie (dimensions) est ici un choix VISUEL ; les stats de jeu viennent
 * du catalogue (core/parts). Tout est `flatShading` pour le rendu facetté.
 */

function FuselageModel() {
  return (
    <group>
      {/* Corps */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.95, 4.0]} />
        <meshStandardMaterial color={palette.planeBody} flatShading />
      </mesh>
      {/* Queue effilée (vers +Z) */}
      <mesh position={[0, 0.05, 2.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.52, 1.1, 8]} />
        <meshStandardMaterial color={palette.planeBody} flatShading />
      </mesh>
      {/* Verrière */}
      <mesh position={[0, 0.56, -0.5]} castShadow>
        <boxGeometry args={[0.62, 0.42, 1.2]} />
        <meshStandardMaterial color={palette.planeGlass} flatShading metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  )
}

function WingModel() {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[7.2, 0.16, 1.5]} />
      <meshStandardMaterial color={palette.planeWing} flatShading />
    </mesh>
  )
}

function StabilizerModel() {
  return (
    <group>
      {/* Plan horizontal */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.13, 0.9]} />
        <meshStandardMaterial color={palette.planeWing} flatShading />
      </mesh>
      {/* Dérive verticale */}
      <mesh position={[0, 0.55, 0.12]} castShadow>
        <boxGeometry args={[0.14, 1.05, 0.9]} />
        <meshStandardMaterial color={palette.planeTail} flatShading />
      </mesh>
    </group>
  )
}

function EngineModel() {
  return (
    <group>
      {/* Capot moteur (axe le long de Z) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.56, 0.7, 12]} />
        <meshStandardMaterial color={palette.planeCowl} flatShading metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Moyeu */}
      <mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.2, 8]} />
        <meshStandardMaterial color={palette.planeHub} flatShading />
      </mesh>
      {/* Hélice bipale */}
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
      {/* Train principal */}
      <Strut position={[1.05, -0.72, -0.3]} height={0.55} />
      <Strut position={[-1.05, -0.72, -0.3]} height={0.55} />
      <Wheel position={[1.05, -0.95, -0.3]} radius={0.34} />
      <Wheel position={[-1.05, -0.95, -0.3]} radius={0.34} />
      {/* Roulette de queue */}
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
