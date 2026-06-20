import { useMemo } from 'react'
import { palette } from './palette'

const RUNWAY_LENGTH = 170
const RUNWAY_WIDTH = 14

/**
 * Sol provisoire : grande étendue d'herbe + une piste orientée nord-sud
 * (alignée sur le soleil = nord) avec marquage axial. Donne une échelle et un
 * repère ; le vrai monde (aéroports, biomes) viendra à un jalon ultérieur.
 */
export function Ground() {
  const dashes = useMemo(() => {
    const n = 9
    const gap = RUNWAY_LENGTH / n
    return Array.from({ length: n }, (_, i) => -RUNWAY_LENGTH / 2 + gap * (i + 0.5))
  }, [])

  return (
    <group>
      {/* Herbe (déborde du fog pour un horizon propre) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color={palette.grass} />
      </mesh>

      {/* Piste */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[RUNWAY_WIDTH, RUNWAY_LENGTH]} />
        <meshStandardMaterial color={palette.runway} roughness={0.95} />
      </mesh>

      {/* Marquage axial */}
      {dashes.map((z, i) => (
        <mesh key={i} position={[0, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 6]} />
          <meshStandardMaterial color={palette.runwayLine} />
        </mesh>
      ))}
    </group>
  )
}
