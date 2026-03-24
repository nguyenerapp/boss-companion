import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import EventLoopPanel from '../EventLoopPanel'
import type { EventLoopStatus } from '../../../shared/types'
import { formatCountdown } from '../../../shared/utils'

// Mock the formatCountdown utility
vi.mock('../../../shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/utils')>()
  return {
    ...actual,
    formatCountdown: vi.fn((ms) => `mocked-${ms}`),
  }
})

describe('EventLoopPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllTimers()
  })

  it('renders minimal phase indicator correctly', () => {
    const eventLoop: EventLoopStatus = {
      phase: 'work_hours',
    }

    render(<EventLoopPanel eventLoop={eventLoop} />)

    // Check phase label
    expect(screen.getByText('work hours')).toBeInTheDocument()

    // Should not render current slot or upcoming slots
    expect(screen.queryByText('next:')).not.toBeInTheDocument()
  })

  it('renders current slot when provided', () => {
    const eventLoop: EventLoopStatus = {
      phase: 'weekend',
      currentSlot: 'Resting',
    }

    render(<EventLoopPanel eventLoop={eventLoop} />)

    expect(screen.getByText('weekend')).toBeInTheDocument()
    expect(screen.getByText('Resting')).toBeInTheDocument()
    expect(screen.queryByText('next:')).not.toBeInTheDocument() // nextSlotTime not provided
  })

  it('renders time until next slot and updates periodically', () => {
    // Current time
    const now = 1000000
    vi.setSystemTime(now)

    // Next slot in 5 minutes
    const nextSlotTime = now + 300000

    const eventLoop: EventLoopStatus = {
      phase: 'work_hours',
      currentSlot: 'Coding',
      nextSlotTime,
    }

    render(<EventLoopPanel eventLoop={eventLoop} />)

    // Check it calls formatCountdown with the diff
    expect(formatCountdown).toHaveBeenCalledWith(300000)
    expect(screen.getByText('next: mocked-300000')).toBeInTheDocument()

    // Fast forward 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    // Should call with updated time diff
    expect(formatCountdown).toHaveBeenCalledWith(270000)
    expect(screen.getByText('next: mocked-270000')).toBeInTheDocument()
  })

  it('renders upcoming slots correctly up to maximum of 3', () => {
    const eventLoop: EventLoopStatus = {
      phase: 'work_hours',
      upcomingSlots: ['Review PRs', 'Team Sync', 'Write Tests', 'Deploy'],
    }

    render(<EventLoopPanel eventLoop={eventLoop} />)

    // Should show first 3
    expect(screen.getByText('Review PRs')).toBeInTheDocument()
    expect(screen.getByText('Team Sync')).toBeInTheDocument()
    expect(screen.getByText('Write Tests')).toBeInTheDocument()

    // Should not show 4th
    expect(screen.queryByText('Deploy')).not.toBeInTheDocument()
  })

  it('does not set up interval if nextSlotTime is missing', () => {
    const eventLoop: EventLoopStatus = {
      phase: 'idle',
      currentSlot: 'Waiting',
    }

    // Spy on setInterval
    const setIntervalSpy = vi.spyOn(global, 'setInterval')

    render(<EventLoopPanel eventLoop={eventLoop} />)

    expect(setIntervalSpy).not.toHaveBeenCalled()
  })

  it('sets up interval if nextSlotTime is present', () => {
    const eventLoop: EventLoopStatus = {
      phase: 'idle',
      currentSlot: 'Waiting',
      nextSlotTime: Date.now() + 100000,
    }

    const setIntervalSpy = vi.spyOn(global, 'setInterval')

    render(<EventLoopPanel eventLoop={eventLoop} />)

    expect(setIntervalSpy).toHaveBeenCalled()
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
  })

  it('cleans up interval on unmount', () => {
    const eventLoop: EventLoopStatus = {
      phase: 'idle',
      currentSlot: 'Waiting',
      nextSlotTime: Date.now() + 100000,
    }

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    const { unmount } = render(<EventLoopPanel eventLoop={eventLoop} />)

    expect(clearIntervalSpy).not.toHaveBeenCalled()

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
