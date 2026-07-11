/**
 * Hooks audio (C2/C4) — PLACEHOLDER. Règle du projet : aucun asset importé ;
 * les vrais sons (explosion, éclaboussure) seront branchés ici plus tard
 * (WebAudio / fichiers maison). L'appel est déjà câblé aux bons moments.
 */
export type SfxName = 'explosion' | 'splash'

export function playSfx(name: SfxName): void {
  if (import.meta.env.DEV) console.debug(`[sfx] ${name}`)
}
