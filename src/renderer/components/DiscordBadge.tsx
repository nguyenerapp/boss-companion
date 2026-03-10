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

  useEffect(() => {
    // Detect new messages: current count > previous count
    if (discord.pending > prevCountRef.current) {
      setIsNew(true)
      setShowDot(true)

      // Stop the pulse animation after 3 seconds
      const timer = setTimeout(() => setIsNew(false), 3000)
      return () => clearTimeout(timer)
    }

    // Count dropped — messages were read, clear the dot
    if (discord.pending < prevCountRef.current) {
      setShowDot(false)
    }

    prevCountRef.current = discord.pending
  }, [discord.pending])

  if (discord.pending === 0 && !showDot) return null

  return (
    <div
      className={`discord-badge ${isNew ? 'discord-badge--new' : ''}`}
      title={discord.lastMessage ? `Last: ${discord.lastMessage}` : undefined}
    >
      <span className="discord-badge__icon">&#128172;</span>
      {discord.pending > 0 && (
        <span className="discord-badge__count">{discord.pending}</span>
      )}
      {showDot && <span className="discord-badge__dot" />}
    </div>
  )
}

export default DiscordBadge
