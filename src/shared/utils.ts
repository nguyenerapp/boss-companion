/**
 * Shared utilities for BOSS Companion
 */

import type { BossState, BossStatus } from './types'

/**
 * Format elapsed time as a human-readable relative string
 * e.g. "2s ago", "3m ago", "1h ago"
 * @param startedAt - The timestamp when the event started
 * @param now - The current timestamp
 * @returns A human-readable relative string
 */
export function formatElapsed(startedAt: number, now: number = Date.now()): string {
  const elapsed = Math.max(0, now - startedAt)
  const seconds = Math.floor(elapsed / 1000)

  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * Format a countdown duration
 * e.g. "45m", "1h 20m"
 * @param ms - The duration in milliseconds
 * @returns A formatted countdown string
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now'
  const totalMinutes = Math.ceil(ms / 60_000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/**
 * Validate that a value is a valid BossState
 */
const VALID_STATES: ReadonlySet<string> = new Set<string>([
  'thinking', 'delegating', 'reviewing', 'waiting', 'idle',
  'sprinting', 'discord', 'working', 'reading', 'done', 'error'
])

/**
 * Validate that a value is a valid BossState
 * @param value - The value to check
 * @returns True if the value is a valid BossState, false otherwise
 */
export function isValidBossState(value: unknown): value is BossState {
  return typeof value === 'string' && VALID_STATES.has(value)
}

/**
 * Validate a BossStatus-like object has required fields
 * @param obj - The object to check
 * @returns True if the object is a valid BossStatus, false otherwise
 */
export function isValidStatus(obj: unknown): obj is BossStatus {
  if (obj === null || typeof obj !== 'object') return false
  const s = obj as Record<string, unknown>
  return (
    isValidBossState(s.state) &&
    typeof s.action === 'string' &&
    Array.isArray(s.agents) &&
    typeof s.timestamp === 'number'
  )
}

/**
 * Phase colors for event loop display
 */
export const PHASE_COLORS: Record<string, string> = {
  // Schedule phases (from timeslots.yaml)
  work_hours: '#34d399',
  off_hours: '#60a5fa',
  weekend: '#f59e0b',
  // Event-loop operational phases (from status-reporter hook)
  waiting: '#9ca3af',       // Blocked on TaskOutput, listening for events
  launching: '#60a5fa',     // Starting event-wait-ws.py
  processing: '#f97316',    // General tool work
  thinking: '#a78bfa',      // Between tool calls
  delegating: '#818cf8',    // Spawning subagent
  discord: '#5865F2',       // Reading/writing Discord IPC
  reviewing: '#f59e0b',     // Reviewing agent output
  running_skill: '#34d399', // Executing a timeslot skill
  shipping: '#22c55e',      // Git/GitHub operations
  starting: '#38bdf8',      // Session starting up
  stopped: '#6b7280',       // Session ended
  blocked: '#ef4444',       // Waiting on user input/permission
  idle: '#6b7280',          // No activity
}

/**
 * State-to-color mapping
 */
export const STATE_COLORS: Record<string, string> = {
  thinking: '#a78bfa',
  delegating: '#60a5fa',
  reviewing: '#f59e0b',
  waiting: '#9ca3af',
  idle: '#6b7280',
  sprinting: '#34d399',
  discord: '#5865F2',
  working: '#f97316',
  reading: '#38bdf8',
  done: '#22c55e',
  error: '#ef4444'
}

/**
 * Agent state colors
 */
export const AGENT_STATE_COLORS: Record<string, string> = {
  running: '#34d399',
  completed: '#6b7280',
  failed: '#ef4444'
}
