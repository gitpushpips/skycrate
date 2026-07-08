import { useControls } from 'leva'

/**
 * Niveau de qualité du rendu (jalon perf). Mesures Intel HD 630 (hangar,
 * 903×778) : N8AO ≈ 22 ms (!), MSAA 4× ≈ 6 ms, bloom ≈ 3,5 ms, composer ≈ 3 ms
 * — la scène brute tient 60 fps. Le fill-rate (DPR 1 vs 1.25) est neutre.
 * - performance : AUCUN post-process (ACES + ombres VSM conservés) → ~60 fps
 * - équilibré   : bloom + vignette (MSAA 0)                        → ~45 fps
 * - qualité     : N8AO + bloom + vignette + MSAA 4                 → ~20 fps
 */
export type RenderQuality = 'performance' | 'équilibré' | 'qualité'

export function useRenderQuality(): RenderQuality {
  const { quality } = useControls('Rendu', {
    quality: {
      value: 'performance' as RenderQuality,
      options: ['performance', 'équilibré', 'qualité'] as RenderQuality[],
      label: 'qualité',
    },
  })
  return quality as RenderQuality
}
