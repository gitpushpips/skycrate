import { EffectComposer, N8AO, Bloom, Vignette } from '@react-three/postprocessing'
import { useControls } from 'leva'

/**
 * Post-traitement subtil (barre §3) : SSAO (N8AO) pour ancrer les objets,
 * bloom léger sur les hautes lumières, vignette douce. Anti-aliasing via le
 * multisampling (MSAA) de l'EffectComposer.
 */
export function PostFX() {
  const { bloom, ao } = useControls('Rendu', {
    bloom: { value: 0.32, min: 0, max: 1.5, step: 0.01, label: 'bloom' },
    ao: { value: 1.4, min: 0, max: 4, step: 0.1, label: 'SSAO' },
  })

  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={3} intensity={ao} distanceFalloff={1.5} halfRes />
      <Bloom intensity={bloom} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette offset={0.3} darkness={0.5} />
    </EffectComposer>
  )
}
