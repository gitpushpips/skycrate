import type { CSSProperties } from 'react'
import { useHud } from '../store/hud'

/**
 * HUD de vol (étape 6) : vitesse, altitude, jauge de carburant, alertes de
 * survitesse structurelle (>80 %) / rupture / panne sèche. Overlay DOM rendu
 * hors du Canvas, alimenté par le store `useHud`.
 */
export function Hud() {
  const speed = useHud((s) => s.speed)
  const altitude = useHud((s) => s.altitude)
  const fuel = useHud((s) => s.fuel)
  const fuelMax = useHud((s) => s.fuelMax)
  const overspeed = useHud((s) => s.overspeed)
  const broken = useHud((s) => s.broken)
  const outOfFuel = useHud((s) => s.outOfFuel)
  const gearBroken = useHud((s) => s.gearBroken)
  const gearUp = useHud((s) => s.gearUp)
  const oobSeconds = useHud((s) => s.oobSeconds)

  const fuelPct = fuelMax > 0 ? Math.max(0, Math.min(1, fuel / fuelMax)) : 0
  const fuelColor = fuelPct > 0.3 ? '#5bd06a' : fuelPct > 0.12 ? '#e0a23a' : '#d8423a'

  return (
    <div style={styles.root}>
      {/* Alertes centrales */}
      <div style={styles.alerts}>
        {oobSeconds !== null && (
          <div style={{ ...styles.alert, ...styles.alertBad }}>
            ZONE INTERDITE — DEMI-TOUR ({Math.ceil(oobSeconds)} s)
          </div>
        )}
        {broken && <div style={{ ...styles.alert, ...styles.alertBad }}>AILE CASSÉE — appuyez sur R</div>}
        {!broken && overspeed && <div style={{ ...styles.alert, ...styles.alertWarn }}>⚠ SURVITESSE STRUCTURELLE</div>}
        {!broken && outOfFuel && <div style={{ ...styles.alert, ...styles.alertWarn }}>PANNE SÈCHE</div>}
        {!broken && gearBroken && (
          <div style={{ ...styles.alert, ...styles.alertWarn }}>TRAIN CASSÉ — R pour réparer</div>
        )}
      </div>

      {/* Bandeau bas */}
      <div style={styles.bottom}>
        <div style={styles.gauge}>
          <span style={styles.label}>FUEL</span>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${fuelPct * 100}%`, background: fuelColor }} />
          </div>
        </div>

        <div style={styles.readouts}>
          {gearUp && (
            <div style={styles.readout}>
              <span style={styles.label}>TRAIN</span>
              <span style={{ ...styles.value, fontSize: 16, color: '#9fb0bd' }}>RENTRÉ</span>
            </div>
          )}
          <Readout label="SPEED" value={Math.round(speed)} unit="m/s" warn={overspeed} />
          <Readout label="ALT" value={Math.max(0, Math.round(altitude))} unit="m" />
        </div>
      </div>
    </div>
  )
}

function Readout({
  label,
  value,
  unit,
  warn,
}: {
  label: string
  value: number
  unit: string
  warn?: boolean
}) {
  return (
    <div style={styles.readout}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, color: warn ? '#ff5a4d' : '#eef3f6' }}>
        {String(value).padStart(4, '0')}
        <span style={styles.unit}>{unit}</span>
      </span>
    </div>
  )
}

const panel = 'rgba(18, 24, 32, 0.55)'

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    userSelect: 'none',
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    zIndex: 10,
  },
  alerts: {
    position: 'absolute',
    top: '8%',
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  alert: {
    padding: '8px 18px',
    borderRadius: 8,
    fontWeight: 700,
    letterSpacing: 1,
    backdropFilter: 'blur(4px)',
  },
  alertWarn: { background: 'rgba(224, 162, 58, 0.9)', color: '#1a1208' },
  alertBad: { background: 'rgba(216, 66, 58, 0.92)', color: '#fff' },
  bottom: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 22,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 24,
  },
  gauge: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 240,
    background: panel,
    padding: '10px 14px',
    borderRadius: 10,
  },
  barTrack: {
    width: '100%',
    height: 14,
    borderRadius: 7,
    background: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 7, transition: 'width 120ms linear, background 200ms' },
  readouts: { display: 'flex', gap: 14 },
  readout: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    background: panel,
    padding: '10px 16px',
    borderRadius: 10,
  },
  label: { fontSize: 11, letterSpacing: 2, color: '#9fb0bd', fontWeight: 600 },
  value: { fontSize: 26, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  unit: { fontSize: 12, marginLeft: 6, color: '#9fb0bd', fontWeight: 600 },
}
