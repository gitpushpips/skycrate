import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SEA_Y } from '../core/world/world'

/**
 * Effets d'eau (C4) — stylisés, sans asset :
 *  - `WaterSplash` : gerbe blanche + anneau d'écume à la ligne d'eau, one-shot
 *    à chaque ENTRÉE dans l'eau (effleurement récupérable compris) ;
 *  - `SinkingBubbles` : chapelet de bulles qui filent vers la surface pendant
 *    que l'avion coule (naufrage), émises depuis sa position courante.
 * Pas d'explosion ici : le naufrage est silencieux et sombre, par contraste
 * avec l'explosion terrestre (C2).
 */
const SPRAY_N = 70
const BUBBLE_N = 46

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeOut = (t: number) => 1 - (1 - t) * (1 - t)

/** Gerbe + anneau d'écume à l'impact sur l'eau. `strength` 0..1. */
export function WaterSplash({
  position,
  strength,
  onDone,
}: {
  position: [number, number, number]
  strength: number
  onDone: () => void
}) {
  const t = useRef(0)
  const sprayRef = useRef<THREE.Points>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const done = useRef(false)
  const duration = 1.25

  const res = useMemo(() => {
    const s = 0.4 + strength * 1.6
    const pos = new Float32Array(SPRAY_N * 3)
    const vel: THREE.Vector3[] = []
    for (let i = 0; i < SPRAY_N; i++) {
      const a = Math.random() * Math.PI * 2
      // Gerbe : surtout vers le haut, évasée (couronne d'éclaboussure).
      const out = 0.35 + Math.random() * 1.15
      const up = 1.1 + Math.random() * 1.5
      vel.push(new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out).multiplyScalar(s * 3.4))
      pos[i * 3] = Math.cos(a) * Math.random() * 0.7 * s
      pos[i * 3 + 1] = 0
      pos[i * 3 + 2] = Math.sin(a) * Math.random() * 0.7 * s
    }
    const sprayGeo = new THREE.BufferGeometry()
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const sprayMat = new THREE.PointsMaterial({
      color: '#eaf6ff',
      size: 0.3 * (0.7 + strength),
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const ringGeo = new THREE.RingGeometry(0.6, 1, 36)
    ringGeo.rotateX(-Math.PI / 2)
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#dff1fb',
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    return { sprayGeo, sprayMat, ringGeo, ringMat, vel, scale: s }
  }, [strength])

  useEffect(
    () => () => {
      res.sprayGeo.dispose()
      res.sprayMat.dispose()
      res.ringGeo.dispose()
      res.ringMat.dispose()
    },
    [res],
  )

  useFrame((_, dt) => {
    if (done.current) return
    t.current += dt
    const k = clamp01(t.current / duration)

    const attr = res.sprayGeo.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < SPRAY_N; i++) {
      const v = res.vel[i]
      v.y -= 9.81 * dt * 1.1
      arr[i * 3] += v.x * dt
      arr[i * 3 + 1] += v.y * dt
      arr[i * 3 + 2] += v.z * dt
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 0 // les gouttes meurent à la surface
    }
    attr.needsUpdate = true
    res.sprayMat.opacity = 1 - k

    if (ringRef.current) {
      ringRef.current.scale.setScalar(res.scale * (1 + easeOut(k) * 7))
      res.ringMat.opacity = 0.75 * (1 - k)
    }

    if (k >= 1) {
      done.current = true
      onDone()
    }
  })

  return (
    <group position={[position[0], SEA_Y, position[2]]}>
      <points ref={sprayRef} geometry={res.sprayGeo} material={res.sprayMat} frustumCulled={false} />
      <mesh ref={ringRef} geometry={res.ringGeo} material={res.ringMat} position={[0, 0.05, 0]} />
    </group>
  )
}

/** Bulles qui remontent depuis l'épave pendant qu'elle coule. */
export function SinkingBubbles({ getSource }: { getSource: () => THREE.Vector3 | null }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BUBBLE_N * 3), 3))
    return g
  }, [])
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#cfeaf5',
        size: 0.22,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [],
  )
  // Chaque bulle : vitesse de montée + délai de (ré)émission.
  const bubbles = useMemo(
    () =>
      Array.from({ length: BUBBLE_N }, () => ({
        rise: 1.4 + Math.random() * 2.4,
        wobble: Math.random() * Math.PI * 2,
        delay: Math.random() * 2.2,
        alive: false,
      })),
    [],
  )

  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )

  useFrame((_, dt) => {
    const src = getSource()
    const attr = geo.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < BUBBLE_N; i++) {
      const b = bubbles[i]
      if (!b.alive) {
        b.delay -= dt
        if (b.delay > 0 || !src) continue
        // (Ré)émission depuis l'épave, avec dispersion.
        arr[i * 3] = src.x + (Math.random() - 0.5) * 3
        arr[i * 3 + 1] = src.y + (Math.random() - 0.5) * 1.5
        arr[i * 3 + 2] = src.z + (Math.random() - 0.5) * 3
        b.alive = true
        continue
      }
      b.wobble += dt * 3
      arr[i * 3] += Math.sin(b.wobble) * 0.35 * dt
      arr[i * 3 + 1] += b.rise * dt
      arr[i * 3 + 2] += Math.cos(b.wobble * 0.8) * 0.35 * dt
      // Éclatent à la surface ⇒ remises en attente.
      if (arr[i * 3 + 1] >= SEA_Y) {
        b.alive = false
        b.delay = Math.random() * 1.6
      }
    }
    attr.needsUpdate = true
  })

  return <points geometry={geo} material={mat} frustumCulled={false} />
}
