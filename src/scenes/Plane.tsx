import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getPart } from '../core/parts'
import type {
  CabinPart,
  EngineKind,
  FuselageSize,
  Part,
  WingPart,
  WingPlanform,
} from '../core/parts'
import type { PlaneAssembly, PlacedPart } from '../core/assembly'
import type { ControlKey } from '../core/physics/aerodynamics'
import { palette } from './palette'
import { useControlsRef } from './controlsContext'
import { useThrottle } from '../store/throttle'
import { useHud } from '../store/hud'

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

// Dimensions par taille de fuselage (corps box + cône de queue +Z, nez plat -Z
// pour le moteur). Le gros porteur reçoit une rampe cargo arrière.
const FUSELAGE_DIMS: Record<FuselageSize, { w: number; h: number; l: number }> = {
  small: { w: 0.9, h: 0.95, l: 4.0 },
  medium: { w: 1.1, h: 1.12, l: 4.6 },
  large: { w: 1.56, h: 1.44, l: 5.2 },
}

function FuselageModel({ size }: { size: FuselageSize }) {
  const d = FUSELAGE_DIMS[size]
  const half = d.l / 2
  const large = size === 'large'
  return (
    <group>
      {/* Corps. */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[d.w, d.h, d.l]} />
        <meshStandardMaterial color={palette.planeBody} flatShading />
      </mesh>
      {/* Cône de queue (+Z). */}
      <mesh position={[0, d.h * 0.06, half + (large ? 0.5 : 0.4)]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[d.w * 0.55, large ? 1.0 : 1.1, large ? 10 : 8]} />
        <meshStandardMaterial color={palette.planeBody} flatShading />
      </mesh>
      {/* Quille dorsale (ligne de panneau, sur le dessus). */}
      <mesh position={[0, d.h / 2, 0]} castShadow>
        <boxGeometry args={[0.06, 0.05, d.l * 0.86]} />
        <meshStandardMaterial color={palette.planeTail} flatShading />
      </mesh>
      {/* Verrière intégrée (petit/moyen) ou rampe cargo arrière (gros). */}
      {!large ? (
        <mesh position={[0, d.h * 0.58, -d.l * 0.12]} castShadow>
          <boxGeometry args={[d.w * 0.66, d.h * 0.44, d.l * 0.28]} />
          <meshStandardMaterial color={palette.planeGlass} flatShading metalness={0.15} roughness={0.3} />
        </mesh>
      ) : (
        <mesh position={[0, -d.h * 0.18, half - 0.1]} rotation={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[d.w * 0.8, d.h * 0.55, 0.9]} />
          <meshStandardMaterial color={palette.planeTail} flatShading metalness={0.2} roughness={0.6} />
        </mesh>
      )}
    </group>
  )
}

// Cockpit vitré : coaming + verrière bombée + arceaux.
function CockpitCabin() {
  return (
    <group>
      <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.74, 0.3, 1.42]} />
        <meshStandardMaterial color={palette.planeBody} flatShading />
      </mesh>
      <mesh position={[0, 0.08, -0.05]} scale={[0.49, 0.46, 0.82]} castShadow>
        <sphereGeometry args={[0.72, 16, 12]} />
        <meshStandardMaterial color={palette.planeGlass} metalness={0.25} roughness={0.12} transparent opacity={0.74} />
      </mesh>
      {[-0.18, 0.28].map((z) => (
        <mesh key={z} position={[0, 0.06, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.35 - Math.abs(z) * 0.12, 0.022, 6, 18]} />
          <meshStandardMaterial color={palette.planeBody} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// Soute cargo : caisson trapu + porte latérale + nervures de toit.
function CargoCabin() {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.06, 0.96, 1.96]} />
        <meshStandardMaterial color="#7c7f73" flatShading />
      </mesh>
      {/* Porte cargo latérale (renfoncée). */}
      <mesh position={[0.54, -0.06, 0.25]} castShadow>
        <boxGeometry args={[0.05, 0.62, 0.92]} />
        <meshStandardMaterial color="#4b4e46" flatShading />
      </mesh>
      {/* Nervures de toit. */}
      {[-0.55, 0, 0.55].map((z) => (
        <mesh key={z} position={[0, 0.49, z]} castShadow>
          <boxGeometry args={[1.0, 0.05, 0.07]} />
          <meshStandardMaterial color="#5d6056" flatShading />
        </mesh>
      ))}
    </group>
  )
}

