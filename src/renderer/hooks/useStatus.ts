import { useState, useEffect } from 'react'
import type { BossStatus } from '../../shared/types'

const DEFAULT_STATUS: BossStatus = {
  state: 'idle',
  action: 'Waiting for BOSS...',
  agents: [],
  discord: { pending: 0 },
  eventLoop: { phase: 'idle' },
  tokens: { context: 0, output: 0 },
  timestamp: Date.now()
}

export function useStatus(): BossStatus {
  const [status, setStatus] = useState<BossStatus>(DEFAULT_STATUS)

  useEffect(() => {
    // Fetch initial status
    window.electronAPI.getStatus().then(setStatus).catch(console.error)

    // Subscribe to updates
    const unsubscribe = window.electronAPI.onStatusUpdate((newStatus) => {
      setStatus(newStatus)
    })

    return unsubscribe
  }, [])

  return status
}
