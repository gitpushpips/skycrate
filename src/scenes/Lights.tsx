import { useControls } from 'leva'
import { palette } from './palette'
import { SUN_POSITION } from '../core/world/orientation'

/**
 * Éclairage : soleil directionnel FIXE = nord (cf. core/world/orientation),
 * + hémisphère pour rattraper les zones d'ombre. Ombres douces fournies par
 * <SoftShadows> (PCSS) monté au niveau du Canvas.
 */
export function Lights() {
  const { sunIntensity, ambient } = useControls('Rendu', {
    sunIntensity: { value: 3.1, min: 0, max: 6, step: 0.1, label: 'soleil' },
    ambient: { value: 0.6, min: 0, max: 1.5, step: 0.05, label: 'ambiance' },
  })

  return (
    <>
      <hemisphereLight args={[palette.skyFill, palette.groundBounce, ambient]} />
      <directionalLight
        position={SUN_POSITION}
        intensity={sunIntensity}
        color={palette.sunLight}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={7}
        shadow-blurSamples={20}
        shadow-bias={-0.0002}
        shadow-normalBias={0.05}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
    </>
  )
}