// Cabine passagers : tube clair + rangées de hublots + porte + bande de livrée.
function PassengerCabin() {
  const windows = [-1.05, -0.65, -0.25, 0.15, 0.55, 0.95]
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.55, 2.95, 20]} />
        <meshStandardMaterial color="#e2e6ea" flatShading metalness={0.1} roughness={0.5} />
      </mesh>
      {/* Hublots sur les deux flancs. */}
      {windows.map((z) =>
        ([-1, 1] as const).map((s) => (
          <mesh key={`${z}.${s}`} position={[s * 0.53, 0.06, z]} castShadow>
            <boxGeometry args={[0.04, 0.1, 0.1]} />
            <meshStandardMaterial color="#1d2733" flatShading />
          </mesh>
        )),
      )}
      {/* Porte. */}
      <mesh position={[0.53, -0.04, -1.25]} castShadow>
        <boxGeometry args={[0.04, 0.5, 0.32]} />
        <meshStandardMaterial color="#c2c7cd" flatShading />
      </mesh>
    </group>
  )
}

function CabinModel({ part }: { part: CabinPart }) {
  switch (part.kind) {
    case 'cockpit':
      return <CockpitCabin />
    case 'cargo':
      return <CargoCabin />
    case 'passenger':
      return <PassengerCabin />
  }
}

// Profil d'aile cambré (corde 0 = bord d'attaque → 1 = bord de fuite ; y =
// épaisseur en fraction de corde). Boucle fermée BA → extrados → BF → intrados.
const AIRFOIL: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.0],
  [0.025, 0.045],
  [0.08, 0.07],
  [0.18, 0.082],
  [0.3, 0.08],
  [0.5, 0.063],
  [0.7, 0.041],
  [0.88, 0.02],
  [1.0, 0.004],
  [1.0, -0.004],
  [0.88, -0.012],
  [0.7, -0.02],
  [0.5, -0.026],
  [0.3, -0.026],
  [0.18, -0.022],
  [0.08, -0.014],
  [0.025, -0.006],
]

// Caractère de chaque planforme, calé sur de vrais avions (silhouettes maison).
// Repère pièce : racine x=0 → +X, corde le long de Z (BA en -Z), sweep = décalage
// du bout vers l'arrière, dihedral = dièdre (rad), tipRound = arrondi de saumon.
interface WingShape {
  span: number
  rootChord: number
  tipChord: number
  sweep: number
  thickMul: number
  dihedral: number
  tipRound: number // 0 = bout droit/pointu (delta) … 1 = saumon arrondi (GA/warbird)
}
const WING_SHAPES: Record<WingPlanform, WingShape> = {
  // Biplan toile & bois (WWI) : corde épaisse quasi constante, léger dièdre, bout arrondi.
  straight: { span: 3.4, rootChord: 1.12, tipChord: 0.98, sweep: 0.04, thickMul: 1.45, dihedral: 0.03, tipRound: 0.85 },
  // GA brousse (Cessna) : effilée, bon dièdre, saumon bien arrondi.
  tapered: { span: 3.8, rootChord: 1.34, tipChord: 0.7, sweep: 0.16, thickMul: 0.95, dihedral: 0.075, tipRound: 1.0 },
  // Warbird laminaire (P-51) : fine, effilée, saumons arrondis, peu de flèche.
  laminar: { span: 3.95, rootChord: 1.3, tipChord: 0.52, sweep: 0.18, thickMul: 0.7, dihedral: 0.06, tipRound: 1.0 },
  // Jet de ligne (737) : flèche marquée, effilée, fin saumon (winglet ajouté).
  swept: { span: 4.7, rootChord: 1.62, tipChord: 0.56, sweep: 1.4, thickMul: 0.68, dihedral: 0.085, tipRound: 0.25 },
  // Chasseur delta : grande corde de racine → bout pointu, forte flèche, très fine.
  delta: { span: 3.6, rootChord: 2.75, tipChord: 0.14, sweep: 2.2, thickMul: 0.52, dihedral: -0.015, tipRound: 0 },
  biplane: { span: 3.4, rootChord: 1.12, tipChord: 0.98, sweep: 0.04, thickMul: 1.45, dihedral: 0.03, tipRound: 0.85 },
}

