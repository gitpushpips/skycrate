import { createNoise2D } from 'simplex-noise'
import { mulberry32 } from '../rng'

/**
 * Bruit fractal 2D (fBm) seedé — brique de base du terrain procédural (3+A).
 * Un seed ⇒ un champ de bruit reproductible.
 */
export interface FbmParams {
  /** Nombre d'octaves sommées. */
  octaves: number
  /** Fréquence de la 1re octave (1/longueur d'onde, en 1/m). */
  frequency: number
  /** Atténuation d'amplitude par octave (0..1). */
  gain: number
  /** Multiplication de fréquence par octave (>1). */
  lacunarity: number
}

export type Fbm2D = (x: number, z: number, p: FbmParams) => number

/** Fabrique un fBm 2D seedé, normalisé ≈ [-1, 1] (somme pondérée d'octaves simplex). */
export function makeFbm2D(seed: number): Fbm2D {
  const noise = createNoise2D(mulberry32(seed))
  return (x, z, p) => {
    let sum = 0
    let norm = 0
    let amp = 1
    let f = p.frequency
    for (let i = 0; i < p.octaves; i++) {
      sum += amp * noise(x * f, z * f)
      norm += amp
      amp *= p.gain
      f *= p.lacunarity
    }
    return sum / norm
  }
}
