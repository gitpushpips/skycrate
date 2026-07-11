import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Explosion soignée (C2) — stylisée/arcade, multi-couches, ~60 fps :
 *  - FLASH : sphère additive blanche, très brève ;
 *  - BOULE DE FEU : 2 sphères additives qui enflent (jaune→orange→rouge sombre) ;
 *  - FUMÉE : volutes low-poly sombres qui montent lentement et s'évanouissent ;
 *  - BRAISES : THREE.Points additifs éjectés en gerbe, gravité, extinction ;
 *  - ONDE DE CHOC : anneau plat au sol qui s'étend et s'efface ;
 *  - LUMIÈRE : pointLight orange en pic décroissant (lit le décor même sans bloom).
 * Les débris (pièces éjectées) vivent dans `CrashDebris` — ici, que du visuel.
 */
const SMOKE_N = 10
const SPARK_N = 80

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

const C_FLASH = new THREE.Color('#fff3d6')
const C_FIRE_0 = new THREE.Color('#ffd868')
const C_FIRE_1 = new THREE.Color('#ff7a2d')
const C_FIRE_2 = new THREE.Color('#a3271b')

export function CrashExplosion({
  center,
  radius,
  duration,
}: {
  center: [number, number, number]
  radius: number
  duration: number
}) {
  const t = useRef(0)
  const [alive, setAlive] = useState(true)
  const smokeTotal = duration + 2.2

  const flashRef = useRef<THREE.Mesh>(null)
  const fire1Ref = useRef<THREE.Mesh>(null)
  const fire2Ref = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const sparksRef = useRef<THREE.Points>(null)
  const smokeRefs = useRef<(THREE.Mesh | null)[]>([])

  // Ressources partagées (créées à l'explosion, libérées à l'unmount).
  const res = useMemo(() => {
    const flashMat = new THREE.MeshBasicMaterial({
      color: C_FLASH,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    // Corps de feu en blending NORMAL (opaque) : l'additif se lave sur les
    // fonds clairs (piste/sable vus de dessus) ; seul le cœur est additif.
    const fireMat1 = new THREE.MeshBasicMaterial({
      color: C_FIRE_0.clone(),
      transparent: true,
      depthWrite: false,
    })
    const fireMat2 = new THREE.MeshBasicMaterial({
      color: C_FIRE_0.clone(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#ffdfae',
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const smokeMat = Array.from({ length: SMOKE_N }, () =>
      new THREE.MeshStandardMaterial({
        color: '#3c3a38',
        transparent: true,
        opacity: 0.55,
        flatShading: true,
        depthWrite: false,
      }),
    )
    const sphere = new THREE.SphereGeometry(1, 12, 10)
    const puff = new THREE.IcosahedronGeometry(1, 0)
    const ring = new THREE.RingGeometry(0.72, 1, 40)
    ring.rotateX(-Math.PI / 2)

    // Braises : gerbe radiale (positions relatives au centre, gravité maison).
    const sparkPos = new Float32Array(SPARK_N * 3)
    const sparkVel: THREE.Vector3[] = []
    for (let i = 0; i < SPARK_N; i++) {
      const a = Math.random() * Math.PI * 2
      const up = 0.25 + Math.random() * 0.95
      const v = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
        .multiplyScalar(0.4 + Math.random() * 1)
        .setY(up)
        .normalize()
        .multiplyScalar(radius * (1.1 + Math.random() * 1.6))
      sparkVel.push(v)
      sparkPos[i * 3] = 0
      sparkPos[i * 3 + 1] = 0.4
      sparkPos[i * 3 + 2] = 0
    }
    const sparkGeo = new THREE.BufferGeometry()
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3))
    const sparkMat = new THREE.PointsMaterial({
      color: '#ffc46e',
      size: 0.22,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    // Volutes de fumée : direction majoritairement vers le haut, dérive latérale.
    const puffs = Array.from({ length: SMOKE_N }, (_, i) => ({
      dir: new THREE.Vector3((Math.random() - 0.5) * 1.1, 0.8 + Math.random() * 0.7, (Math.random() - 0.5) * 1.1)
        .normalize()
        .multiplyScalar(1.6 + Math.random() * 1.6),
      delay: i * 0.045,
      size: 0.55 + Math.random() * 0.75,
      spin: (Math.random() - 0.5) * 1.6,
    }))

    return { flashMat, fireMat1, fireMat2, ringMat, smokeMat, sphere, puff, ring, sparkGeo, sparkMat, sparkVel, puffs }
  }, [radius])

  useEffect(
    () => () => {
      const { flashMat, fireMat1, fireMat2, ringMat, smokeMat, sphere, puff, ring, sparkGeo, sparkMat } = res
      for (const m of [flashMat, fireMat1, fireMat2, ringMat, sparkMat, ...smokeMat]) m.dispose()
      for (const g of [sphere, puff, ring, sparkGeo]) g.dispose()
    },
    [res],
  )

  useFrame((_, dt) => {
    if (!alive) return
    t.current += dt
    const tt = t.current

    // FLASH (0 → 0.13 s)
    if (flashRef.current) {
      const k = clamp01(tt / 0.13)
      flashRef.current.scale.setScalar(0.5 + easeOut(k) * radius * 1.5)
      res.flashMat.opacity = 1 - k
      flashRef.current.visible = k < 1
    }
    // BOULE DE FEU (0 → duration)
    const fk = clamp01(tt / duration)
    const grow = easeOut(clamp01(tt / (duration * 0.38)))
    for (const [ref, mat, s, off] of [
      [fire1Ref, res.fireMat1, 1, 0.25],
      [fire2Ref, res.fireMat2, 0.66, 0.75],
    ] as const) {
      if (!ref.current) continue
      ref.current.scale.setScalar(0.4 + grow * radius * s)
      ref.current.position.y = 0.4 + fk * radius * 0.5 + off
      mat.color.copy(C_FIRE_0).lerp(C_FIRE_1, clamp01(fk * 2)).lerp(C_FIRE_2, clamp01(fk * 1.6 - 0.5))
      mat.opacity = fk < 0.3 ? 1 : 1 - (fk - 0.3) / 0.7
      ref.current.visible = fk < 1
    }
    // ONDE DE CHOC (0 → 0.7 s)
    if (ringRef.current) {
      const k = clamp01(tt / 0.7)
      ringRef.current.scale.setScalar(1 + easeOut(k) * radius * 2.3)
      res.ringMat.opacity = 0.8 * (1 - k)
      ringRef.current.visible = k < 1
    }
    // LUMIÈRE (0 → 0.6 s)
    if (lightRef.current) {
      lightRef.current.intensity = Math.max(0, 1 - tt / 0.6) * radius * 14
    }
    // BRAISES (0 → 1.4 s) : gravité, extinction au sol.
    if (sparksRef.current) {
      const attr = res.sparkGeo.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      for (let i = 0; i < SPARK_N; i++) {
        const v = res.sparkVel[i]
        v.y -= 9.8 * dt * 1.15
        const y = arr[i * 3 + 1] + v.y * dt
        if (y > -0.2) {
          arr[i * 3] += v.x * dt
          arr[i * 3 + 1] = y
          arr[i * 3 + 2] += v.z * dt
        }
      }
      attr.needsUpdate = true
      res.sparkMat.opacity = clamp01(1.15 - tt / 1.4)
      sparksRef.current.visible = tt < 1.5
    }
    // FUMÉE (0.05 → smokeTotal) : monte, grossit, s'évanouit.
    for (let i = 0; i < SMOKE_N; i++) {
      const m = smokeRefs.current[i]
      if (!m) continue
      const p = res.puffs[i]
      const k = clamp01((tt - p.delay) / (smokeTotal - p.delay))
      m.visible = k > 0 && k < 1
      if (!m.visible) continue
      const rise = easeOut(k)
      m.position.set(p.dir.x * rise * 2.2, 0.6 + p.dir.y * rise * 3.2, p.dir.z * rise * 2.2)
      m.scale.setScalar(p.size * (0.6 + k * 2.6))
      m.rotation.y = p.spin * tt
      res.smokeMat[i].opacity = 0.5 * (1 - k) * (1 - k)
    }

    if (tt > smokeTotal + 0.2) setAlive(false)
  })

  if (!alive) return null
  return (
    <group position={center}>
      <mesh ref={flashRef} geometry={res.sphere} material={res.flashMat} />
      <mesh ref={fire1Ref} geometry={res.sphere} material={res.fireMat1} />
      <mesh ref={fire2Ref} geometry={res.sphere} material={res.fireMat2} position={[0, 1, 0]} />
      <mesh ref={ringRef} geometry={res.ring} material={res.ringMat} position={[0, -0.45, 0]} />
      <pointLight ref={lightRef} color="#ff9c4a" distance={radius * 7} decay={2} position={[0, 1.5, 0]} />
      <points ref={sparksRef} geometry={res.sparkGeo} material={res.sparkMat} frustumCulled={false} />
      {res.puffs.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            smokeRefs.current[i] = m
          }}
          geometry={res.puff}
          material={res.smokeMat[i]}
        />
      ))}
    </group>
  )
}
