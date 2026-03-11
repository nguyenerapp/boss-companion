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

/** Status is considered stale if older than 5 minutes */
const STALE_THRESHOLD_MS = 5 * 60 * 1000

interface UseStatusResult {
  status: BossStatus
  previousState: BossState | null
  isStale: boolean
}

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

  // Periodically check if the last status update is stale
  useEffect(() => {
    const checkStale = (): void => {
      const age = Date.now() - status.timestamp
      setIsStale(age > STALE_THRESHOLD_MS)
    }

    // Check immediately
    checkStale()

    // Re-check every 30 seconds
    staleTimerRef.current = setInterval(checkStale, 30_000)
    return () => {
      if (staleTimerRef.current) clearInterval(staleTimerRef.current)
    }
  }, [status.timestamp])

  return { status, previousState, isStale }
}
