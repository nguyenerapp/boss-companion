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

interface UseStatusResult {
  status: BossStatus
  previousState: BossState | null
}

export function useStatus(): UseStatusResult {
  const [status, setStatus] = useState<BossStatus>(DEFAULT_STATUS)
  const [previousState, setPreviousState] = useState<BossState | null>(null)
  const currentStateRef = useRef<BossState>(DEFAULT_STATUS.state)

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
    })

    return unsubscribe
  }, [])

  return { status, previousState }
}
