import { useControls, folder } from 'leva'
import { DEFAULT_COINS_BUDGET } from '../core/economy'

/**
 * Réglages d'économie à chaud (leva « Économie »). Le budget de coins de départ
 * n'est pas chiffré dans le dossier (« petit budget ») → exposé ici plutôt que
 * deviné en dur. Plus tard, les missions feront varier ce budget.
 */
export interface EconomyTunables {
  coinsBudget: number
}

export function useEconomyTunables(): EconomyTunables {
  const v = useControls('Économie', {
    coins: folder({
      coinsBudget: {
        value: DEFAULT_COINS_BUDGET,
        min: 0,
        max: 5000,
        step: 50,
        label: 'budget (coins)',
      },
    }),
  })
  return v as EconomyTunables
}
