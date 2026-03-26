// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useStatus } from '../useStatus'
import type { BossStatus, BossState } from '../../../shared/types'

const MOCK_DEFAULT_STATUS: BossStatus = {
  state: 'idle',
  action: 'Waiting for BOSS...',
  agents: [],
  discord: { pending: 0 },
  eventLoop: { phase: 'idle' },
  tokens: { context: 0, output: 0 },
  timestamp: 1000000
}

describe('useStatus', () => {
  let mockGetStatus: any
  let mockOnStatusUpdate: any
  let unsubscribeMock: any

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1000000)

    unsubscribeMock = vi.fn()
    mockGetStatus = vi.fn().mockResolvedValue(MOCK_DEFAULT_STATUS)
    mockOnStatusUpdate = vi.fn().mockReturnValue(unsubscribeMock)

    vi.stubGlobal('window', {
      ...globalThis.window,
      electronAPI: {
        getStatus: mockGetStatus,
        onStatusUpdate: mockOnStatusUpdate
      }
    })

    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should return initial default status', () => {
    const { result } = renderHook(() => useStatus())

    expect(result.current.status.state).toBe('idle')
    expect(result.current.previousState).toBeNull()
    expect(result.current.isStale).toBe(false)
  })

  it('should fetch initial status via getStatus', async () => {
    const { result } = renderHook(() => useStatus())

    expect(mockGetStatus).toHaveBeenCalled()

    await act(async () => {
      // Just wait for microtasks (promise resolution) instead of all timers
      await Promise.resolve()
    })

    expect(result.current.status).toEqual(MOCK_DEFAULT_STATUS)
  })

  it('should handle getStatus error', async () => {
    const error = new Error('Failed to fetch')
    mockGetStatus.mockRejectedValueOnce(error)

    renderHook(() => useStatus())

    await act(async () => {
      // Just wait for microtasks
      await Promise.resolve()
    })

    expect(console.error).toHaveBeenCalledWith(error)
  })

  it('should update status when onStatusUpdate is called', async () => {
    let updateCallback: (status: BossStatus) => void = () => {}
    mockOnStatusUpdate.mockImplementation((cb: any) => {
      updateCallback = cb
      return unsubscribeMock
    })

    const { result } = renderHook(() => useStatus())

    const newStatus: BossStatus = {
      ...MOCK_DEFAULT_STATUS,
      state: 'working',
      timestamp: 1000000
    }

    act(() => {
      updateCallback(newStatus)
    })

    expect(result.current.status).toEqual(newStatus)
    expect(result.current.previousState).toBe('idle') // changed from 'idle'
  })

  it('should clear previousState after 400ms', async () => {
    let updateCallback: (status: BossStatus) => void = () => {}
    mockOnStatusUpdate.mockImplementation((cb: any) => {
      updateCallback = cb
      return unsubscribeMock
    })

    const { result } = renderHook(() => useStatus())

    const newStatus: BossStatus = {
      ...MOCK_DEFAULT_STATUS,
      state: 'working',
      timestamp: 1000000
    }

    act(() => {
      updateCallback(newStatus)
    })

    expect(result.current.previousState).toBe('idle')

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(result.current.previousState).toBeNull()
  })

  it('should not update previousState if state string remains the same', async () => {
    let updateCallback: (status: BossStatus) => void = () => {}
    mockOnStatusUpdate.mockImplementation((cb: any) => {
      updateCallback = cb
      return unsubscribeMock
    })

    const { result } = renderHook(() => useStatus())

    const newStatus: BossStatus = {
      ...MOCK_DEFAULT_STATUS,
      state: 'idle', // same as current
      action: 'Different action',
      timestamp: 1000000
    }

    act(() => {
      updateCallback(newStatus)
    })

    expect(result.current.status.action).toBe('Different action')
    expect(result.current.previousState).toBeNull()
  })

  it('should detect staleness using normal threshold (5 minutes)', async () => {
    // Return a status with a specific timestamp
    mockGetStatus.mockResolvedValueOnce({
      ...MOCK_DEFAULT_STATUS,
      timestamp: 1000000
    })

    const { result } = renderHook(() => useStatus())

    await act(async () => {
      await Promise.resolve()
    })

    // Initial status has timestamp 1000000, current time is 1000000. Not stale.
    expect(result.current.isStale).toBe(false)

    act(() => {
      // Advance by 5 minutes + 1ms = 300001ms
      vi.setSystemTime(1000000 + 300001)
      vi.advanceTimersByTime(30000) // Trigger the interval check
    })

    expect(result.current.isStale).toBe(true)
  })

  it('should detect staleness using extended threshold (10 minutes) for event-loop phase', async () => {
    let updateCallback: (status: BossStatus) => void = () => {}
    mockOnStatusUpdate.mockImplementation((cb: any) => {
      updateCallback = cb
      return unsubscribeMock
    })

    const { result } = renderHook(() => useStatus())

    const eventLoopStatus: BossStatus = {
      ...MOCK_DEFAULT_STATUS,
      eventLoop: { phase: 'event-wait' },
      timestamp: 1000000
    }

    act(() => {
      updateCallback(eventLoopStatus)
    })

    // Advance by 5 minutes + 1ms -> should NOT be stale because of extended threshold
    act(() => {
      vi.setSystemTime(1000000 + 300001)
      vi.advanceTimersByTime(30000)
    })

    expect(result.current.isStale).toBe(false)

    // Advance by another 5 minutes -> 10 minutes total -> stale
    act(() => {
      vi.setSystemTime(1000000 + 600001)
      vi.advanceTimersByTime(30000)
    })

    expect(result.current.isStale).toBe(true)
  })

  it('should reset isStale when new update received', async () => {
    let updateCallback: (status: BossStatus) => void = () => {}
    mockOnStatusUpdate.mockImplementation((cb: any) => {
      updateCallback = cb
      return unsubscribeMock
    })

    // Initial fetch
    mockGetStatus.mockResolvedValueOnce({
      ...MOCK_DEFAULT_STATUS,
      timestamp: 1000000
    })

    const { result } = renderHook(() => useStatus())

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      vi.setSystemTime(1000000 + 300001)
      vi.advanceTimersByTime(30000)
    })

    expect(result.current.isStale).toBe(true)

    act(() => {
      updateCallback({
        ...MOCK_DEFAULT_STATUS,
        timestamp: 1000000 + 300001
      })
    })

    expect(result.current.isStale).toBe(false)
  })

  it('should cleanup subscription and interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    const { unmount } = renderHook(() => useStatus())

    unmount()

    expect(unsubscribeMock).toHaveBeenCalled()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
