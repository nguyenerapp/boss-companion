import { type ReactNode } from 'react'
import { useStatus } from './hooks/useStatus'
import './App.css'

// State to emoji mapping for the pet indicator
const STATE_EMOJI: Record<string, string> = {
  thinking: '🧠',
  delegating: '📋',
  reviewing: '🔍',
  waiting: '⏳',
  idle: '😴',
  sprinting: '🏃',
  discord: '💬',
  working: '⚡',
  reading: '📖',
  done: '✅',
  error: '❌'
}

// State to color mapping
const STATE_COLOR: Record<string, string> = {
  thinking: '#a78bfa',
  delegating: '#60a5fa',
  reviewing: '#f59e0b',
  waiting: '#9ca3af',
  idle: '#6b7280',
  sprinting: '#34d399',
  discord: '#5865F2',
  working: '#f97316',
  reading: '#38bdf8',
  done: '#22c55e',
  error: '#ef4444'
}

function App(): ReactNode {
  const status = useStatus()

  const stateColor = STATE_COLOR[status.state] || '#6b7280'

  return (
    <div className="app-container">
      {/* Status bubble */}
      <div className="status-bubble" style={{ borderColor: stateColor }}>
        <span className="status-action">{status.action}</span>
      </div>

      {/* Pet indicator */}
      <div className="pet-area" style={{ borderColor: stateColor }}>
        <span className="pet-emoji">{STATE_EMOJI[status.state] || '🤖'}</span>
        <span className="pet-state" style={{ color: stateColor }}>
          {status.state.toUpperCase()}
        </span>
      </div>

      {/* Agent panel */}
      {status.agents.length > 0 && (
        <div className="agent-panel">
          <div className="panel-header">Agents ({status.agents.length})</div>
          {status.agents.map((agent) => (
            <div key={agent.id} className={`agent-row agent-${agent.state}`}>
              <span className="agent-indicator" />
              <span className="agent-desc">{agent.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer: Discord + Tokens */}
      <div className="footer">
        {status.discord.pending > 0 && (
          <div className="discord-badge">
            💬 {status.discord.pending}
          </div>
        )}
        {(status.tokens.context > 0 || status.tokens.output > 0) && (
          <div className="token-badge">
            {Math.round(status.tokens.context / 1000)}k / {Math.round(status.tokens.output / 1000)}k
          </div>
        )}
        {status.eventLoop.currentSlot && (
          <div className="slot-badge">
            {status.eventLoop.currentSlot}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
