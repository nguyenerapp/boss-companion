import { describe, it, expect, vi } from 'vitest'
import {
  formatElapsed,
  formatCountdown,
  isValidBossState,
  isValidStatus,
  PHASE_COLORS,
  STATE_COLORS,
  AGENT_STATE_COLORS
} from '../utils'

describe('formatElapsed', () => {
  it('returns seconds for recent timestamps', () => {
    const now = 1000000
    expect(formatElapsed(now - 5000, now)).toBe('5s ago')
    expect(formatElapsed(now - 0, now)).toBe('0s ago')
    expect(formatElapsed(now - 59000, now)).toBe('59s ago')
  })

  it('returns minutes for timestamps over 60s', () => {
    const now = 1000000
    expect(formatElapsed(now - 60000, now)).toBe('1m ago')
    expect(formatElapsed(now - 120000, now)).toBe('2m ago')
    expect(formatElapsed(now - 3540000, now)).toBe('59m ago')
  })

  it('returns hours for timestamps over 60m', () => {
    const now = 10000000
    expect(formatElapsed(now - 3600000, now)).toBe('1h ago')
    expect(formatElapsed(now - 7200000, now)).toBe('2h ago')
  })

  it('returns days for timestamps over 24h', () => {
    const now = 100000000
    expect(formatElapsed(now - 86400000, now)).toBe('1d ago')
    expect(formatElapsed(now - 172800000, now)).toBe('2d ago')
  })

  it('handles future timestamps gracefully (clamps to 0)', () => {
    const now = 1000000
    expect(formatElapsed(now + 5000, now)).toBe('0s ago')
  })

  it('uses Date.now() by default if now is not provided', () => {
    const now = 1000000000000
    vi.useFakeTimers()
    vi.setSystemTime(now)
    expect(formatElapsed(now - 15000)).toBe('15s ago')
    vi.useRealTimers()
  })
})

describe('formatCountdown', () => {
  it('returns "now" for zero or negative', () => {
    expect(formatCountdown(0)).toBe('now')
    expect(formatCountdown(-1000)).toBe('now')
  })

  it('returns minutes for short durations', () => {
    expect(formatCountdown(60000)).toBe('1m')
    expect(formatCountdown(45 * 60000)).toBe('45m')
  })

  it('returns hours and minutes for longer durations', () => {
    expect(formatCountdown(90 * 60000)).toBe('1h 30m')
    expect(formatCountdown(60 * 60000)).toBe('1h')
    expect(formatCountdown(150 * 60000)).toBe('2h 30m')
  })

  it('rounds up partial minutes', () => {
    expect(formatCountdown(30000)).toBe('1m') // 30s rounds up to 1m
    expect(formatCountdown(61000)).toBe('2m') // 61s rounds up to 2m
  })
})

describe('isValidBossState', () => {
  it('accepts all valid states', () => {
    const states = [
      'thinking', 'delegating', 'reviewing', 'waiting', 'idle',
      'sprinting', 'discord', 'working', 'reading', 'done', 'error'
    ]
    for (const state of states) {
      expect(isValidBossState(state)).toBe(true)
    }
  })

  it('rejects invalid states', () => {
    expect(isValidBossState('running')).toBe(false)
    expect(isValidBossState('sleeping')).toBe(false)
    expect(isValidBossState('')).toBe(false)
    expect(isValidBossState(null)).toBe(false)
    expect(isValidBossState(undefined)).toBe(false)
    expect(isValidBossState(42)).toBe(false)
    expect(isValidBossState({})).toBe(false)
    expect(isValidBossState([])).toBe(false)
  })
})

describe('isValidStatus', () => {
  const validStatus = {
    state: 'idle',
    action: 'Waiting...',
    agents: [],
    discord: { pending: 0 },
    eventLoop: { phase: 'idle' },
    tokens: { context: 0, output: 0 },
    timestamp: Date.now()
  }

  it('accepts a valid status object', () => {
    expect(isValidStatus(validStatus)).toBe(true)
  })

  it('accepts status with agents', () => {
    const status = {
      ...validStatus,
      agents: [{ id: 'a1', description: 'test', state: 'running', startedAt: Date.now() }]
    }
    expect(isValidStatus(status)).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidStatus(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isValidStatus('string')).toBe(false)
    expect(isValidStatus(42)).toBe(false)
    expect(isValidStatus(undefined)).toBe(false)
  })

  it('rejects missing state', () => {
    const { state: _s, ...rest } = validStatus
    expect(isValidStatus(rest)).toBe(false)
  })

  it('rejects invalid state value', () => {
    expect(isValidStatus({ ...validStatus, state: 'invalid' })).toBe(false)
  })

  it('rejects missing action', () => {
    const { action: _a, ...rest } = validStatus
    expect(isValidStatus(rest)).toBe(false)
  })

  it('rejects missing agents array', () => {
    const { agents: _ag, ...rest } = validStatus
    expect(isValidStatus(rest)).toBe(false)
  })

  it('rejects missing timestamp', () => {
    const { timestamp: _t, ...rest } = validStatus
    expect(isValidStatus(rest)).toBe(false)
  })
})

describe('color constants', () => {
  it('PHASE_COLORS has all expected phases', () => {
    expect(PHASE_COLORS.work_hours).toBe('#34d399')
    expect(PHASE_COLORS.off_hours).toBe('#60a5fa')
    expect(PHASE_COLORS.weekend).toBe('#f59e0b')
  })

  it('STATE_COLORS covers all BossState values', () => {
    const expectedStates = [
      'thinking', 'delegating', 'reviewing', 'waiting', 'idle',
      'sprinting', 'discord', 'working', 'reading', 'done', 'error'
    ]
    for (const state of expectedStates) {
      expect(STATE_COLORS[state]).toBeDefined()
      expect(STATE_COLORS[state]).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('AGENT_STATE_COLORS covers all agent states', () => {
    expect(AGENT_STATE_COLORS.running).toBeDefined()
    expect(AGENT_STATE_COLORS.completed).toBeDefined()
    expect(AGENT_STATE_COLORS.failed).toBeDefined()
  })
})
