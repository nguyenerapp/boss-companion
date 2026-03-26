import { useState, useEffect, type ReactNode } from 'react'
import type { EventLoopStatus } from '../../shared/types'
import { formatCountdown, PHASE_COLORS } from '../../shared/utils'
import './EventLoopPanel.css'

/**
 * Props for the EventLoopPanel component.
 */
interface EventLoopPanelProps {
  /** The current status of the event loop. */
  eventLoop: EventLoopStatus
}

/**
 * Renders a panel visualizing the current event loop status.
 *
 * This component displays the current phase, active slot, and a countdown
 * to the next slot. It also shows a mini-timeline of upcoming slots.
 *
 * @param {EventLoopPanelProps} props - The component props.
 * @returns {ReactNode} The rendered event loop panel.
 */
function EventLoopPanel({ eventLoop }: EventLoopPanelProps): ReactNode {
  /**
   * The current time in milliseconds.
   * Used to calculate the countdown to the next slot.
   */
  const [now, setNow] = useState(Date.now())

  /**
   * Updates the 'now' state every 30 seconds to refresh the countdown.
   * This visualization logic avoids excessive re-renders while keeping
   * the countdown reasonably accurate for long-running event loops.
   */
  useEffect(() => {
    if (!eventLoop.nextSlotTime) return
    const interval = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [eventLoop.nextSlotTime])

  const phaseColor = PHASE_COLORS[eventLoop.phase] || '#6b7280'
  const phaseLabel = eventLoop.phase.replace(/_/g, ' ')
  const timeUntilNext = eventLoop.nextSlotTime
    ? formatCountdown(eventLoop.nextSlotTime - now)
    : null

  return (
    <div className="event-loop-panel">
      {/* Phase indicator */}
      <div className="event-loop__phase" style={{ borderColor: phaseColor }}>
        <span
          className="event-loop__phase-dot"
          style={{ background: phaseColor }}
        />
        <span className="event-loop__phase-label">{phaseLabel}</span>
      </div>

      {/* Current slot */}
      {eventLoop.currentSlot && (
        <div
          className="event-loop__slot"
          style={{ borderColor: `${phaseColor}50` }}
        >
          <span className="event-loop__slot-name">{eventLoop.currentSlot}</span>
          {timeUntilNext && (
            <span className="event-loop__next-in" style={{ color: phaseColor }}>
              next: {timeUntilNext}
            </span>
          )}
        </div>
      )}

      {/* Upcoming slots mini timeline */}
      {eventLoop.upcomingSlots && eventLoop.upcomingSlots.length > 0 && (
        <div className="event-loop__upcoming">
          {eventLoop.upcomingSlots.slice(0, 3).map((slot, i) => (
            <span key={i} className="event-loop__upcoming-slot">
              {slot}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default EventLoopPanel
