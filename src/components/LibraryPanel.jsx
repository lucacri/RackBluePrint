import React, { useState } from 'react'
import { useApp } from '../state/AppContext'
import { useDrag, useModal, useToast } from '../state/UIContext'
import { CAT_COLORS, CAT_ORDER, CAT_NAMES, UNITS_LBL } from '../data/constants'
import { getEffectiveLib, deviceFromLib, findFirstSlot } from '../state/helpers'

function LibraryItem({ lib, onEditClick }) {
  const { setDrag } = useDrag()
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { bg } = CAT_COLORS[lib.cat] ?? CAT_COLORS.custom
  const sz = lib.uH > 1
    ? `${lib.uH}U`
    : (UNITS_LBL[lib.u] !== 'Full' ? UNITS_LBL[lib.u] : '1U')

  function handleDragStart(e) {
    e.stopPropagation()
    setDrag({ src: 'lib', libId: lib.libId })
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', lib.libId)
    e.currentTarget.classList.add('is-dragging')
  }

  function handleDragEnd(e) {
    e.currentTarget.classList.remove('is-dragging')
    setDrag(null)
  }

  function handleQuickAdd(e) {
    e.stopPropagation()
    const dev = deviceFromLib(lib)
    const ri = findFirstSlot(state, dev)
    if (ri === -1) { toast('No space available in rack'); return }
    dispatch({ type: 'PLACE_DEVICE', device: dev, rowIndex: ri })
    toast(`${lib.name} added at U${ri + 1}`)
  }

  return (
    <div
      className="lib-item"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="lib-dot" style={{ background: bg }} />
      <span className="lib-name">{lib.name}</span>
      <span className="lib-size">{sz}</span>
      <button
        className="lib-add-btn"
        draggable={false}
        title="Add to first available slot"
        tabIndex={-1}
        onClick={handleQuickAdd}
      >
        +
      </button>
      <button
        className="lib-edit-btn"
        draggable={false}
        title="Edit library entry"
        tabIndex={-1}
        onClick={e => { e.stopPropagation(); onEditClick(lib) }}
      >
        {/* pencil icon */}
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.5 1.5a2.121 2.121 0 0 1 3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

export default function LibraryPanel() {
  const { state } = useApp()
  const { openDevModal } = useModal()
  const [query, setQuery] = useState('')

  const effLib = getEffectiveLib(state)
  const q = query.toLowerCase()

  const grouped = {}
  for (const lib of effLib) {
    if (q && !lib.name.toLowerCase().includes(q)) continue
    ;(grouped[lib.cat] ??= []).push(lib)
  }

  return (
    <aside className="panel-left">
      <div className="panel-head">Device library</div>
      <input
        className="lib-search"
        type="search"
        placeholder="Search devices…"
        autoComplete="off"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="library-list">
        {Object.values(grouped).every(g => !g.length)
          ? <div className="lib-empty">No matches</div>
          : CAT_ORDER.map(cat => {
              if (!grouped[cat]?.length) return null
              return (
                <React.Fragment key={cat}>
                  <div className="lib-cat-label">{CAT_NAMES[cat] ?? cat}</div>
                  {grouped[cat].map(lib => (
                    <LibraryItem
                      key={lib.libId}
                      lib={lib}
                      onEditClick={openDevModal}
                    />
                  ))}
                </React.Fragment>
              )
            })
        }
      </div>
    </aside>
  )
}
