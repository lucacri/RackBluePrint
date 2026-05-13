import React from 'react'
import { useApp } from '../state/AppContext'
import { useModal } from '../state/UIContext'
import { CAT_COLORS, CAT_NAMES, PORT_LBL, UNITS_LBL } from '../data/constants'
import { rackSummary, findRow, uid } from '../state/helpers'

const PWR_TYPES = ['passive', 'cord', 'poe', 'brick', 'usb']
const PWR_LABELS = { passive: 'Passive', cord: 'Outlet', poe: 'PoE', brick: 'Brick', usb: 'USB' }

// ── Rack summary view (nothing selected) ─────────────────────────────────────

function RackSummary() {
  const { state, dispatch } = useApp()
  const { uU, freeU, w, pct } = rackSummary(state)
  const barColor = pct >= 90 ? '#c0392b' : pct >= 70 ? '#e67e22' : '#27ae60'

  return (
    <div className="props-body">
      <div className="props-section-title">Rack summary</div>
      <div className="props-summary-row">
        <span className="props-label">Name</span>
        <span className="props-value">{state.rackName}</span>
      </div>
      <div className="props-summary-row">
        <span className="props-label">Size</span>
        <span className="props-value">{state.rackSize}U</span>
      </div>
      <div className="props-summary-row">
        <span className="props-label">Used</span>
        <span className="props-value">{uU}U</span>
      </div>
      <div className="props-summary-row">
        <span className="props-label">Free</span>
        <span className="props-value">{freeU}U</span>
      </div>

      <div className="props-section-title" style={{ marginTop: 16 }}>Power</div>
      <div className="props-summary-row">
        <span className="props-label">Draw</span>
        <span className="props-value">{w}W</span>
      </div>
      <div className="props-summary-row">
        <span className="props-label">Capacity</span>
        <span className="props-value">
          <input
            className="props-pwr-input"
            type="number"
            min={0}
            step={100}
            value={state.powerCap}
            onChange={e => dispatch({ type: 'SET_POWER_CAP', cap: +e.target.value })}
          />W
        </span>
      </div>

      {state.powerCap > 0 && (
        <div className="power-bar-wrap">
          <div className="power-bar-track">
            <div className="power-bar-fill" style={{ width: pct + '%', background: barColor }} />
          </div>
          <span className="power-bar-pct">{pct}%</span>
        </div>
      )}

      {Object.keys(state.devices).length > 0 && (
        <>
          <div className="props-section-title" style={{ marginTop: 16 }}>Devices in rack</div>
          <div className="props-device-list">
            {Object.values(state.devices).map(dev => {
              const { bg, fg } = CAT_COLORS[dev.cat] ?? CAT_COLORS.custom
              const row = findRow(state.slots, dev.id)
              return (
                <div
                  key={dev.id}
                  className="props-dev-row"
                  style={{ background: bg, color: fg }}
                  onClick={() => dispatch({ type: 'SELECT_DEVICE', deviceId: dev.id })}
                >
                  <span className="props-dev-name">{dev.name}</span>
                  <span className="props-dev-pos">U{row + 1}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {Object.keys(state.devices).length === 0 && (
        <div className="props-empty">Drag devices from the library onto the rack to get started.</div>
      )}
    </div>
  )
}

// ── Device detail — inline edit form ─────────────────────────────────────────

function DeviceDetail({ device }) {
  const { dispatch } = useApp()
  const { openConfirm } = useModal()
  const { bg, fg } = CAT_COLORS[device.cat] ?? CAT_COLORS.custom

  function set(fields) {
    dispatch({ type: 'UPDATE_DEVICE', deviceId: device.id, fields })
  }

  function setPwr(fields) {
    set({ pwr: { ...device.pwr, ...fields } })
  }

  function addPort() {
    set({ ports: [...(device.ports ?? []), { _key: uid(), t: 'ethernet', n: 1, s: '' }] })
  }

  function removePort(idx) {
    set({ ports: device.ports.filter((_, i) => i !== idx) })
  }

  function updatePort(idx, field, value) {
    set({
      ports: device.ports.map((p, i) =>
        i === idx ? { ...p, [field]: field === 'n' ? +value : value } : p
      )
    })
  }

  function handleDelete() {
    openConfirm(
      `Remove "${device.name}" from the rack?`,
      () => dispatch({ type: 'DELETE_DEVICE', deviceId: device.id })
    )
  }

  const pwrType = device.pwr?.type ?? 'passive'

  return (
    <div className="props-body">
      {/* Colour-coded header */}
      <div className="props-dev-header" style={{ background: bg, color: fg }}>
        <span className="props-dev-header-cat">{CAT_NAMES[device.cat] ?? device.cat}</span>
        <span className="props-dev-header-name">{device.name}</span>
      </div>

      {/* Name */}
      <div className="props-field">
        <label className="props-field-label">Name</label>
        <input
          className="props-field-input"
          type="text"
          value={device.name}
          onChange={e => set({ name: e.target.value })}
        />
      </div>

      {/* Category */}
      <div className="props-field">
        <label className="props-field-label">Category</label>
        <div className="props-cat-grid">
          {Object.entries(CAT_COLORS).map(([cat, { bg: cbg, fg: cfg }]) => (
            <button
              key={cat}
              className={'props-cat-btn' + (device.cat === cat ? ' is-selected' : '')}
              style={device.cat === cat ? { background: cbg, color: cfg, borderColor: cfg } : {}}
              onClick={() => set({ cat })}
              title={CAT_NAMES[cat] ?? cat}
            >
              {CAT_NAMES[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {/* Power */}
      <div className="props-field">
        <label className="props-field-label">Power</label>
        <div className="props-pwr-grid">
          {PWR_TYPES.map(pt => (
            <button
              key={pt}
              className={'props-pwr-btn' + (pwrType === pt ? ' is-selected' : '')}
              onClick={() => setPwr({ type: pt })}
            >
              {PWR_LABELS[pt]}
            </button>
          ))}
        </div>
        {pwrType !== 'passive' && (
          <div className="props-pwr-row">
            <input
              className="props-field-input"
              type="number"
              min={0}
              placeholder="Watts"
              value={device.pwr?.w ?? 0}
              onChange={e => setPwr({ w: +e.target.value })}
              style={{ width: 72 }}
            />
            <span className="props-label" style={{ alignSelf: 'center' }}>W</span>
            <input
              className="props-field-input"
              type="text"
              placeholder="Connector"
              value={device.pwr?.conn ?? ''}
              onChange={e => setPwr({ conn: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
        )}
      </div>

      {/* Ports */}
      <div className="props-field">
        <div className="props-ports-header">
          <label className="props-field-label">Ports</label>
          <button className="btn btn-sm" onClick={addPort}>+ Add</button>
        </div>
        {(!device.ports || device.ports.length === 0) && (
          <div className="props-muted" style={{ fontSize: 11 }}>No ports defined.</div>
        )}
        {device.ports?.map((p, i) => (
          <div key={i} className="props-port-edit-row">
            <select
              className="props-field-input"
              value={p.t}
              onChange={e => updatePort(i, 't', e.target.value)}
              style={{ flex: 1, fontSize: 11, padding: '3px 5px' }}
            >
              {['ethernet','sfp','qsfp','usb-a','usb-c','hdmi','dp','serial','audio','ipmi'].map(pt => (
                <option key={pt} value={pt}>{PORT_LBL[pt] ?? pt}</option>
              ))}
            </select>
            <input
              className="props-field-input"
              type="number"
              min={1}
              max={96}
              value={p.n}
              onChange={e => updatePort(i, 'n', e.target.value)}
              style={{ width: 40, textAlign: 'right', fontSize: 11, padding: '3px 4px' }}
            />
            <input
              className="props-field-input"
              type="text"
              placeholder="speed"
              value={p.s ?? ''}
              onChange={e => updatePort(i, 's', e.target.value)}
              style={{ width: 54, fontSize: 11, padding: '3px 4px' }}
            />
            <button
              className="props-port-remove"
              onClick={() => removePort(i)}
              title="Remove"
            >×</button>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="props-field">
        <label className="props-field-label">Notes</label>
        <textarea
          className="props-field-input props-notes"
          rows={2}
          value={device.notes ?? ''}
          onChange={e => set({ notes: e.target.value })}
          placeholder="Optional notes…"
        />
      </div>

      {/* Actions */}
      <div className="props-actions">
        <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={handleDelete}>
          Remove from rack
        </button>
      </div>
    </div>
  )
}

// ── PropertiesPanel ───────────────────────────────────────────────────────────

export default function PropertiesPanel() {
  const { state } = useApp()
  const selDev = state.selId ? state.devices[state.selId] : null

  return (
    <aside className="panel-right">
      <div className="panel-head">
        {selDev ? 'Properties' : 'Rack info'}
      </div>
      {selDev ? <DeviceDetail device={selDev} /> : <RackSummary />}
    </aside>
  )
}
