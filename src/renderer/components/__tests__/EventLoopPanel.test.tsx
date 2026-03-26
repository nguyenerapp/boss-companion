import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import EventLoopPanel from '../EventLoopPanel'
import type { EventLoopStatus } from '../../../shared/types'

describe('EventLoopPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders minimal event loop state (only phase)', () => {
    const eventLoop: EventLoopStatus = {
      phase: 'thinking',
    }

    render(<EventLoopPanel eventLoop={eventLoop} />)

    expect(screen.getByText('thinking')).toBeDefined()
  })

  it('renders current slot and next slot time', () => {
    const now = Date.now()
    vi.setSystemTime(now)

    const eventLoop: EventLoopStatus = {
      phase: 'work_hours',
      currentSlot: 'Morning Sprint',
      nextSlotTime: now + 45 * 60_000, // 45 minutes from now
    }

    render(<EventLoopPanel eventLoop={eventLoop} />)

    expect(screen.getByText('work hours')).toBeDefined() // phase string with _ replaced by space
    expect(screen.getByText('Morning Sprint')).toBeDefined()
    expect(screen.getByText('next: 45m')).toBeDefined()
  })

  it('renders upcoming slots', () => {
    const eventLoop: EventLoopStatus = {
      phase: 'idle',
      upcomingSlots: [
        'Lunch Break',
        'Afternoon Sync',
        'Deep Work',
        'Extra Slot',
      ],
    }

    render(<EventLoopPanel eventLoop={eventLoop} />)

    expect(screen.getByText('Lunch Break')).toBeDefined()
    expect(screen.getByText('Afternoon Sync')).toBeDefined()
    expect(screen.getByText('Deep Work')).toBeDefined()
    // Should only render up to 3 upcoming slots
    expect(screen.queryByText('Extra Slot')).toBeNull()
  })

  it('updates countdown timer periodically', () => {
    const now = Date.now()
    vi.setSystemTime(now)

    const eventLoop: EventLoopStatus = {
      phase: 'working',
      currentSlot: 'Coding',
      nextSlotTime: now + 61_000, // 61 seconds (renders as 2m)
    }

    render(<EventLoopPanel eventLoop={eventLoop} />)

    expect(screen.getByText('next: 2m')).toBeDefined()

    // Advance time by 30 seconds
    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    // 61s - 30s = 31s -> rounds up to 1m
    expect(screen.getByText('next: 1m')).toBeDefined()
  })
})