/** Corde locale (effilement linéaire + arrondi elliptique du saumon). */
function chordAt(s: WingShape, f: number): number {
  const base = s.rootChord + (s.tipChord - s.rootChord) * f
  if (s.tipRound <= 0) return base
  const start = 0.8
  if (f <= start) return base
  const u = (f - start) / (1 - start)
  const round = Math.sqrt(Math.max(0, 1 - u * u))
  return base * (1 - s.tipRound + s.tipRound * round)
}
const dihedralAt = (s: WingShape, f: number) => Math.tan(s.dihedral) * f * s.span

/** Aile « loftée » : profil extrudé puis sculpté le long de l'envergure (corde,
 *  flèche, dièdre, saumon) ⇒ planforme fidèle avec un vrai volume de profil. */
function useWingGeometry(s: WingShape): THREE.BufferGeometry {
  return useMemo(() => {
    const shape = new THREE.Shape(AIRFOIL.map(([x, y]) => new THREE.Vector2(x, y)))
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, steps: 14, bevelEnabled: false }).toNonIndexed()
    const pos = geo.attributes.position
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const f = v.z // fraction d'envergure (0 emplanture, 1 bout)
      const chord = chordAt(s, f)
      pos.setXYZ(
        i,
        f * s.span, // envergure → X
        v.y * chord * s.thickMul + dihedralAt(s, f), // épaisseur (∝ corde) + dièdre
        (v.x - 0.25) * chord + s.sweep * f, // corde → Z (BA -Z) + flèche
      )
    }
    // Le swap corde↔envergure reflète la géométrie (det −1) ⇒ on réinverse le
    // winding pour des faces sortantes (sinon l'extrados disparaît en backface).
    const a = pos.array as Float32Array
    for (let i = 0; i < a.length; i += 9) {
      for (let k = 0; k < 3; k++) {
        const t = a[i + 3 + k]
        a[i + 3 + k] = a[i + 6 + k]
        a[i + 6 + k] = t
      }
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    return geo
  }, [s])
}

// Feu de navigation au saumon : vert (tribord/droite) · rouge (bâbord/gauche=miroir).
function WingNavLight({ s, mirrored }: { s: WingShape; mirrored?: boolean }) {
  const c = mirrored ? '#ef3b3b' : '#3be25a'
  return (
    <mesh position={[s.span + 0.02, dihedralAt(s, 1), s.sweep + 0.18 * chordAt(s, 0.98)]}>
      <sphereGeometry args={[0.055, 8, 8]} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.9} toneMapped={false} />
    </mesh>
  )
}

// Nervures de l'aile entoilée (look toile & bois) : fines arêtes chordwise.
function WingRibs({ s }: { s: WingShape }) {
  const ribs = 6
  return (
    <>
      {Array.from({ length: ribs }).map((_, i) => {
        const f = (i + 0.55) / ribs
        const chord = chordAt(s, f)
        const y = dihedralAt(s, f) + chord * 0.078 * s.thickMul
        return (
          <mesh key={i} position={[f * s.span, y, s.sweep * f + 0.22 * chord]} castShadow>
            <boxGeometry args={[0.028, 0.022, chord * 0.82]} />
            <meshStandardMaterial color={palette.planeWing} roughness={0.85} />
          </mesh>
        )
      })}
    </>
  )
}

