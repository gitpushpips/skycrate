import { EffectComposer, N8AO, Bloom, Vignette } from '@react-three/postprocessing'
import { useControls } from 'leva'
import { useRenderQuality } from './renderQuality'

/**
 * Post-traitement (barre §3), conditionné par le niveau de qualité (jalon
 * perf — voir renderQuality.ts pour les coûts mesurés sur HD 630) :
 * - performance : rien (le tone mapping ACES et les ombres restent au renderer)
 * - équilibré   : bloom + vignette, sans MSAA
 * - qualité     : SSAO (N8AO) + bloom + vignette + MSAA 4×
 */
export function PostFX() {
  const quality = useRenderQuality()
  const { bloom, ao } = useControls('Rendu', {
    bloom: { value: 0.32, min: 0, max: 1.5, step: 0.01, label: 'bloom' },
    ao: { value: 1.4, min: 0, max: 4, step: 0.1, label: 'SSAO' },
  })

  if (quality === 'performance') return null

  if (quality === 'équilibré') {
    return (
      <EffectComposer multisampling={0}>
        <Bloom intensity={bloom} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette offset={0.3} darkness={0.5} />
      </EffectComposer>
    )
  }

  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={3} intensity={ao} distanceFalloff={1.5} halfRes />
      <Bloom intensity={bloom} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette offset={0.3} darkness={0.5} />
    </EffectComposer>
  )
}
