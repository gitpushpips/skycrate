import { useMemo } from 'react'
import { palette } from './palette'
import type { Landmark } from '../core/world/landmarks'

/**
 * Rendu des repères de paysage : géométrie procédurale maison (aucun asset),
 * silhouettes lisibles de loin — c'est leur seule raison d'être. Volumes
 * simples et `flatShading`, cohérents avec la D.A. low-poly du reste.
 */
const C_ROCK = palette.terrainRock
const C_METAL = '#9aa1a8'
const C_RUST = '#7d4a33'
const C_WOOD = '#6b4a2f'
const C_STONE = '#9c9689'

/** Mât à haubans sur le point culminant : le repère visible de plus loin. */
function PeakMast({ scale }: { scale: number }) {
  const guys = useMemo(() => [0, 1, 2].map((i) => (i / 3) * Math.PI * 2), [])
  return (
    <group scale={scale}>
      {/* Socle béton — PROLONGÉ sous terre : le sol n'est jamais parfaitement
          plat, un socle affleurant flotterait du côté bas. */}
      <mesh position={[0, -1.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.2, 3.4, 5, 6]} />
        <meshStandardMaterial color="#b9b4a8" flatShading />
      </mesh>
      {/* Fût en treillis, effilé, bandes rouge/blanc */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 2 + i * 5, 0]} castShadow>
          <cylinderGeometry args={[1.05 - i * 0.14, 1.25 - i * 0.14, 5, 4]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#e6e2d8' : '#c0392b'} flatShading />
        </mesh>
      ))}
      {/* Haubans */}
      {guys.map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * 4, 8, Math.sin(a) * 4]}
          rotation={[Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45]}
          castShadow
        >
          <cylinderGeometry args={[0.09, 0.09, 17, 4]} />
          <meshStandardMaterial color={C_METAL} />
        </mesh>
      ))}
      {/* Antennes + feu de balisage */}
      <mesh position={[0, 28.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 4, 4]} />
        <meshStandardMaterial color={C_METAL} />
      </mesh>
      <mesh position={[0, 31, 0]}>
        <sphereGeometry args={[0.7, 8, 6]} />
        <meshStandardMaterial color="#d8423a" emissive="#ff3b2f" emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

/** Arche rocheuse : deux piliers + un tablier en voussoirs. */
function Arch({ scale }: { scale: number }) {
  const span = 13
  const voussoirs = useMemo(() => {
    const out: { p: [number, number, number]; r: number; s: [number, number, number] }[] = []
    const n = 7
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.12 + (i / (n - 1)) * 0.76) // demi-cercle partiel
      out.push({
        p: [Math.cos(a) * (span / 2), 9 + Math.sin(a) * 5.5, 0],
        r: -a + Math.PI / 2,
        s: [4.2, 2.6, 5],
      })
    }
    return out
  }, [])
  return (
    <group scale={scale}>
      {/* Piliers ENFONCÉS profond (18 m pour 9 m visibles) : l'arche se pose
          sur du relief, les deux pieds ne sont jamais à la même altitude. */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * span) / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3.1, 5.2, 18, 6]} />
          <meshStandardMaterial color={C_ROCK} flatShading />
        </mesh>
      ))}
      {voussoirs.map((v, i) => (
        <mesh key={i} position={v.p} rotation={[0, 0, v.r]} castShadow>
          <boxGeometry args={v.s} />
          <meshStandardMaterial color={C_ROCK} flatShading />
        </mesh>
      ))}
      {/* Éboulis au pied */}
      {[-1, 1].map((s) => (
        <mesh key={`r${s}`} position={[s * (span / 2 + 4), 0.7, s * 2.5]} castShadow>
          <icosahedronGeometry args={[2, 0]} />
          <meshStandardMaterial color={C_ROCK} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** Épave échouée : coque brisée en deux, à demi ensablée, mât couché. */
function Wreck({ scale }: { scale: number }) {
  return (
    <group scale={scale}>
      {/* Coque avant, penchée */}
      <mesh position={[0, 1.1, -4]} rotation={[0.12, 0, 0.34]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 3, 11]} />
        <meshStandardMaterial color={C_RUST} flatShading />
      </mesh>
      {/* Étrave */}
      <mesh position={[0.6, 2.2, -10.5]} rotation={[0.3, 0, 0.34]} castShadow>
        <coneGeometry args={[2.1, 5, 4]} />
        <meshStandardMaterial color={C_RUST} flatShading />
      </mesh>
      {/* Coque arrière, séparée et plus enfoncée */}
      <mesh position={[1.6, 0.5, 5.5]} rotation={[-0.1, 0.25, 0.5]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 2.6, 8]} />
        <meshStandardMaterial color={C_RUST} flatShading />
      </mesh>
      {/* Membrures apparentes dans la brèche */}
      {[-1.2, 0, 1.2].map((o, i) => (
        <mesh key={i} position={[o * 1.2, 1.4, 1]} rotation={[0, 0, 0.2]} castShadow>
          <boxGeometry args={[0.3, 3.2, 0.3]} />
          <meshStandardMaterial color={C_WOOD} flatShading />
        </mesh>
      ))}
      {/* Mât couché */}
      <mesh position={[-3.5, 1, -2]} rotation={[0, 0.5, 1.35]} castShadow>
        <cylinderGeometry args={[0.28, 0.38, 13, 5]} />
        <meshStandardMaterial color={C_WOOD} flatShading />
      </mesh>
    </group>
  )
}

/** Cercle de pierres levées, avec une pierre tombée. */
function Stones({ scale }: { scale: number }) {
  const ring = useMemo(() => {
    const n = 8
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2
      return { a, x: Math.cos(a) * 7, z: Math.sin(a) * 7, h: 3.2 + ((i * 37) % 11) / 7 }
    })
  }, [])
  return (
    <group scale={scale}>
      {ring.map((s, i) =>
        i === 5 ? (
          // La pierre tombée : casse la régularité, rend la scène crédible.
          <mesh key={i} position={[s.x, 0.45, s.z]} rotation={[Math.PI / 2.2, s.a, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, s.h, 0.8]} />
            <meshStandardMaterial color={C_STONE} flatShading />
          </mesh>
        ) : (
          // Chaque pierre descend 1,2 m sous le sol (assise sur terrain vallonné).
          <mesh key={i} position={[s.x, (s.h + 1.2) / 2 - 1.2, s.z]} rotation={[0, -s.a, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, s.h + 1.2, 0.8]} />
            <meshStandardMaterial color={C_STONE} flatShading />
          </mesh>
        ),
      )}
      {/* Pierre d'autel au centre */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 1.6, 1.8]} />
        <meshStandardMaterial color={C_STONE} flatShading />
      </mesh>
    </group>
  )
}

export function Landmarks({ landmarks }: { landmarks: Landmark[] }) {
  return (
    <group>
      {landmarks.map((l, i) => (
        <group key={i} position={l.position} rotation={[0, l.rotY, 0]}>
          {l.kind === 'peakMast' && <PeakMast scale={l.scale} />}
          {l.kind === 'arch' && <Arch scale={l.scale} />}
          {l.kind === 'wreck' && <Wreck scale={l.scale} />}
          {l.kind === 'stones' && <Stones scale={l.scale} />}
        </group>
      ))}
    </group>
  )
}
