import type { ContactForcePayload } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'

/**
 * Sonde de diagnostic S1 (DEV only) : enregistre chaque événement de force de
 * contact de l'avion (position, vitesse, force, direction) dans un ring buffer
 * exposé en `window.__contacts`. Sert à CLASSER les « coups » fantômes au sol :
 * près d'un bord de chunk physique (x ou z ≡ 0 mod 256), d'un rim de pad, ou
 * mi-chunk (arêtes internes de triangles). Analyse via eval en preview.
 */
export interface ContactSample {
  t: number // ms depuis origine de la page
  x: number
  y: number
  z: number
  speed: number
  vy: number
  f: number // maxForceMagnitude
  fx: number // direction de la force max (monde)
  fy: number
  fz: number
}

const CAP = 4000
const samples: ContactSample[] = []
let ptr = 0

/** Distance au multiple de `size` le plus proche (bord de chunk). */
function distToGrid(v: number, size: number): number {
  const m = ((v % size) + size) % size
  return Math.min(m, size - m)
}

export function recordContact(e: ContactForcePayload, rb: RapierRigidBody): void {
  const p = rb.translation()
  const v = rb.linvel()
  const s: ContactSample = {
    t: Math.round(performance.now()),
    x: +p.x.toFixed(2),
    y: +p.y.toFixed(2),
    z: +p.z.toFixed(2),
    speed: +Math.hypot(v.x, v.y, v.z).toFixed(2),
    vy: +v.y.toFixed(2),
    f: +e.maxForceMagnitude.toFixed(1),
    fx: +e.maxForceDirection.x.toFixed(3),
    fy: +e.maxForceDirection.y.toFixed(3),
    fz: +e.maxForceDirection.z.toFixed(3),
  }
  if (samples.length < CAP) samples.push(s)
  else {
    samples[ptr] = s
    ptr = (ptr + 1) % CAP
  }
}

interface ContactsApi {
  samples: ContactSample[]
  clear: () => void
  /** Classement : coups (force ≥ spikeFactor × médiane) par zone (bord de chunk < 4 m / mi-chunk). */
  summary: (spikeFactor?: number) => unknown
}

export function installContactsApi(): void {
  const api: ContactsApi = {
    samples,
    clear: () => {
      samples.length = 0
      ptr = 0
    },
    summary: (spikeFactor = 3) => {
      if (samples.length === 0) return { n: 0 }
      const fs = samples.map((s) => s.f).sort((a, b) => a - b)
      const median = fs[Math.floor(fs.length / 2)]
      const spikes = samples.filter((s) => s.f >= median * spikeFactor && s.f > 1)
      const atBorder = spikes.filter(
        (s) => Math.min(distToGrid(s.x, 256), distToGrid(s.z, 256)) < 4,
      )
      const lateral = spikes.filter((s) => Math.hypot(s.fx, s.fz) > 0.5)
      return {
        n: samples.length,
        medianForce: median,
        maxForce: fs[fs.length - 1],
        spikes: spikes.length,
        spikesAtChunkBorder: atBorder.length,
        spikesLateralForce: lateral.length,
        worst: [...spikes].sort((a, b) => b.f - a.f).slice(0, 12),
      }
    },
  }
  ;(window as unknown as Record<string, unknown>).__contacts = api
}
