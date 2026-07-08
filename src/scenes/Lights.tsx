import { useControls } from 'leva'
import { palette } from './palette'
import { SUN_POSITION } from '../core/world/orientation'
import { useRenderQuality } from './renderQuality'

/**
 * Éclairage : soleil directionnel FIXE = nord (cf. core/world/orientation),
 * + hémisphère pour rattraper les zones d'ombre. Ombres douces VSM ; la
 * résolution/le flou suivent le niveau de qualité (jalon perf : la VSM
 * 2048²/20 samples coûtait ~9 ms sur HD 630, 1024²/8 ≈ 1 ms).
 */
export function Lights() {
  const quality = useRenderQuality()
  const { sunIntensity, ambient } = useControls('Rendu', {
    sunIntensity: { value: 3.1, min: 0, max: 6, step: 0.1, label: 'soleil' },
    ambient: { value: 0.6, min: 0, max: 1.5, step: 0.05, label: 'ambiance' },
  })
  const hi = quality === 'qualité'

  return (
    <>
      <hemisphereLight args={[palette.skyFill, palette.groundBounce, ambient]} />
      <directionalLight
        key={quality} // remonte la lumière au changement (réalloue la shadow map)
        position={SUN_POSITION}
        intensity={sunIntensity}
        color={palette.sunLight}
        castShadow
        shadow-mapSize={hi ? [2048, 2048] : [1024, 1024]}
        shadow-radius={7}
        shadow-blurSamples={hi ? 20 : 8}
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
