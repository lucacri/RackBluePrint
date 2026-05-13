import React, { useEffect, useRef } from 'react'
import { useApp } from '../state/AppContext'
import { useModal } from '../state/UIContext'
import { useToast } from '../state/UIContext'
import { RACK_SIZES } from '../data/constants'
import { findRow, mkSlot } from '../state/helpers'

export default function Toolbar() {
  const { state, dispatch } = useApp()
  const { openDevModal, openConfirm } = useModal()
  const toast = useToast()
  const importRef = useRef(null)

  useEffect(() => {
    document.title = (state.rackName || 'Rack') + ' — Rackitect'
  }, [state.rackName])

  function handleSizeChange(e) {
    const newSize = +e.target.value
    if (newSize === state.rackSize) return
    const atRisk = Object.values(state.devices).filter(d => {
      const r = findRow(state.slots, d.id)
      return r >= 0 && r + d.uH > newSize
    })
    const doResize = () => {
      atRisk.forEach(d => dispatch({ type: 'DELETE_DEVICE', deviceId: d.id }))
      dispatch({ type: 'SET_RACK_SIZE', newSize })
    }
    if (atRisk.length) {
      openConfirm(
        `Shrinking to ${newSize}U will remove: ${atRisk.map(d => d.name).join(', ')}. Continue?`,
        doResize
      )
      e.target.value = state.rackSize
    } else {
      doResize()
    }
  }

  function handleClear() {
    if (!Object.keys(state.devices).length) return
    openConfirm('Remove all devices from the rack?', () => dispatch({ type: 'CLEAR_RACK' }))
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  function handleExport() {
    const filename = (state.rackName || 'rack').replace(/[^a-z0-9_\-]/gi, '_') + '.json'
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${filename}`)
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  function handleImportFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-imported

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result)

        // Basic validation
        if (typeof parsed.rackSize !== 'number' || !parsed.devices) {
          toast('Invalid RackBlueprint file'); return
        }

        // Ensure slots array matches rackSize (safety net for hand-edited files)
        if (!Array.isArray(parsed.slots) || parsed.slots.length !== parsed.rackSize) {
          parsed.slots   = Array.from({ length: parsed.rackSize }, mkSlot)
          parsed.devices = {}
          parsed.selId   = null
        }

        openConfirm(
          `Load "${parsed.rackName || 'rack'}"? This will replace your current layout.`,
          () => dispatch({ type: 'LOAD', payload: parsed })
        )
      } catch {
        toast('Could not read file — is it a valid JSON export?')
      }
    }
    reader.readAsText(file)
  }

  return (
    <header className="toolbar">
      <span className="logo">Rack<span>itect</span></span>
      <div className="tb-sep" />
      <input
        className="rack-name-input"
        type="text"
        value={state.rackName}
        spellCheck={false}
        autoComplete="off"
        onChange={e => dispatch({ type: 'SET_RACK_NAME', name: e.target.value })}
      />
      <span className="tb-label">Size</span>
      <select
        className="rack-size-select"
        value={state.rackSize}
        onChange={handleSizeChange}
      >
        {RACK_SIZES.map(s => (
          <option key={s} value={s}>{s}U</option>
        ))}
      </select>
      <div className="tb-spacer" />

      {/* Hidden file input for import */}
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      <button className="btn btn-sm" onClick={() => importRef.current?.click()} title="Import a saved .json layout">
        ↑ Import
      </button>
      <button className="btn btn-sm" onClick={handleExport} title="Export layout as .json">
        ↓ Export
      </button>
      <div className="tb-sep" />
      <button className="btn btn-primary btn-sm" onClick={() => openDevModal(null)}>
        + New device
      </button>
      <button className="btn btn-sm" onClick={handleClear}>
        Clear rack
      </button>
    </header>
  )
}
