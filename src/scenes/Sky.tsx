import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
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
    fogNear: { value: 90, min: 10, max: 400, step: 5, label: 'fog proche' },
    fogFar: { value: 620, min: 100, max: 2000, step: 10, label: 'fog lointain' },
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

  return (
    <>
      <color attach="background" args={[skyHorizon]} />
      <fog attach="fog" args={[skyHorizon, fogNear, fogFar]} />
      <mesh renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[1000, 32, 16]} />
        <primitive object={material} attach="material" />
      </mesh>
    </>
  )
}
