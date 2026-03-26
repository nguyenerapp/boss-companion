import { useState, useEffect, useRef, type ReactNode } from 'react'
import type { DiscordStatus } from '../../shared/types'
import './DiscordBadge.css'

interface DiscordBadgeProps {
  discord: DiscordStatus
}

function DiscordBadge({ discord }: DiscordBadgeProps): ReactNode {
  const [isNew, setIsNew] = useState(false)
  const [showDot, setShowDot] = useState(false)
  const prevCountRef = useRef(discord.pending)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Detect new messages: current count > previous count
    if (discord.pending > prevCountRef.current) {
      setIsNew(true)
      setShowDot(true)

      // Clear any previous timer to prevent race condition
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current)
      }

      // Stop the pulse animation after 3 seconds
      pulseTimerRef.current = setTimeout(() => {
        setIsNew(false)
        pulseTimerRef.current = null
      }, 3000)
    }

    // Count dropped — messages were read, clear the dot
    if (discord.pending < prevCountRef.current) {
      setShowDot(false)
    }

    prevCountRef.current = discord.pending
  }, [discord.pending])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current)
      }
    }
  }, [])

  if (discord.pending === 0 && !showDot) return null

  return (
    <div
      className={`discord-badge ${isNew ? 'discord-badge--new' : ''}`}
      title={discord.lastMessage ? `Last: ${discord.lastMessage}` : undefined}
      role="status"
    >
      <span className="sr-only">Discord connection state: active</span>
      <span className="discord-badge__icon">&#128172;</span>
      {discord.pending > 0 && (
        <span className="discord-badge__count">{discord.pending}</span>
      )}
      {showDot && <span className="discord-badge__dot" aria-label="unread messages" />}
    </div>
  )
}

export default DiscordBadge
