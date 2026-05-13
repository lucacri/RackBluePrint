import { MAX_U, PORT_LBL } from '../data/constants'
import BUILTIN_LIBRARY from '../data/library'

let _uid = 0
export function uid() { return 'd' + Date.now().toString(36) + (++_uid) }

export function mkSlot() { return { items: [], spanOf: null } }

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function getEffectiveLib(state) {
  return [
    ...BUILTIN_LIBRARY.map(lib =>
      state.libOverrides?.[lib.libId] ? { ...lib, ...state.libOverrides[lib.libId] } : lib
    ),
    ...(state.customLib ?? []),
  ]
}

export function deviceFromLib(lib) {
  return {
    id: uid(),
    libId: lib.libId,
    name: lib.name,
    cat: lib.cat,
    uH: lib.uH,
    u: lib.u,
    pwr: { ...lib.pwr },
    ports: lib.ports.map(p => ({ ...p })),
    notes: '',
    ...(lib.cat === 'shelf' ? { shelved: [] } : {}),
  }
}

// ── Placement validation ──────────────────────────────────────────────────────

function rowFreeUnits(slots, ri, ignoreId) {
  const slot = slots[ri]
  if (!slot) return 0
  if (slot.spanOf) return slot.spanOf.id === ignoreId ? MAX_U : 0
  return MAX_U - slot.items.filter(it => it.id !== ignoreId).reduce((s, it) => s + it.u, 0)
}

function rowHasFullDevice(slots, ri, ignoreId) {
  const slot = slots[ri]
  if (!slot) return true
  return slot.items.filter(it => it.id !== ignoreId).some(it => it.u === MAX_U)
}

// Returns true if `dev` fits on `shelf` (shelves only hold single-U items)
export function canPlaceOnShelf(shelf, dev, ignoreId = null) {
  if (!shelf || shelf.cat !== 'shelf') return false
  if (dev.uH > 1)       return false  // multi-U can't sit on a shelf
  if (dev.cat === 'shelf') return false  // no nested shelves
  const used = (shelf.shelved ?? [])
    .filter(it => it.id !== ignoreId)
    .reduce((s, it) => s + it.u, 0)
  return used + dev.u <= MAX_U
}

export function canPlace(slots, rackSize, ri, dev, ignoreId = null) {
  if (ri < 0 || ri + dev.uH > rackSize) return false
  for (let i = 0; i < dev.uH; i++) {
    const slot = slots[ri + i]
    if (!slot) return false
    if (slot.spanOf && slot.spanOf.id !== ignoreId) return false
    if (rowFreeUnits(slots, ri + i, ignoreId) < dev.u) return false
    if (rowHasFullDevice(slots, ri + i, ignoreId)) return false
  }
  return true
}

export function findRow(slots, id) {
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].items.some(it => it.id === id)) return i
  }
  return -1
}

export function findFirstSlot(state, dev) {
  for (let i = 0; i < state.rackSize; i++) {
    if (canPlace(state.slots, state.rackSize, i, dev)) return i
  }
  return -1
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function pwrBadge(pwr) {
  if (!pwr || pwr.type === 'passive') return ''
  if (pwr.type === 'poe') return 'PoE'
  if (pwr.type === 'brick') return 'Brick'
  return pwr.conn || pwr.type
}

export function portSummary(ports) {
  if (!ports?.length) return ''
  const p = ports[0]
  return `${p.n}×${PORT_LBL[p.t] ?? p.t}`
}

export function rackSummary(state) {
  let uU = 0, w = 0
  for (const dev of Object.values(state.devices)) {
    uU += dev.uH
    w  += dev.pwr?.w ?? 0
    // Also count power draw of items sitting on shelves
    for (const it of dev.shelved ?? []) {
      w += it.pwr?.w ?? 0
    }
  }
  const pct = state.powerCap > 0 ? Math.min(100, Math.round(w / state.powerCap * 100)) : 0
  return { uU, freeU: state.rackSize - uU, w, pct }
}