// Winglet de jet de ligne : ailette verticale au saumon, cantée vers l'extérieur.
function Winglet({ s }: { s: WingShape }) {
  const tipChord = chordAt(s, 0.92)
  return (
    <mesh
      position={[s.span - 0.02, dihedralAt(s, 1) + 0.22, s.sweep + 0.12 * tipChord]}
      rotation={[0, 0, -0.32]}
      castShadow
    >
      <boxGeometry args={[0.05, 0.5, tipChord * 0.62]} />
      <meshStandardMaterial color={palette.planeWing} roughness={0.5} metalness={0.12} />
    </mesh>
  )
}

// Demi-aile : profil loft fidèle + aileron/élevon animé + détails par planforme.
// Le miroir applique scale.x=-1 ; la gouverne suit la clé du côté.
function WingModel({ part, mirrored }: { part: WingPart; mirrored?: boolean }) {
  const s = WING_SHAPES[part.planform]
  const geo = useWingGeometry(s)
  const aileron: ControlKey = mirrored ? 'aileronL' : 'aileronR'
  const ribbed = part.planform === 'straight' || part.planform === 'biplane'
  const laminar = part.planform === 'laminar'
  // Gouverne : bande au bord de fuite, ~70 % d'envergure (suit dièdre/flèche).
  const fc = 0.7
  const chordF = chordAt(s, fc)
  const flapChord = (part.planform === 'delta' ? 0.22 : 0.3) * chordF
  const teZ = (1 - 0.25) * chordF + s.sweep * fc
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial
          color={palette.planeWing}
          roughness={laminar ? 0.4 : 0.72}
          metalness={laminar ? 0.28 : 0.04}
        />
      </mesh>
      <ControlFlap
        controlKey={aileron}
        axis="x"
        hinge={[fc * s.span, dihedralAt(s, fc), teZ - flapChord]}
        size={[0.3 * s.span, 0.035, flapChord]}
      />
      {ribbed && <WingRibs s={s} />}
      {part.planform === 'swept' && <Winglet s={s} />}
      <WingNavLight s={s} mirrored={mirrored} />
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

// Hélice qui tourne autour de l'axe de poussée (Z) selon le régime moteur courant
// (jauge hangar ou throttle en vol). `bladeLen`/`blades`/`width` = identité visuelle.
/** Régime réel du moteur `nodeId` (S2) — repli sur le régime global (hangar). */
function engineActual(nodeId?: string): { level: number; boost: boolean } {
  const s = useThrottle.getState()
  return (nodeId && s.actual[nodeId]) || { level: s.level, boost: s.boost }
}

function SpinningProp({
  z,
  blades,
  bladeLen,
  width = 0.13,
  nodeId,
}: {
  z: number
  blades: number
  bladeLen: number
  width?: number
  nodeId?: string
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    const { level } = engineActual(nodeId)
    ref.current.rotation.z += dt * level * 72 // immobile au repos → flou rapide à fond
  })
  const bars = Math.max(1, Math.round(blades / 2))
  return (
    <group ref={ref} position={[0, 0, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 0.22, 10]} />
        <meshStandardMaterial color={palette.planeHub} flatShading metalness={0.4} roughness={0.5} />
      </mesh>
      {Array.from({ length: bars }).map((_, i) => (
        <mesh key={i} rotation={[0, 0, (i / bars) * Math.PI]} castShadow>
          <boxGeometry args={[width, bladeLen, 0.05]} />
          <meshStandardMaterial color={palette.planeProp} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// Échappement réacteur : lueur qui s'intensifie avec le régime + flamme animée.
// `flame='pc'` → flamme uniquement en postcombustion ; `flame='always'` → flamme
// à haut régime (fusée) ; absent → lueur seule (turbofan).
function JetExhaust({
  z,
  r,
  flame: mode,
  nodeId,
}: {
  z: number
  r: number
  flame?: 'pc' | 'always'
  nodeId?: string
}) {
  const glow = useRef<THREE.Mesh>(null)
  const flame = useRef<THREE.Mesh>(null)
  const flameMat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((state) => {
    const { level, boost } = engineActual(nodeId)
    const t = state.clock.elapsedTime
    const flick = 0.85 + Math.sin(t * 45) * 0.1 + Math.sin(t * 17) * 0.05
    if (glow.current) {
      const on = level > 0.03 // pas de lueur à l'arrêt
      glow.current.visible = on
      if (on) {
        const s = (0.6 + level * 0.7) * flick
        glow.current.scale.set(s, s, s)
        ;(glow.current.material as THREE.MeshBasicMaterial).opacity = level * 0.5
      }
    }
    if (flame.current && flameMat.current) {
      const on = mode === 'pc' ? boost && level > 0.05 : mode === 'always' ? level > 0.2 : false
      flame.current.visible = on
      if (on) {
        // La hauteur du cône est son axe local Y (→ Z après rotation) ⇒ on
        // allonge Y ; X/Z = rayon de la flamme.
        flame.current.scale.set(r * 0.9, (1.6 + level * 2.2) * flick, r * 0.9)
        flameMat.current.opacity = 0.55 + 0.25 * flick
      }
    }
  })
  return (
    <group position={[0, 0, z]}>
      <mesh ref={glow}>
        <sphereGeometry args={[r * 0.5, 12, 12]} />
        <meshBasicMaterial color="#ff7a3a" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {/* Flamme de PC : cône pointant vers l'arrière (+Z), longueur ∝ régime. */}
      <mesh ref={flame} position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <coneGeometry args={[1, 1, 14, 1, true]} />
        <meshBasicMaterial
          ref={flameMat}
          color="#ffb24a"
          transparent
          opacity={0.7}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// Cône-spinner pointant vers l'avant (-Z).
function Spinner({ z, r, len, color }: { z: number; r: number; len: number; color: string }) {
  return (
    <mesh position={[0, 0, z]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <coneGeometry args={[r, len, 12]} />
      <meshStandardMaterial color={color} flatShading metalness={0.5} roughness={0.4} />
    </mesh>
  )
}

// Couronne de cylindres = moteur en étoile (identité du « bois »/radial).
function RadialCylinders({ r }: { r: number }) {
  return (
    <group position={[0, 0, -0.16]}>
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.1, 0.11, 0.36, 6]} />
            <meshStandardMaterial color={palette.planeBrass} flatShading metalness={0.4} roughness={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}

// Identité visuelle par TYPE de moteur (nez -Z, échappement +Z). `nodeId` lie
// l'animation (hélice/flamme) au régime RÉEL de CE moteur (S2).
function EngineModel({ kind, nodeId }: { kind: EngineKind; nodeId?: string }) {
  switch (kind) {
    case 'wood':
    case 'electric': {
      // Moteur en étoile : cowl rond + cylindres radiaux + spinner laiton + bipale bois.
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.54, 0.5, 12]} />
            <meshStandardMaterial color={palette.planeCowl} flatShading metalness={0.3} roughness={0.7} />
          </mesh>
          <RadialCylinders r={0.5} />
          <Spinner z={-0.34} r={0.13} len={0.26} color={palette.planeBrass} />
          <SpinningProp z={-0.4} blades={2} bladeLen={2.1} width={0.14} nodeId={nodeId} />
        </group>
      )
    }
    case 'propeller': {
      // Piston inline : cowl métal effilé + long spinner + bipale métal.
      return (
        <group>
          <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.36, 0.46, 0.8, 14]} />
            <meshStandardMaterial color={palette.planeMetal} flatShading metalness={0.5} roughness={0.45} />
          </mesh>
          <Spinner z={-0.45} r={0.18} len={0.4} color={palette.planeCowl} />
          <SpinningProp z={-0.55} blades={2} bladeLen={2.0} width={0.11} nodeId={nodeId} />
        </group>
      )
    }
    case 'turboprop': {
      // Turboprop : longue nacelle, spinner pointu, quadripale.
      return (
        <group>
          <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.42, 1.2, 16]} />
            <meshStandardMaterial color={palette.planeMetal} flatShading metalness={0.55} roughness={0.4} />
          </mesh>
          <Spinner z={-0.55} r={0.14} len={0.5} color={palette.planeExhaust} />
          <SpinningProp z={-0.68} blades={4} bladeLen={1.7} width={0.1} nodeId={nodeId} />
        </group>
      )
    }
    case 'turbofan': {
      // Turbofan haut taux de dilution : conduit OUVERT (soufflante visible dans
      // l'entrée), lèvre annulaire, cône central d'éjection (plug). Pas de flamme.
      const r = 0.58
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r, r * 0.8, 1.45, 22, 1, true]} />
            <meshStandardMaterial
              color={palette.planeJetBody}
              flatShading
              metalness={0.45}
              roughness={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Lèvre d'entrée = anneau autour de l'axe (torus par défaut, trou sur Z). */}
          <mesh position={[0, 0, -0.72]} castShadow>
            <torusGeometry args={[r * 0.93, 0.09, 12, 26]} />
            <meshStandardMaterial color={palette.planeMetal} flatShading metalness={0.6} roughness={0.35} />
          </mesh>
          {/* Disque sombre = fond moteur (cache l'intérieur du conduit). */}
          <mesh position={[0, 0, -0.48]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r * 0.84, r * 0.84, 0.05, 22]} />
            <meshStandardMaterial color="#15171c" flatShading roughness={0.75} />
          </mesh>
          {/* Soufflante visible dans l'entrée (tourne avec le régime) + spinner. */}
          <SpinningProp z={-0.58} blades={20} bladeLen={r * 1.66} width={0.05} nodeId={nodeId} />
          <Spinner z={-0.68} r={0.15} len={0.34} color={palette.planeMetal} />
          {/* Tuyère froide + cône central (plug). */}
          <mesh position={[0, 0, 0.82]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r * 0.6, r * 0.46, 0.3, 22]} />
            <meshStandardMaterial color={palette.planeExhaust} flatShading metalness={0.55} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0, 1.0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[r * 0.4, 0.5, 18]} />
            <meshStandardMaterial color={palette.planeMetal} flatShading metalness={0.55} roughness={0.45} />
          </mesh>
        </group>
      )
    }
    case 'afterburner': {
      // Turboréacteur militaire avec PC : corps fin et long, lèvre annulaire,
      // anneaux de chambre PC, tuyère convergente à facettes (pétales), flamme.
      const r = 0.4
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r, r * 0.96, 1.7, 18]} />
            <meshStandardMaterial color={palette.planeJetBody} flatShading metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Lèvre d'entrée (anneau autour de l'axe). */}
          <mesh position={[0, 0, -0.84]} castShadow>
            <torusGeometry args={[r * 0.95, 0.05, 8, 20]} />
            <meshStandardMaterial color={palette.planeMetal} flatShading metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Compresseur sombre au fond de l'entrée. */}
          <mesh position={[0, 0, -0.78]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r * 0.82, r * 0.82, 0.05, 16]} />
            <meshStandardMaterial color="#15171c" flatShading roughness={0.7} />
          </mesh>
          {/* Anneaux de chambre PC autour du corps (torus par défaut). */}
          {[0.4, 0.6, 0.8].map((z) => (
            <mesh key={z} position={[0, 0, z]} castShadow>
              <torusGeometry args={[r * 1.0, 0.035, 8, 18]} />
              <meshStandardMaterial color={palette.planeExhaust} flatShading metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
          {/* Tuyère convergente à facettes (look pétales / géométrie variable). */}
          <mesh position={[0, 0, 0.99]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r * 0.55, r * 0.92, 0.36, 11, 1, true]} />
            <meshStandardMaterial
              color={palette.planeMetal}
              flatShading
              metalness={0.7}
              roughness={0.35}
              side={THREE.DoubleSide}
            />
          </mesh>
          <JetExhaust z={1.2} r={r * 0.62} flame="pc" nodeId={nodeId} />
        </group>
      )
    }
    case 'rocket':
    default: {
      // Fusée : corps clair + ogive rouge + ailerons + tuyère évasée + flamme.
      const r = 0.4
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r, r, 1.4, 14]} />
            <meshStandardMaterial color={palette.planeRocket} flatShading metalness={0.2} roughness={0.6} />
          </mesh>
          <Spinner z={-0.85} r={r} len={0.5} color={palette.planeRocketTip} />
          {/* Ailerons. */}
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, 0.55]}
                rotation={[0, 0, a]}
                castShadow
              >
                <boxGeometry args={[0.06, 0.34, 0.5]} />
                <meshStandardMaterial color={palette.planeRocketTip} flatShading />
              </mesh>
            )
          })}
          {/* Tuyère évasée (cône ouvert, +Z). */}
          <mesh position={[0, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r * 1.05, r * 0.5, 0.4, 14, 1, true]} />
            <meshStandardMaterial
              color={palette.planeExhaust}
              flatShading
              metalness={0.5}
              roughness={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          <JetExhaust z={1.05} r={r} flame="always" nodeId={nodeId} />
        </group>
      )
    }
  }
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

