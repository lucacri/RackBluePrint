import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { mkSlot } from './helpers'

// ── Initial state ─────────────────────────────────────────────────────────────

const INIT = {
  rackName:     'Rack 1',
  rackSize:     12,
  powerCap:     2000,
  devices:      {},    // id -> device
  slots:        Array.from({ length: 12 }, mkSlot),
  selId:        null,
  libOverrides: {},    // libId -> override fields
  customLib:    [],    // user-created library entries
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {

    case 'LOAD':
      return { ...INIT, ...action.payload }

    case 'SET_RACK_NAME':
      return { ...state, rackName: action.name }

    case 'SET_RACK_SIZE': {
      const { newSize } = action
      const old = state.slots
      return {
        ...state,
        rackSize: newSize,
        slots: Array.from({ length: newSize }, (_, i) => old[i] ?? mkSlot()),
      }
    }

    case 'SET_POWER_CAP':
      return { ...state, powerCap: action.cap }

    case 'PLACE_DEVICE': {
      const { device, rowIndex } = action
      const slots = state.slots.map(s => ({ ...s, items: [...s.items] }))
      slots[rowIndex].items.push({ id: device.id, u: device.u })
      for (let i = 1; i < device.uH; i++) {
        slots[rowIndex + i] = { ...slots[rowIndex + i], spanOf: { id: device.id, offset: i } }
      }
      return { ...state, devices: { ...state.devices, [device.id]: device }, slots }
    }

    case 'LIFT_DEVICE': {
      // Remove from slots only — keep in state.devices (used when moving)
      const { deviceId } = action
      const slots = state.slots.map(s => ({
        ...s,
        items:  s.items.filter(it => it.id !== deviceId),
        spanOf: s.spanOf?.id === deviceId ? null : s.spanOf,
      }))
      return { ...state, slots }
    }

    case 'DELETE_DEVICE': {
      const { deviceId } = action
      const slots = state.slots.map(s => ({
        ...s,
        items:  s.items.filter(it => it.id !== deviceId),
        spanOf: s.spanOf?.id === deviceId ? null : s.spanOf,
      }))
      const devices = { ...state.devices }
      delete devices[deviceId]
      return {
        ...state,
        devices,
        slots,
        selId: state.selId === deviceId ? null : state.selId,
      }
    }

    case 'SELECT_DEVICE':
      return { ...state, selId: action.deviceId }

    case 'UPDATE_DEVICE':
      return {
        ...state,
        devices: {
          ...state.devices,
          [action.deviceId]: { ...state.devices[action.deviceId], ...action.fields },
        },
      }

    case 'ADD_CUSTOM_LIB':
      return { ...state, customLib: [...state.customLib, action.entry] }

    case 'UPDATE_LIB': {
      const { libId, fields, isBuiltin } = action
      let libOverrides = state.libOverrides
      let customLib    = state.customLib
      if (isBuiltin) {
        libOverrides = { ...libOverrides, [libId]: fields }
      } else {
        customLib = customLib.map(l => l.libId === libId ? { ...l, ...fields } : l)
      }
      // Propagate display changes to any already-placed instances
      const devices = Object.fromEntries(
        Object.entries(state.devices).map(([id, dev]) =>
          dev.libId === libId
            ? [id, { ...dev, name: fields.name, cat: fields.cat, pwr: fields.pwr, ports: fields.ports }]
            : [id, dev]
        )
      )
      return { ...state, libOverrides, customLib, devices }
    }

    // ── Shelf actions ─────────────────────────────────────────────────────────

    case 'PLACE_ON_SHELF': {
      // device: full object (may or may not already be in state.devices)
      const { shelfId, device } = action
      const shelf = state.devices[shelfId]
      if (!shelf) return state
      const newDevices = { ...state.devices }
      if (newDevices[device.id]) delete newDevices[device.id]  // pull out of top-level if present
      newDevices[shelfId] = { ...shelf, shelved: [...(shelf.shelved ?? []), device] }
      return {
        ...state,
        devices: newDevices,
        selId: state.selId === device.id ? null : state.selId,
      }
    }

    case 'LIFT_FROM_SHELF': {
      // Removes from shelf's shelved[]; caller re-places via PLACE_DEVICE / PLACE_ON_SHELF
      const { shelfId, deviceId } = action
      const shelf = state.devices[shelfId]
      if (!shelf) return state
      return {
        ...state,
        devices: {
          ...state.devices,
          [shelfId]: { ...shelf, shelved: (shelf.shelved ?? []).filter(it => it.id !== deviceId) },
        },
      }
    }

    case 'REMOVE_FROM_SHELF': {
      // Delete a shelved item without re-placing it
      const { shelfId, deviceId } = action
      const shelf = state.devices[shelfId]
      if (!shelf) return state
      return {
        ...state,
        devices: {
          ...state.devices,
          [shelfId]: { ...shelf, shelved: (shelf.shelved ?? []).filter(it => it.id !== deviceId) },
        },
      }
    }

    case 'CLEAR_RACK':
      return {
        ...state,
        devices: {},
        slots:   Array.from({ length: state.rackSize }, mkSlot),
        selId:   null,
      }

    default:
      return state
  }
}

// ── Context + Provider ────────────────────────────────────────────────────────

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INIT)

  // Skip the very first save: on mount both effects fire in the same flush,
  // so the save effect would run with the blank INIT state and overwrite
  // localStorage before the load effect dispatches the persisted data.
  const isMounted = useRef(false)

  // Load persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rackitect_v1')
      if (!saved) return
      const parsed = JSON.parse(saved)
      // Safety: ensure slots matches rackSize
      if (!Array.isArray(parsed.slots) || parsed.slots.length !== parsed.rackSize) {
        parsed.slots   = Array.from({ length: parsed.rackSize ?? 12 }, mkSlot)
        parsed.devices = {}
        parsed.selId   = null
      }
      dispatch({ type: 'LOAD', payload: parsed })
    } catch (_) {}
  }, [])

  // Persist on every state change — but skip the initial render
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    try { localStorage.setItem('rackitect_v1', JSON.stringify(state)) } catch (_) {}
  }, [state])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
