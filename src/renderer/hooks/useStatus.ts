import { useState, useEffect, useRef } from 'react'
import type { BossStatus, BossState } from '../../shared/types'

const DEFAULT_STATUS: BossStatus = {
  state: 'idle',
  action: 'Waiting for BOSS...',
  agents: [],
  discord: { pending: 0 },
  eventLoop: { phase: 'idle' },
  tokens: { context: 0, output: 0 },
  timestamp: Date.now()
}

/** Default stale threshold: 5 minutes */
const STALE_THRESHOLD_MS = 5 * 60 * 1000
/** Extended threshold for event-loop phase: 10 minutes (event-wait blocks up to 5 min between heartbeats) */
const EVENT_LOOP_STALE_THRESHOLD_MS = 10 * 60 * 1000

/** Phases that indicate BOSS is in a long-blocking event-wait */
const EVENT_LOOP_PHASES = ['event-loop', 'event-wait', 'waiting']

function getStaleThreshold(phase: string): number {
  return EVENT_LOOP_PHASES.includes(phase) ? EVENT_LOOP_STALE_THRESHOLD_MS : STALE_THRESHOLD_MS
}

interface UseStatusResult {
  status: BossStatus
  previousState: BossState | null
  isStale: boolean
}

/**
 * Custom hook to manage the BOSS status state.
 *
 * Provides the current BOSS status, the immediate previous state (for transition handling),
 * and a boolean indicating whether the status is considered stale.
 *
 * State transitions:
 * - When a state change occurs (e.g., from 'idle' to 'running'), `previousState` is set to the old state.
 * - This `previousState` is retained for 400ms to allow UI elements to transition/animate smoothly.
 * - After 400ms, `previousState` is cleared back to `null`.
 *
 * Polling and Stale logic:
 * - A background interval runs every 30 seconds to check the age of the `status.timestamp`.
 * - The stale threshold is dynamic: 5 minutes by default, but extended to 10 minutes if
 *   the `eventLoop.phase` indicates a long-blocking wait.
 *
 * @returns {UseStatusResult} An object containing the current status, the previous state, and staleness flag.
 */
export function useStatus(): UseStatusResult {
  const [status, setStatus] = useState<BossStatus>(DEFAULT_STATUS)
  const [previousState, setPreviousState] = useState<BossState | null>(null)
  const [isStale, setIsStale] = useState(false)
  const currentStateRef = useRef<BossState>(DEFAULT_STATUS.state)
  const staleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Fetch initial status
    window.electronAPI.getStatus().then(setStatus).catch(console.error)

    // Subscribe to updates
    const unsubscribe = window.electronAPI.onStatusUpdate((newStatus) => {
      if (newStatus.state !== currentStateRef.current) {
        setPreviousState(currentStateRef.current)
        currentStateRef.current = newStatus.state

        // Clear the previousState after animation duration
        setTimeout(() => setPreviousState(null), 400)
      }
      setStatus(newStatus)
      // Fresh update received — not stale
      setIsStale(false)
    })

    return unsubscribe
  }, [])

  // Periodically check if the last status update is stale (context-aware threshold)
  useEffect(() => {
    const checkStale = (): void => {
      const age = Date.now() - status.timestamp
      const phase = status.eventLoop?.phase ?? 'idle'
      const threshold = getStaleThreshold(phase)
      setIsStale(age > threshold)
    }

    // Check immediately
    checkStale()

    // Re-check every 30 seconds
    staleTimerRef.current = setInterval(checkStale, 30_000)
    return () => {
      if (staleTimerRef.current) clearInterval(staleTimerRef.current)
    }
  }, [status.timestamp, status.eventLoop?.phase])

  return { status, previousState, isStale }
}
