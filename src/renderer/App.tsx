import { useRef, useCallback, useState, useEffect, type ReactNode } from 'react'
import { useStatus } from './hooks/useStatus'
import BossCharacter from './components/BossCharacter'
import DuckCharacter from './components/DuckCharacter'
import MemePackCharacter from './components/MemePackCharacter'
import AgentPanel from './components/AgentPanel'
import DiscordBadge from './components/DiscordBadge'
import EventLoopPanel from './components/EventLoopPanel'
import { STATE_COLORS } from '../shared/utils'
import type { BossState, DisplayMode } from '../shared/types'
import './App.css'

/**
 * Emoji mapping for each BOSS state
 */
const STATE_EMOJI: Record<BossState, string> = {
  thinking: '\u{1F9E0}',
  delegating: '\u{1F4CB}',
  reviewing: '\u{1F50D}',
  waiting: '\u{23F3}',
  idle: '\u{1F634}',
  sprinting: '\u{1F3C3}',
  discord: '\u{1F4AC}',
  working: '\u{26A1}',
  reading: '\u{1F4D6}',
  done: '\u{2705}',
  error: '\u{274C}'
}

function App(): ReactNode {
  const { status, previousState, isStale } = useStatus()
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDraggingRef = useRef(false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('css-art')
  const [scale, setScale] = useState<number>(1.0)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const stateColor = STATE_COLORS[status.state] || '#6b7280'

  // ResizeObserver to auto-size the Electron window to fit content
  // Uses getBoundingClientRect which includes CSS transforms
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const BUFFER = 10

    const observer = new ResizeObserver(() => {
      // getBoundingClientRect returns visual (post-transform) dimensions
      const rect = el.getBoundingClientRect()
      const scaledWidth = Math.ceil(rect.width)
      const scaledHeight = Math.ceil(rect.height)
      // Send already-scaled dimensions — main process uses them directly
      window.electronAPI.resizeWindow(scaledWidth, scaledHeight + BUFFER)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [scale])

  // Listen for zoom changes (CMD+/-) and re-measure
  useEffect(() => {
    const unsubscribe = window.electronAPI.onZoomChanged(() => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      window.electronAPI.resizeWindow(Math.ceil(rect.width), Math.ceil(rect.height) + 10)
    })
    return unsubscribe
  }, [])

  // Load preferences on mount and listen for updates
  useEffect(() => {
    window.electronAPI.getPreferences().then((prefs) => {
      setDisplayMode(prefs.displayMode)
      setScale(prefs.scale ?? 1.0)
    }).catch((err) => console.error('[boss-companion] Failed to load preferences:', err))

    const unsubscribe = window.electronAPI.onPreferencesUpdate((prefs) => {
      setDisplayMode(prefs.displayMode)
      setScale(prefs.scale ?? 1.0)
    })

    return unsubscribe
  }, [])

  // Determine transition class
  const isTransitioning = previousState !== null && previousState !== status.state

  // Double-click to minimize
  const handleDoubleClick = useCallback(() => {
    window.electronAPI.minimizeWindow()
  }, [])

  // Right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    window.electronAPI.showContextMenu()
  }, [])

  // Handle click vs double-click discrimination
  const handleClick = useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      handleDoubleClick()
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null
        // Single click — no-op
      }, 300)
    }
  }, [handleDoubleClick])

  // Drag handler — mousedown on pet-area starts drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // left click only
    isDraggingRef.current = true
    window.electronAPI.dragStart()
  }, [])

  // Document-level listeners for drag move/end (ensures drag continues outside pet-area)
  useEffect(() => {
    const onMouseMove = (): void => {
      if (isDraggingRef.current) {
        window.electronAPI.dragMove()
      }
    }
    const onMouseUp = (): void => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        window.electronAPI.dragEnd()
      }
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // Render character based on display mode
  const renderCharacter = (): ReactNode => {
    switch (displayMode) {
      case 'css-art':
        return <BossCharacter state={status.state} color={stateColor} />
      case 'emoji':
        return (
          <span className="pet-emoji" style={{ fontSize: '48px', lineHeight: 1 }}>
            {STATE_EMOJI[status.state] || '\u{2753}'}
          </span>
        )
      case 'call-duck':
        return <DuckCharacter state={status.state} color={stateColor} />
      case 'meme-pack':
        return <MemePackCharacter state={status.state} color={stateColor} />
      case 'minimal':
        return null
      default:
        return <BossCharacter state={status.state} color={stateColor} />
    }
  }

  return (
    <div
      ref={containerRef}
      className="app-container"
      style={scale !== 1.0 ? { transform: `scale(${scale})`, transformOrigin: 'top center' } : undefined}
      onContextMenu={handleContextMenu}
    >
      {/* Status bubble */}
      <div className="status-bubble" style={{ borderColor: isStale ? '#6b7280' : stateColor }}>
        {isStale && (
          <span className="status-stale-indicator">Stale / Disconnected</span>
        )}
        <span className="status-action">{isStale ? 'No updates for 5+ minutes' : status.action}</span>
      </div>

      {/* Pet character area — draggable */}
      <div
        className={`pet-area ${isTransitioning ? 'pet-area--transitioning' : ''}`}
        style={{ borderColor: stateColor }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      >
        {renderCharacter()}
        <span className="pet-state" style={{ color: stateColor }}>
          {status.state.toUpperCase()}
        </span>
      </div>

      {/* Agent panel */}
      <AgentPanel agents={status.agents} />

      {/* Event loop display */}
      <EventLoopPanel eventLoop={status.eventLoop} />

      {/* Footer: Discord + Tokens */}
      <div className="footer">
        <DiscordBadge discord={status.discord} />

        {(status.tokens.context > 0 || status.tokens.output > 0) && (
          <div className="token-badge">
            {status.tokens.context >= 1000 ? `${Math.round(status.tokens.context / 1000)}k` : status.tokens.context} / {status.tokens.output >= 1000 ? `${Math.round(status.tokens.output / 1000)}k` : status.tokens.output}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
