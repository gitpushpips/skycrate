import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getPart } from '../core/parts'
import type { EngineKind, Part, WingPart, WingPlanform } from '../core/parts'
import type { PlaneAssembly, PlacedPart } from '../core/assembly'
import type { ControlKey } from '../core/physics/aerodynamics'
import { palette } from './palette'
import { useControlsRef } from './controlsContext'
import { useThrottle } from '../store/throttle'

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

// Caractère de chaque planforme (repère pièce : racine x=0 → +X, corde le long
// de Z avec BA en -Z, sweep = décalage du bout vers l'arrière, thickMul = épaisseur).
interface WingShape {
  span: number
  rootChord: number
  tipChord: number
  sweep: number
  thickMul: number
}
const WING_SHAPES: Record<WingPlanform, WingShape> = {
  straight: { span: 3.4, rootChord: 1.05, tipChord: 0.95, sweep: 0.05, thickMul: 1.4 },
  tapered: { span: 3.6, rootChord: 1.35, tipChord: 0.72, sweep: 0.22, thickMul: 1.0 },
  laminar: { span: 3.8, rootChord: 1.25, tipChord: 0.6, sweep: 0.14, thickMul: 0.78 },
  swept: { span: 4.5, rootChord: 1.6, tipChord: 0.72, sweep: 1.25, thickMul: 0.72 },
  delta: { span: 3.5, rootChord: 2.6, tipChord: 0.22, sweep: 2.0, thickMul: 0.6 },
  biplane: { span: 3.4, rootChord: 1.05, tipChord: 0.95, sweep: 0.05, thickMul: 1.4 },
}

/** Aile « loftée » : extrusion du profil le long de l'envergure, puis effilement +
 *  flèche par déformation des sommets (root z=0 → tip z=1). ⇒ vrai profil d'aile. */
function useWingGeometry(s: WingShape): THREE.BufferGeometry {
  return useMemo(() => {
    const shape = new THREE.Shape(AIRFOIL.map(([x, y]) => new THREE.Vector2(x, y)))
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, steps: 1, bevelEnabled: false }).toNonIndexed()
    const pos = geo.attributes.position
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const f = v.z // fraction d'envergure (0 emplanture, 1 bout)
      const chord = s.rootChord + (s.tipChord - s.rootChord) * f
      pos.setXYZ(
        i,
        f * s.span, // envergure → X
        v.y * chord * s.thickMul, // épaisseur → Y (∝ corde)
        (v.x - 0.25) * chord + s.sweep * f, // corde → Z (BA -Z, quart-avant au centre) + flèche
      )
    }
    // Le swap corde↔envergure ci-dessus reflète la géométrie (det −1) ⇒ on inverse
    // l'ordre des sommets de chaque triangle pour rétablir des faces sortantes
    // (sinon l'extrados, culé en backface, disparaît).
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

// Demi-aile : profil loft + aileron/élevon animé au bord de fuite extérieur.
// Le miroir applique scale.x=-1 ; la gouverne suit la clé du côté.
function WingModel({ part, mirrored }: { part: WingPart; mirrored?: boolean }) {
  const s = WING_SHAPES[part.planform]
  const geo = useWingGeometry(s)
  const aileron: ControlKey = mirrored ? 'aileronL' : 'aileronR'
  // Gouverne : bande au bord de fuite, moitié extérieure (~72 % d'envergure).
  const fc = 0.72
  const chordF = s.rootChord + (s.tipChord - s.rootChord) * fc
  const flapChord = (part.planform === 'delta' ? 0.22 : 0.32) * chordF
  const teZ = (1 - 0.25) * chordF + s.sweep * fc // bord de fuite à la station fc
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={palette.planeWing} roughness={0.72} metalness={0.04} />
      </mesh>
      {/* Aileron/élevon : fine surface affleurante au bord de fuite (épaisseur ≈ BF). */}
      <ControlFlap
        controlKey={aileron}
        axis="x"
        hinge={[fc * s.span, 0, teZ - flapChord]}
        size={[0.32 * s.span, 0.035, flapChord]}
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

// Hélice qui tourne autour de l'axe de poussée (Z) selon le régime moteur courant
// (jauge hangar ou throttle en vol). `bladeLen`/`blades`/`width` = identité visuelle.
function SpinningProp({
  z,
  blades,
  bladeLen,
  width = 0.13,
}: {
  z: number
  blades: number
  bladeLen: number
  width?: number
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    const level = useThrottle.getState().level
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
function JetExhaust({ z, r, flame: mode }: { z: number; r: number; flame?: 'pc' | 'always' }) {
  const glow = useRef<THREE.Mesh>(null)
  const flame = useRef<THREE.Mesh>(null)
  const flameMat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((state) => {
    const { level, boost } = useThrottle.getState()
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

// Identité visuelle par TYPE de moteur (nez -Z, échappement +Z).
function EngineModel({ kind }: { kind: EngineKind }) {
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
          <SpinningProp z={-0.4} blades={2} bladeLen={2.1} width={0.14} />
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
          <SpinningProp z={-0.55} blades={2} bladeLen={2.0} width={0.11} />
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
          <SpinningProp z={-0.68} blades={4} bladeLen={1.7} width={0.1} />
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
          <SpinningProp z={-0.58} blades={20} bladeLen={r * 1.66} width={0.05} />
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
          <JetExhaust z={1.2} r={r * 0.62} flame="pc" />
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
          <JetExhaust z={1.05} r={r} flame="always" />
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
      return <WingModel part={part} mirrored={mirrored} />
    case 'stabilizer':
      return part.id === 'fin.mk1' ? <VerticalFinModel /> : <HorizontalStabModel />
    case 'engine':
      return <EngineModel kind={part.kind} />
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