// Train : tricycle (2 jambes principales + roulette). Le rétractable se rentre
// dans le ventre quand l'avion est en l'air (altitude HUD), avec des trappes.
function LandingGearModel({ retractable }: { retractable?: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!ref.current || !retractable) return
    const target = useHud.getState().altitude > 5 ? 1 : 0
    t.current += (target - t.current) * Math.min(1, dt * 2.5)
    ref.current.position.y = t.current * 1.18 // remonte les roues dans le ventre
    ref.current.rotation.x = t.current * 0.5 // bascule vers l'arrière
  })
  return (
    <group>
      {/* Trappes de train (rétractable) — restent au ventre. */}
      {retractable &&
        ([1.05, -1.05] as const).map((x) => (
          <mesh key={x} position={[x, -0.46, -0.3]} castShadow>
            <boxGeometry args={[0.42, 0.04, 0.7]} />
            <meshStandardMaterial color={palette.planeBody} flatShading />
          </mesh>
        ))}
      <group ref={ref}>
        <Strut position={[1.05, -0.72, -0.3]} height={0.55} />
        <Strut position={[-1.05, -0.72, -0.3]} height={0.55} />
        <Wheel position={[1.05, -0.95, -0.3]} radius={0.34} />
        <Wheel position={[-1.05, -0.95, -0.3]} radius={0.34} />
        <Strut position={[0, -0.82, 2.0]} height={0.55} />
        <Wheel position={[0, -1.09, 2.0]} radius={0.2} />
      </group>
    </group>
  )
}

function PartModel({
  part,
  mirrored,
  nodeId,
}: {
  part: Part
  mirrored?: boolean
  nodeId?: string
}) {
  switch (part.category) {
    case 'fuselage':
      return <FuselageModel size={part.size} />
    case 'cabin':
      return <CabinModel part={part} />
    case 'wing':
      return <WingModel part={part} mirrored={mirrored} />
    case 'stabilizer':
      return part.id === 'fin.mk1' ? <VerticalFinModel /> : <HorizontalStabModel />
    case 'engine':
      return <EngineModel kind={part.kind} nodeId={nodeId} />
    case 'landingGear':
      return <LandingGearModel retractable={part.retractable} />
  }
}

function PlacedPartModel({ placed }: { placed: PlacedPart }) {
  const part = getPart(placed.partId)
  // Miroir : reflet par X (scale.x = -1) ⇒ la pièce « gauche » d'une paire.
  const scale: [number, number, number] = placed.mirrored ? [-1, 1, 1] : [1, 1, 1]
  return (
    <group position={placed.position} rotation={placed.rotation} scale={scale}>
      <PartModel part={part} mirrored={placed.mirrored} nodeId={placed.nodeId} />
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
