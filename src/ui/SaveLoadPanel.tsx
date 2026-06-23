import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useBuild } from '../store/build'
import {
  deleteSlot,
  downloadAircraft,
  listSaves,
  loadFromSlot,
  parseAircraft,
  saveToSlot,
} from '../core/save'

/**
 * Sauvegardes (Jalon 2-F), bas-droite. Slots `localStorage` (Sauver / Charger /
 * Supprimer) + export/import fichier `.json`. Charge via `setAircraft` (le graphe
 * est validé avant injection ; le budget se réévalue tout seul dans le bandeau).
 */
export function SaveLoadPanel() {
  const aircraft = useBuild((s) => s.aircraft)
  const setAircraft = useBuild((s) => s.setAircraft)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => setSlots(listSaves())
  const toggle = () => {
    if (!open) refresh()
    setOpen((o) => !o)
    setMsg(null)
  }
  const flash = (m: string) => {
    setMsg(m)
    window.setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), 2500)
  }

  const onSave = () => {
    const n = name.trim()
    if (!n) return flash('Donne un nom')
    try {
      saveToSlot(n, aircraft)
      refresh()
      flash(`« ${n} » sauvegardé`)
    } catch {
      flash('Échec de la sauvegarde')
    }
  }

  const onLoad = (slot: string) => {
    try {
      setAircraft(loadFromSlot(slot))
      flash(`« ${slot} » chargé`)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Échec du chargement')
    }
  }

  const onDelete = (slot: string) => {
    deleteSlot(slot)
    refresh()
  }

  const onImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        setAircraft(parseAircraft(String(reader.result)))
        flash('Importé')
      } catch (e) {
        flash(e instanceof Error ? e.message : 'Import invalide')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div style={styles.root}>
      {open && (
        <div style={styles.panel}>
          <div style={styles.row}>
            <input
              style={styles.input}
              placeholder="nom de l'avion"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSave()}
            />
            <button type="button" style={styles.save} onClick={onSave}>
              Sauver
            </button>
          </div>

          <div style={styles.slots}>
            {slots.length === 0 && <span style={styles.empty}>Aucune sauvegarde</span>}
            {slots.map((s) => (
              <div key={s} style={styles.slot}>
                <span style={styles.slotName} title={s}>
                  {s}
                </span>
                <button type="button" style={styles.slotBtn} onClick={() => onLoad(s)}>
                  Charger
                </button>
                <button type="button" style={styles.slotDel} onClick={() => onDelete(s)} title="Supprimer">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div style={styles.row}>
            <button type="button" style={styles.file} onClick={() => downloadAircraft(name, aircraft)}>
              ⭳ Exporter
            </button>
            <button type="button" style={styles.file} onClick={() => fileRef.current?.click()}>
              ⭱ Importer
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImport(f)
                e.target.value = ''
              }}
            />
          </div>

          {msg && <div style={styles.msg}>{msg}</div>}
        </div>
      )}

      <button type="button" style={styles.toggle} onClick={toggle}>
        💾 Sauvegardes
      </button>
    </div>
  )
}

const panelBg = 'rgba(18, 24, 32, 0.72)'
const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed',
    bottom: 16,
    right: 16,
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    fontFamily: 'system-ui, sans-serif',
  },
  panel: {
    width: 250,
    background: panelBg,
    borderRadius: 12,
    padding: 10,
    backdropFilter: 'blur(6px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: { display: 'flex', gap: 6 },
  input: {
    flex: 1,
    minWidth: 0,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#eef3f6',
    padding: '7px 9px',
    borderRadius: 7,
    fontSize: 12,
  },
  save: { border: 'none', cursor: 'pointer', background: '#5bd06a', color: '#0c2410', padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700 },
  slots: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' },
  empty: { color: '#9fb0bd', fontSize: 12, padding: '4px 2px' },
  slot: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 7, padding: '4px 6px' },
  slotName: { flex: 1, minWidth: 0, color: '#eef3f6', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  slotBtn: { border: 'none', cursor: 'pointer', background: 'rgba(224,162,58,0.85)', color: '#1a1208', padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  slotDel: { border: 'none', cursor: 'pointer', background: 'rgba(214,84,72,0.7)', color: '#fff', padding: '4px 7px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  file: { flex: 1, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#cdd9e3', padding: '7px 9px', borderRadius: 7, fontSize: 12, fontWeight: 600 },
  msg: { color: '#cfe0ff', fontSize: 11.5, textAlign: 'center', padding: '2px 0' },
  toggle: {
    border: 'none',
    cursor: 'pointer',
    background: panelBg,
    color: '#cdd9e3',
    padding: '8px 12px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    backdropFilter: 'blur(6px)',
  },
}
