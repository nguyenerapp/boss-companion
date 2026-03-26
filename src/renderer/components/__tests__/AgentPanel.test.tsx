import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import AgentPanel from '../AgentPanel'
import type { AgentStatus } from '../../../shared/types'

// Mock formatElapsed to simplify testing
vi.mock('../../../shared/utils', () => ({
  formatElapsed: vi.fn().mockImplementation((start, now) => {
    const elapsed = Math.floor((now - start) / 1000)
    return `${elapsed}s`
  }),
  AGENT_STATE_COLORS: {
    running: '#10b981',
    completed: '#3b82f6',
    failed: '#ef4444'
  }
}))

beforeEach(() => {
  window.electronAPI = {
    copyToClipboard: vi.fn(),
  } as any
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2024-01-01T12:00:00Z').getTime())
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('AgentPanel', () => {
  it('renders nothing when agents array is empty', () => {
    const { container } = render(<AgentPanel agents={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders agent list correctly', () => {
    const mockAgents: AgentStatus[] = [
      {
        id: 'agent-1',
        description: 'Test Agent 1',
        state: 'running',
        startedAt: new Date('2024-01-01T11:59:00Z').getTime() // 60s ago
      },
      {
        id: 'agent-2',
        description: 'Test Agent 2',
        state: 'completed',
        startedAt: new Date('2024-01-01T11:58:00Z').getTime() // 120s ago
      }
    ]

    render(<AgentPanel agents={mockAgents} />)

    expect(screen.getByText('Agents (2)')).toBeInTheDocument()
    expect(screen.getByText('Test Agent 1')).toBeInTheDocument()
    expect(screen.getByText('Test Agent 2')).toBeInTheDocument()

    // Check mocked formatElapsed output
    expect(screen.getByText('60s')).toBeInTheDocument()
    expect(screen.getByText('120s')).toBeInTheDocument()
  })

  it('handles click to copy ID', () => {
    const mockAgents: AgentStatus[] = [
      {
        id: 'agent-123',
        description: 'Test Agent',
        state: 'running',
        startedAt: Date.now()
      }
    ]

    render(<AgentPanel agents={mockAgents} />)

    const row = screen.getByTitle('Click to copy ID: agent-123')
    fireEvent.click(row)

    expect(window.electronAPI.copyToClipboard).toHaveBeenCalledWith('agent-123')
  })

  it('shows overflow message when exceeding MAX_VISIBLE', () => {
    const mockAgents: AgentStatus[] = Array.from({ length: 15 }, (_, i) => ({
      id: `agent-${i}`,
      description: `Test Agent ${i}`,
      state: 'completed',
      startedAt: Date.now()
    }))

    render(<AgentPanel agents={mockAgents} />)

    expect(screen.getByText('Agents (15)')).toBeInTheDocument()
    // Should show only 12 agents
    for (let i = 0; i < 12; i++) {
      expect(screen.getByText(`Test Agent ${i}`)).toBeInTheDocument()
    }
    expect(screen.queryByText('Test Agent 12')).not.toBeInTheDocument()

    // Should show "+3 more"
    expect(screen.getByText('+3 more')).toBeInTheDocument()
  })

  it('updates elapsed time for running agents every second', () => {
    const startTime = new Date('2024-01-01T12:00:00Z').getTime()
    const mockAgents: AgentStatus[] = [
      {
        id: 'agent-1',
        description: 'Running Agent',
        state: 'running',
        startedAt: startTime
      }
    ]

    render(<AgentPanel agents={mockAgents} />)

    // Initial render
    expect(screen.getByText('0s')).toBeInTheDocument()

    // Fast forward 1 second
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Check that it updated
    expect(screen.getByText('1s')).toBeInTheDocument()
  })

  it('does not update elapsed time if no agents are running', () => {
    const startTime = new Date('2024-01-01T12:00:00Z').getTime()
    const mockAgents: AgentStatus[] = [
      {
        id: 'agent-1',
        description: 'Completed Agent',
        state: 'completed',
        startedAt: startTime
      }
    ]

    render(<AgentPanel agents={mockAgents} />)

    expect(screen.getByText('0s')).toBeInTheDocument()

    // Fast forward 1 second
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Should still be 0s since interval shouldn't be running
    expect(screen.getByText('0s')).toBeInTheDocument()
  })
})
