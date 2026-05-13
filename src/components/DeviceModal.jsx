import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../state/AppContext'
import { useModal } from '../state/UIContext'
import { CAT_ORDER, CAT_NAMES, CAT_COLORS, PORT_LBL } from '../data/constants'
import { uid } from '../state/helpers'

const PWR_TYPES = [
  { key: 'passive', label: 'Passive' },
  { key: 'poe',     label: 'PoE' },
  { key: 'brick',   label: 'Brick' },
  { key: 'outlet',  label: 'Outlet' },
  { key: 'usb',     label: 'USB' },
]

const PORT_TYPES = ['ethernet', 'sfp', 'qsfp', 'usb-a', 'usb-c', 'hdmi', 'dp', 'serial', 'audio', 'ipmi']

const SIZE_OPTS = [
  { u: 6,  uH: 1, label: 'Full (1U)' },
  { u: 3,  uH: 1, label: 'Half (1U)' },
  { u: 2,  uH: 1, label: 'Third (1U)' },
  { u: 4,  uH: 1, label: '⅔ (1U)' },
  { u: 6,  uH: 2, label: 'Full (2U)' },
  { u: 6,  uH: 3, label: 'Full (3U)' },
  { u: 6,  uH: 4, label: 'Full (4U)' },
]

function mkPort() {
  return { _key: uid(), t: 'ethernet', n: 1, s: '' }
}

function blankForm(prefill, mode) {
  if (!prefill) {
    return {
      name:    '',
      cat:     'networking',
      u:       6,
      uH:      1,
      pwrType: 'passive',
      pwrConn: '',
      pwrW:    0,
      ports:   [],
      isNew:      true,
      isInstance: false,
      libId:      null,
      instanceId: null,
    }
  }
  return {
    name:    prefill.name ?? '',
    cat:     prefill.cat ?? 'networking',
    u:       prefill.u ?? 6,
    uH:      prefill.uH ?? 1,
    pwrType: prefill.pwr?.type ?? 'passive',
    pwrConn: prefill.pwr?.conn ?? '',
    pwrW:    prefill.pwr?.w ?? 0,
    ports:   (prefill.ports ?? []).map(p => ({ ...p, _key: uid() })),
    isNew:      false,
    isInstance: mode === 'instance',
    instanceId: mode === 'instance' ? prefill.id : null,
    libId:      prefill.libId ?? null,
    isBuiltin:  !!prefill.libId && !prefill._isCustom,
  }
}

