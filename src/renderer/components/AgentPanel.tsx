import { useState, useEffect, type ReactNode } from 'react'
import type { AgentStatus } from '../../shared/types'
import { formatElapsed, AGENT_STATE_COLORS } from '../../shared/utils'
import './AgentPanel.css'

/**
 * Props for the AgentPanel component.
 */
interface AgentPanelProps {
  /**
   * List of current agent statuses to display.
   */
  agents: AgentStatus[]
}

const MAX_VISIBLE = 12

/**
 * Displays a summary panel of active agents, their states, and elapsed running time.
 * Handles copying agent IDs to the clipboard.
 *
 * @param props - Component props containing the list of agents.
 * @returns The rendered agent panel or null if no agents exist.
 */
function AgentPanel({ agents }: AgentPanelProps): ReactNode {
  /**
   * Current timestamp used to calculate elapsed time for running agents.
   * Updates every second when at least one agent is running.
   */
  const [now, setNow] = useState(Date.now())

  // Update elapsed times every second for running agents
  useEffect(() => {
    const hasRunning = agents.some((a) => a.state === 'running')
    if (!hasRunning) return

    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [agents])

  if (agents.length === 0) return null

  const visibleAgents = agents.slice(0, MAX_VISIBLE)
  const overflow = agents.length - MAX_VISIBLE

  /**
   * Copies the specified agent ID to the system clipboard via Electron IPC.
   *
   * @param agentId - The unique identifier of the agent to copy.
   */
  const handleCopyId = (agentId: string): void => {
    window.electronAPI.copyToClipboard(agentId)
  }

  return (
    <div className="agent-panel">
      <div className="panel-header">Agents ({agents.length})</div>
      <div className="agent-list">
        {visibleAgents.map((agent) => (
          <div
            key={agent.id}
            className={`agent-row agent-${agent.state}`}
            onClick={() => handleCopyId(agent.id)}
            title={`Click to copy ID: ${agent.id}`}
          >
            <span
              className="agent-indicator"
              style={{
                background: AGENT_STATE_COLORS[agent.state] || '#6b7280',
                boxShadow: agent.state === 'running'
                  ? `0 0 4px ${AGENT_STATE_COLORS.running}`
                  : 'none'
              }}
            />
            {agent.state === 'running' && (
              <span className="agent-spinner" />
            )}
            <span className="agent-desc">{agent.description}</span>
            <span className="agent-elapsed" style={{ color: AGENT_STATE_COLORS[agent.state] }}>
              {formatElapsed(agent.startedAt, now)}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <div className="agent-overflow">+{overflow} more</div>
        )}
      </div>
    </div>
  )
}

export default AgentPanel
