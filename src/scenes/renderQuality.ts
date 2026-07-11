import { useSettings } from '../store/settings'

/**
 * Niveau de qualité du rendu (jalon perf). Mesures Intel HD 630 (hangar,
 * 903×778) : N8AO ≈ 22 ms (!), MSAA 4× ≈ 6 ms, bloom ≈ 3,5 ms, composer ≈ 3 ms
 * — la scène brute tient 60 fps. Le fill-rate (DPR 1 vs 1.25) est neutre.
 * - performance : AUCUN post-process (ACES + ombres VSM conservés) → ~60 fps
 * - équilibré   : bloom + vignette (MSAA 0)                        → ~45 fps
 * - qualité     : N8AO + bloom + vignette + MSAA 4                 → ~20 fps
 *
 * S6 : la valeur vit désormais dans le store `settings` (menu paramètres joueur,
 * persisté) — plus dans leva (masqué en prod).
 */
export type RenderQuality = 'performance' | 'équilibré' | 'qualité'

export const RENDER_QUALITIES: RenderQuality[] = ['performance', 'équilibré', 'qualité']

export function useRenderQuality(): RenderQuality {
  return useSettings((s) => s.quality)
}
