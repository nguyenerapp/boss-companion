import { useRef, useCallback, type ReactNode } from 'react'
import { useStatus } from './hooks/useStatus'
import BossCharacter from './components/BossCharacter'
import AgentPanel from './components/AgentPanel'
import DiscordBadge from './components/DiscordBadge'
import EventLoopPanel from './components/EventLoopPanel'
import { STATE_COLORS } from '../shared/utils'
import './App.css'

function App(): ReactNode {
  const { status, previousState } = useStatus()
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stateColor = STATE_COLORS[status.state] || '#6b7280'

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

  return (
    <div
      className="app-container"
      onContextMenu={handleContextMenu}
    >
      {/* Status bubble */}
      <div className="status-bubble" style={{ borderColor: stateColor }}>
        <span className="status-action">{status.action}</span>
      </div>

      {/* Pet character area */}
      <div
        className={`pet-area ${isTransitioning ? 'pet-area--transitioning' : ''}`}
        style={{ borderColor: stateColor }}
        onClick={handleClick}
      >
        <BossCharacter state={status.state} color={stateColor} />
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
            {Math.round(status.tokens.context / 1000)}k / {Math.round(status.tokens.output / 1000)}k
          </div>
        )}
      </div>
    </div>
  )
}

export default App
