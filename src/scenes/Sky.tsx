import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { palette } from './palette'

/**
 * Ciel dégradé (dôme) + brouillard de distance assorti à l'horizon, pour donner
 * de la profondeur. Le dôme n'est pas affecté par le fog (ShaderMaterial sans
 * include de fog) → le ciel reste net tandis que le sol fond vers l'horizon.
 */
export function Sky() {
  const { skyTop, skyHorizon, fogNear, fogFar } = useControls('Rendu', {
    skyTop: { value: palette.skyTop, label: 'ciel (haut)' },
    skyHorizon: { value: palette.skyHorizon, label: 'ciel (horizon)' },
    // Défauts adaptés à l'échelle du monde ouvert (3+A) : voir les massifs de loin.
    fogNear: { value: 220, min: 10, max: 800, step: 5, label: 'fog proche' },
    fogFar: { value: 1500, min: 100, max: 3000, step: 10, label: 'fog lointain' },
  })

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          topColor: { value: new THREE.Color(palette.skyTop) },
          horizonColor: { value: new THREE.Color(palette.skyHorizon) },
          exponent: { value: 0.7 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 topColor;
          uniform vec3 horizonColor;
          uniform float exponent;
          varying vec3 vDir;
          void main() {
            float t = pow(max(vDir.y, 0.0), exponent);
            gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
          }
        `,
      }),
    [],
  )

  useEffect(() => {
    material.uniforms.topColor.value.set(skyTop)
    material.uniforms.horizonColor.value.set(skyHorizon)
  }, [material, skyTop, skyHorizon])

  // Le dôme suit la caméra (sur un monde de plusieurs km, un dôme fixe à
  // l'origine finirait derrière l'avion).
  const dome = useRef<THREE.Mesh>(null)
  useFrame(({ camera }) => {
    dome.current?.position.copy(camera.position)
  })

  return (
    <>
      <color attach="background" args={[skyHorizon]} />
      <fog attach="fog" args={[skyHorizon, fogNear, fogFar]} />
      <mesh ref={dome} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[3400, 32, 16]} />
        <primitive object={material} attach="material" />
      </mesh>
    </>
  )
}
