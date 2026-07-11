import { useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useSettings } from '../store/settings'
import { RENDER_QUALITIES } from '../scenes/renderQuality'

/**
 * Menu paramètres JOUEUR (S6). Bouton engrenage (haut-droite) ⇒ panneau modal :
 *   - Qualité graphique (performance / équilibré / qualité) — était bloquée dans
 *     leva (masqué en prod), désormais accessible en jeu.
 *   - Assistance de pilotage (ON/OFF).
 *   - Réglages avancés = ouvre/masque le panneau leva (demande utilisateur).
 *   - Aide-mémoire des commandes.
 * Échap ferme. La valeur qualité/assist est persistée par le store.
 */
export function SettingsMenu() {
  const open = useSettings((s) => s.open)
  const setOpen = useSettings((s) => s.setOpen)
  const quality = useSettings((s) => s.quality)
  const setQuality = useSettings((s) => s.setQuality)
  const assist = useSettings((s) => s.assist)
  const setAssist = useSettings((s) => s.setAssist)
  const showLeva = useSettings((s) => s.showLeva)
  const toggleLeva = useSettings((s) => s.toggleLeva)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && useSettings.getState().open) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  return (
    <>
      <button
        type="button"
        aria-label="Paramètres"
        title="Paramètres"
        onClick={() => setOpen(!open)}
        style={styles.gear}
      >
        ⚙
      </button>

      {open && (
        <div style={styles.backdrop} onClick={() => setOpen(false)}>
          <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
            <div style={styles.header}>
              <span style={styles.title}>Paramètres</span>
              <button type="button" onClick={() => setOpen(false)} style={styles.close} aria-label="Fermer">
                ✕
              </button>
            </div>

            <Section label="Qualité graphique">
              <div style={styles.segment}>
                {RENDER_QUALITIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    style={{ ...styles.segBtn, ...(q === quality ? styles.segBtnOn : null) }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <p style={styles.hint}>« performance » = plus fluide · « qualité » = ombres + effets.</p>
            </Section>

            <Section label="Assistance de pilotage">
              <Toggle on={assist} onClick={() => setAssist(!assist)} />
              <p style={styles.hint}>
                Amortit et borne l’assiette (confort). Coupée = pilotage purement physique.
              </p>
            </Section>

            <Section label="Réglages avancés">
              <Toggle on={showLeva} onClick={toggleLeva} label={showLeva ? 'Panneau ouvert' : 'Panneau masqué'} />
              <p style={styles.hint}>Ouvre le panneau de réglages fins (leva) : physique, rendu, économie…</p>
            </Section>

            <Section label="Commandes">
              <div style={styles.keys}>
                {CONTROLS.map(([k, d]) => (
                  <div key={k} style={styles.keyRow}>
                    <span style={styles.key}>{k}</span>
                    <span style={styles.keyDesc}>{d}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      )}
    </>
  )
}

const CONTROLS: [string, string][] = [
  ['W / S', 'tangage (piqué / cabré)'],
  ['A / D', 'roulis'],
  ['Q / E', 'lacet'],
  ['Maj / Ctrl', 'gaz + / −'],
  ['C', 'inverse de poussée'],
  ['G', 'train (rentrer / sortir)'],
  ['R', 'réinitialiser'],
  ['M', 'carte'],
]

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionLabel}>{label}</div>
      {children}
    </div>
  )
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} style={styles.toggleRow}>
      <span style={{ ...styles.switch, ...(on ? styles.switchOn : null) }}>
        <span style={{ ...styles.knob, ...(on ? styles.knobOn : null) }} />
      </span>
      <span style={styles.toggleLabel}>{label ?? (on ? 'Activée' : 'Désactivée')}</span>
    </button>
  )
}

const panelBg = 'rgba(20, 26, 34, 0.98)'

const styles: Record<string, CSSProperties> = {
  gear: {
    position: 'fixed',
    top: 14,
    right: 14,
    zIndex: 9998,
    width: 40,
    height: 40,
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(18,24,32,0.8)',
    color: '#eef3f6',
    fontSize: 20,
    lineHeight: 1,
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
    fontFamily: 'system-ui, sans-serif',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(6, 10, 14, 0.5)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
  },
  panel: {
    width: 'min(440px, 92vw)',
    maxHeight: '86vh',
    overflowY: 'auto',
    background: panelBg,
    borderRadius: 16,
    padding: '20px 22px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    color: '#eef3f6',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: 700 },
  close: {
    border: 'none',
    background: 'rgba(255,255,255,0.08)',
    color: '#cdd8e0',
    width: 30,
    height: 30,
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  section: { padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.08)' },
  sectionLabel: { fontSize: 12, letterSpacing: 1.5, color: '#9fb0bd', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' },
  segment: { display: 'flex', gap: 6, background: 'rgba(255,255,255,0.06)', padding: 4, borderRadius: 10 },
  segBtn: {
    flex: 1,
    border: 'none',
    borderRadius: 7,
    padding: '9px 6px',
    cursor: 'pointer',
    background: 'transparent',
    color: '#b7c4cf',
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  segBtnOn: { background: '#5bd06a', color: '#0c2410' },
  hint: { fontSize: 12, color: '#8a99a6', margin: '8px 2px 0', lineHeight: 1.4 },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
  },
  switch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    background: 'rgba(255,255,255,0.16)',
    position: 'relative',
    transition: 'background 160ms',
    flexShrink: 0,
  },
  switchOn: { background: '#5bd06a' },
  knob: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 160ms',
  },
  knobOn: { left: 21 },
  toggleLabel: { fontSize: 14, color: '#dbe6ef', fontWeight: 600 },
  keys: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' },
  keyRow: { display: 'flex', alignItems: 'center', gap: 8 },
  key: {
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
    fontSize: 11,
    fontWeight: 700,
    color: '#eef3f6',
    background: 'rgba(255,255,255,0.1)',
    padding: '2px 7px',
    borderRadius: 5,
    whiteSpace: 'nowrap',
  },
  keyDesc: { fontSize: 12, color: '#9fb0bd' },
}