export default function DeviceModal() {
  const { state, dispatch } = useApp()
  const { devModal, closeDevModal } = useModal()
  const dialogRef = useRef(null)

  const [form, setForm] = useState(null)

  useEffect(() => {
    if (devModal) {
      setForm(blankForm(devModal.prefill, devModal.mode))
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [devModal])

  if (!form && !devModal) {
    return <dialog ref={dialogRef} className="modal" />
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function addPort() {
    setForm(f => ({ ...f, ports: [...f.ports, mkPort()] }))
  }

  function removePort(key) {
    setForm(f => ({ ...f, ports: f.ports.filter(p => p._key !== key) }))
  }

  function updatePort(key, field, value) {
    setForm(f => ({
      ...f,
      ports: f.ports.map(p => p._key === key ? { ...p, [field]: field === 'n' ? +value : value } : p)
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return

    const pwr   = { type: form.pwrType, conn: form.pwrConn, w: +form.pwrW }
    const ports = form.ports.map(({ _key, ...rest }) => rest)

    if (form.isInstance) {
      // Edit only this placed device — library stays untouched
      dispatch({
        type: 'UPDATE_DEVICE',
        deviceId: form.instanceId,
        fields: { name: form.name.trim(), cat: form.cat, u: form.u, uH: form.uH, pwr, ports },
      })
    } else if (form.isNew) {
      // Create new library entry
      const entry = {
        libId:    uid(),
        name:     form.name.trim(),
        cat:      form.cat,
        u:        form.u,
        uH:       form.uH,
        pwr,
        ports,
        _isCustom: true,
      }
      dispatch({ type: 'ADD_CUSTOM_LIB', entry })
    } else {
      // Update existing library entry (propagates to all placed instances)
      dispatch({
        type: 'UPDATE_LIB',
        libId: form.libId,
        fields: {
          name:  form.name.trim(),
          cat:   form.cat,
          u:     form.u,
          uH:    form.uH,
          pwr,
          ports,
        },
        isBuiltin: form.isBuiltin,
      })
    }

    closeDevModal()
  }

  function handleBackdrop(e) {
    if (e.target === dialogRef.current) closeDevModal()
  }

  const sizeKey = `${form?.u ?? 6}-${form?.uH ?? 1}`

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClick={handleBackdrop}
      onClose={closeDevModal}
    >
      <form className="modal-form" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {form?.isNew ? 'New device' : form?.isInstance ? 'Edit this device' : 'Edit library entry'}
          </h2>
          <button type="button" className="modal-close" onClick={closeDevModal} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          {/* Name */}
          <div className="form-row">
            <label className="form-label">Name *</label>
            <input
              className="form-input"
              type="text"
              required
              autoFocus
              value={form?.name ?? ''}
              onChange={e => set('name', e.target.value)}
              placeholder="Device name"
            />
          </div>

          {/* Category */}
          <div className="form-row">
            <label className="form-label">Category</label>
            <div className="cat-grid">
              {CAT_ORDER.map(cat => {
                const { bg, fg } = CAT_COLORS[cat]
                const sel = form?.cat === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-btn ${sel ? 'is-selected' : ''}`}
                    style={sel ? { background: bg, color: fg, borderColor: fg } : {}}
                    onClick={() => set('cat', cat)}
                  >
                    {CAT_NAMES[cat] ?? cat}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Size */}
          <div className="form-row">
            <label className="form-label">Size</label>
            <div className="size-grid">
              {SIZE_OPTS.map(opt => {
                const key = `${opt.u}-${opt.uH}`
                const sel = sizeKey === key
                return (
                  <button
                    key={key}
                    type="button"
                    className={`size-btn ${sel ? 'is-selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, u: opt.u, uH: opt.uH }))}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Power */}
          <div className="form-row">
            <label className="form-label">Power</label>
            <div className="pwr-grid">
              {PWR_TYPES.map(pt => (
                <button
                  key={pt.key}
                  type="button"
                  className={`pwr-btn ${form?.pwrType === pt.key ? 'is-selected' : ''}`}
                  onClick={() => set('pwrType', pt.key)}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          {form?.pwrType !== 'passive' && (
            <div className="form-row form-row-inline">
              <div className="form-inline-group">
                <label className="form-label">Connector</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. C13, barrel"
                  value={form?.pwrConn ?? ''}
                  onChange={e => set('pwrConn', e.target.value)}
                />
              </div>
              <div className="form-inline-group">
                <label className="form-label">Watts</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={form?.pwrW ?? 0}
                  onChange={e => set('pwrW', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Ports */}
          <div className="form-row">
            <div className="ports-header">
              <label className="form-label">Ports</label>
              <button type="button" className="btn btn-sm" onClick={addPort}>+ Add port</button>
            </div>

            {form?.ports.length === 0 && (
              <div className="ports-empty">No ports defined.</div>
            )}

            <div className="port-rows">
              {form?.ports.map(p => (
                <div key={p._key} className="port-form-row">
                  <select
                    className="form-select"
                    value={p.t}
                    onChange={e => updatePort(p._key, 't', e.target.value)}
                  >
                    {PORT_TYPES.map(pt => (
                      <option key={pt} value={pt}>{PORT_LBL[pt] ?? pt}</option>
                    ))}
                  </select>
                  <input
                    className="form-input port-count-input"
                    type="number"
                    min={1}
                    max={96}
                    value={p.n}
                    onChange={e => updatePort(p._key, 'n', e.target.value)}
                    title="Port count"
                  />
                  <input
                    className="form-input port-speed-input"
                    type="text"
                    placeholder="Speed (opt.)"
                    value={p.s ?? ''}
                    onChange={e => updatePort(p._key, 's', e.target.value)}
                  />
                  <button
                    type="button"
                    className="port-remove-btn"
                    onClick={() => removePort(p._key)}
                    title="Remove port"
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={closeDevModal}>Cancel</button>
          <button type="submit" className="btn btn-primary">
            {form?.isNew ? 'Add to library' : form?.isInstance ? 'Save device' : 'Save library entry'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
