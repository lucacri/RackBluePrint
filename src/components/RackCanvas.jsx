import React from 'react'
import { useApp } from '../state/AppContext'
import { useDrag } from '../state/UIContext'
import { useToast } from '../state/UIContext'
import { CAT_COLORS, MAX_U, PORT_LBL } from '../data/constants'
import { canPlace, canPlaceOnShelf, findRow, deviceFromLib, getEffectiveLib, pwrBadge } from '../state/helpers'

// All port groups as a compact string: "24×RJ45 1G · 4×SFP+"
function portDetail(ports) {
  if (!ports?.length) return ''
  return ports
    .slice(0, 3)
    .map(p => `${p.n}×${PORT_LBL[p.t] ?? p.t}${p.s ? ' ' + p.s : ''}`)
    .join(' · ')
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Find a shelved device object by id, scanning all shelves */
function findShelved(devices, devId) {
  for (const d of Object.values(devices)) {
    const hit = d.shelved?.find(it => it.id === devId)
    if (hit) return { dev: hit, shelfId: d.id }
  }
  return null
}

/** Resolve the dragged device object from any source */
function resolveDragDev(drag, state) {
  if (!drag) return null
  if (drag.src === 'lib') {
    const lib = getEffectiveLib(state).find(l => l.libId === drag.libId)
    return lib ? { ...lib, id: '__prev__', ...(lib.cat === 'shelf' ? { shelved: [] } : {}) } : null
  }
  if (drag.src === 'shelf') {
    return findShelved(state.devices, drag.devId)?.dev ?? null
  }
  return state.devices[drag.devId] ?? null
}

// ── ShelfItem ─────────────────────────────────────────────────────────────────

function ShelfItem({ dev, shelfId, dispatch }) {
  const { setDrag } = useDrag()
  const { bg, fg } = CAT_COLORS[dev.cat] ?? CAT_COLORS.custom
  const pb = pwrBadge(dev.pwr)

  function handleDragStart(e) {
    e.stopPropagation()
    setDrag({ src: 'shelf', devId: dev.id, shelfId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', dev.id)
    setTimeout(() => { if (e.target) e.target.style.opacity = '.25' }, 0)
  }
  function handleDragEnd(e) {
    if (e.target) e.target.style.opacity = ''
    setDrag(null)
  }

  return (
    <div
      className="shelf-item"
      style={{ flex: dev.u, background: bg, color: fg }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={dev.name}
    >
      <span className="shelf-item-name">{dev.name}</span>
      {pb && <span className="dev-badge" style={{ fontSize: 9 }}>{pb}</span>}
      <button
        className="shelf-item-remove"
        onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_FROM_SHELF', shelfId, deviceId: dev.id }) }}
        title="Remove from shelf"
      >×</button>
    </div>
  )
}

// ── ShelfInner ────────────────────────────────────────────────────────────────

function ShelfInner({ shelf }) {
  const { drag, setDrag } = useDrag()
  const { state, dispatch } = useApp()
  const toast = useToast()

  function previewDev() { return resolveDragDev(drag, state) }

  function dropOk(ignoreId) {
    if (!drag) return false
    const dev = previewDev()
    if (!dev) return false
    if (dev.uH > 1 || dev.cat === 'shelf') return false
    return canPlaceOnShelf(shelf, dev, ignoreId)
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    const ignoreId = drag?.src === 'shelf' && drag.shelfId === shelf.id ? drag.devId : null
    const ok = dropOk(ignoreId)
    e.currentTarget.dataset.dropState = ok ? 'valid' : 'invalid'
    e.dataTransfer.dropEffect = ok ? 'copy' : 'none'
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.dataset.dropState = ''
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.dataset.dropState = ''
    if (!drag) return

    let dev

    if (drag.src === 'lib') {
      const lib = getEffectiveLib(state).find(l => l.libId === drag.libId)
      if (!lib) return
      dev = deviceFromLib(lib)
      if (dev.uH > 1 || dev.cat === 'shelf') { toast('Cannot place here'); return }
    } else if (drag.src === 'shelf') {
      if (drag.shelfId === shelf.id) { setDrag(null); return }  // same shelf, no-op
      const hit = findShelved(state.devices, drag.devId)
      if (!hit) return
      dev = hit.dev
      dispatch({ type: 'LIFT_FROM_SHELF', shelfId: drag.shelfId, deviceId: dev.id })
    } else {
      // from rack row
      dev = state.devices[drag.devId]
      if (!dev || dev.uH > 1 || dev.cat === 'shelf') { toast('Cannot place here'); return }
      dispatch({ type: 'LIFT_DEVICE', deviceId: dev.id })
    }

    // Re-compute shelf without the item we just lifted (for accurate free-space check)
    const freshShelf = drag.src === 'shelf'
      ? { ...shelf, shelved: (shelf.shelved ?? []).filter(it => it.id !== dev.id) }
      : shelf

    if (!canPlaceOnShelf(freshShelf, dev)) {
      if (drag.src === 'rack')  dispatch({ type: 'PLACE_DEVICE', device: dev, rowIndex: drag.fromRow })
      if (drag.src === 'shelf') dispatch({ type: 'PLACE_ON_SHELF', shelfId: drag.shelfId, device: dev })
      toast('No room on shelf'); return
    }

    dispatch({ type: 'PLACE_ON_SHELF', shelfId: shelf.id, device: dev })
    setDrag(null)
  }

  const usedU  = (shelf.shelved ?? []).reduce((s, it) => s + it.u, 0)
  const remain = MAX_U - usedU

  return (
    <div
      className="shelf-inner"
      data-drop-state=""
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {(shelf.shelved ?? []).map(it => (
        <ShelfItem key={it.id} dev={it} shelfId={shelf.id} dispatch={dispatch} />
      ))}
      {remain > 0 && (
        <div className="shelf-empty-seg" style={{ flex: remain }} />
      )}
    </div>
  )
}

// ── ShelfTile ─────────────────────────────────────────────────────────────────

function ShelfTile({ device, units, isSelected, isMultiU, onSelect }) {
  const { setDrag } = useDrag()
  const { state } = useApp()

  const cls = [
    'dev-tile',
    'shelf-tile',
    isMultiU && 'multi-u-tile',
    isSelected && 'is-selected',
  ].filter(Boolean).join(' ')

  const style = {
    flex: units,
    ...(isMultiU ? { '--span': device.uH } : {}),
  }

  function handleDragStart(e) {
    const fromRow = findRow(state.slots, device.id)
    setDrag({ src: 'rack', devId: device.id, fromRow })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', device.id)
    setTimeout(() => { if (e.target) e.target.style.opacity = '.25' }, 0)
  }
  function handleDragEnd(e) {
    if (e.target) e.target.style.opacity = ''
    setDrag(null)
  }

  return (
    <div
      className={cls}
      style={style}
      onClick={e => { e.stopPropagation(); onSelect(device.id) }}
      title={device.name}
    >
      {/* Narrow label strip — grab here to drag the whole shelf */}
      <div
        className="shelf-label"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {device.name}
      </div>
      <ShelfInner shelf={device} />
    </div>
  )
}

// ── DeviceTile ────────────────────────────────────────────────────────────────

function DeviceTile({ device, units, isSelected, isMultiU, onSelect }) {
  const { setDrag } = useDrag()
  const { state } = useApp()
  const { bg, fg } = CAT_COLORS[device.cat] ?? CAT_COLORS.custom
  const pb      = pwrBadge(device.pwr)
  const detail  = portDetail(device.ports)
  const watts   = device.pwr?.w > 0 ? `${device.pwr.w}W` : null

  const cls = [
    'dev-tile',
    isMultiU && 'multi-u-tile',
    isSelected && 'is-selected',
  ].filter(Boolean).join(' ')

  const style = {
    flex: units,
    background: bg,
    color: fg,
    ...(isMultiU ? { '--span': device.uH } : {}),
  }

  function handleDragStart(e) {
    e.stopPropagation()
    const fromRow = findRow(state.slots, device.id)
    setDrag({ src: 'rack', devId: device.id, fromRow })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', device.id)
    setTimeout(() => { if (e.target) e.target.style.opacity = '.25' }, 0)
  }

  function handleDragEnd(e) {
    if (e.target) e.target.style.opacity = ''
    setDrag(null)
  }

  return (
    <div
      className={cls}
      style={style}
      draggable
      onClick={e => { e.stopPropagation(); onSelect(device.id) }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={device.name}
    >
      {/* Row 1 — always visible */}
      <div className="dev-row1">
        <span className="dev-name">{device.name}</span>
        {pb && <span className="dev-badge">{pb}</span>}
      </div>

      {/* Row 2 — only rendered when row height gives enough space */}
      {(detail || watts) && (
        <div className="dev-row2">
          {detail && <span className="dev-detail">{detail}</span>}
          {watts  && <span className="dev-watts">{watts}</span>}
        </div>
      )}
    </div>
  )
}

// ── RackRow ───────────────────────────────────────────────────────────────────

function RackRow({ rowIndex, slot, devices, selId, onSelect }) {
  const { drag, setDrag } = useDrag()
  const { state, dispatch } = useApp()
  const toast = useToast()

  function getPreviewDev() {
    return resolveDragDev(drag, state)
  }

  function handleDragOver(e) {
    e.preventDefault()
    const dev = getPreviewDev()
    if (!dev) return
    const ignoreId = drag.src === 'rack' ? drag.devId : null
    const same = drag.src === 'rack' && drag.fromRow === rowIndex
    const ok = !same && canPlace(state.slots, state.rackSize, rowIndex, dev, ignoreId)
    e.currentTarget.dataset.dropState = same ? '' : ok ? 'valid' : 'invalid'
    e.dataTransfer.dropEffect = ok ? 'copy' : 'none'
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.dataset.dropState = ''
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.currentTarget.dataset.dropState = ''
    if (!drag) return

    if (drag.src === 'lib') {
      const lib = getEffectiveLib(state).find(l => l.libId === drag.libId)
      if (!lib) return
      const dev = deviceFromLib(lib)
      if (!canPlace(state.slots, state.rackSize, rowIndex, dev)) {
        toast('Cannot place here'); return
      }
      dispatch({ type: 'PLACE_DEVICE', device: dev, rowIndex })

    } else if (drag.src === 'rack') {
      const dev = state.devices[drag.devId]
      if (!dev || drag.fromRow === rowIndex) return
      dispatch({ type: 'LIFT_DEVICE', deviceId: dev.id })
      const updatedSlots = state.slots.map(s => ({
        ...s,
        items:  s.items.filter(it => it.id !== dev.id),
        spanOf: s.spanOf?.id === dev.id ? null : s.spanOf,
      }))
      if (!canPlace(updatedSlots, state.rackSize, rowIndex, dev)) {
        dispatch({ type: 'PLACE_DEVICE', device: dev, rowIndex: drag.fromRow })
        toast('Cannot place here'); return
      }
      dispatch({ type: 'PLACE_DEVICE', device: dev, rowIndex })

    } else if (drag.src === 'shelf') {
      const hit = findShelved(state.devices, drag.devId)
      if (!hit) return
      const { dev, shelfId } = hit
      if (!canPlace(state.slots, state.rackSize, rowIndex, dev)) {
        toast('Cannot place here'); return
      }
      dispatch({ type: 'LIFT_FROM_SHELF', shelfId, deviceId: dev.id })
      dispatch({ type: 'PLACE_DEVICE', device: dev, rowIndex })
    }

    setDrag(null)
  }

  if (slot.spanOf) {
    return <div className="rack-span" data-row={rowIndex} />
  }

  const usedUnits = slot.items.reduce((s, it) => s + it.u, 0)
  const remaining = MAX_U - usedUnits

  return (
    <div
      className="rack-row"
      data-row={rowIndex}
      data-drop-state=""
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => onSelect(null)}
    >
      {slot.items.map(it => {
        const dev = devices[it.id]
        if (!dev) return null
        if (dev.cat === 'shelf') {
          return (
            <ShelfTile
              key={dev.id}
              device={dev}
              units={it.u}
              isSelected={selId === dev.id}
              isMultiU={dev.uH > 1}
              onSelect={onSelect}
            />
          )
        }
        return (
          <DeviceTile
            key={dev.id}
            device={dev}
            units={it.u}
            isSelected={selId === dev.id}
            isMultiU={dev.uH > 1}
            onSelect={onSelect}
          />
        )
      })}
      {remaining > 0 && (
        <div className="empty-seg" style={{ flex: remaining }} data-row={rowIndex} />
      )}
    </div>
  )
}

// ── RackCanvas ────────────────────────────────────────────────────────────────

export default function RackCanvas() {
  const { state, dispatch } = useApp()

  function handleSelect(id) {
    dispatch({ type: 'SELECT_DEVICE', deviceId: id })
  }

  return (
    <main className="panel-center">
      <div className="rack-outer">
        <div className="u-col">
          {Array.from({ length: state.rackSize }, (_, i) => (
            <div key={i} className="u-num">{i + 1}</div>
          ))}
        </div>
        <div className="rack-chassis">
          <div className="rack-rail" />
          <div className="rack-slots">
            {state.slots.map((slot, i) => (
              <RackRow
                key={i}
                rowIndex={i}
                slot={slot}
                devices={state.devices}
                selId={state.selId}
                onSelect={handleSelect}
              />
            ))}
          </div>
          <div className="rack-rail bot" />
        </div>
      </div>
    </main>
  )
}
