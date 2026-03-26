// BOSS-specific pet states (superset of agent-paperclip states)
export const BOSS_STATES = [
  'thinking',
  'delegating',
  'reviewing',
  'waiting',
  'idle',
  'sprinting',
  'discord',
  'working',
  'reading',
  'done',
  'error'
] as const

export type BossState = typeof BOSS_STATES[number]

export function isBossState(value: any): value is BossState {
  return BOSS_STATES.includes(value)
}


export interface AgentStatus {
  id: string
  description: string
  state: 'running' | 'completed' | 'failed'
  startedAt: number
}

export interface DiscordStatus {
  pending: number
  lastMessage?: string
}

export interface EventLoopStatus {
  phase: string
  currentSlot?: string
  nextSlotTime?: number
  upcomingSlots?: string[]
}

export interface TokenUsage {
  context: number
  output: number
}

export interface BossStatus {
  state: BossState
  action: string
  agents: AgentStatus[]
  discord: DiscordStatus
  eventLoop: EventLoopStatus
  tokens: TokenUsage
  timestamp: number
}

// Display mode for character rendering
export const DISPLAY_MODES = ['css-art', 'emoji', 'minimal', 'call-duck', 'meme-pack'] as const

export type DisplayMode = typeof DISPLAY_MODES[number]

export function isDisplayMode(value: any): value is DisplayMode {
  return DISPLAY_MODES.includes(value)
}

export interface Preferences {
  displayMode: DisplayMode
  scale?: number
}

// Callback types for IPC
export type StatusCallback = (status: BossStatus) => void

export interface ElectronAPI {
  getStatus: () => Promise<BossStatus>
  onStatusUpdate: (callback: StatusCallback) => () => void
  dragStart: () => void
  dragMove: () => void
  dragEnd: () => void
  copyToClipboard: (text: string) => void
  showContextMenu: () => void
  minimizeWindow: () => void
  restoreWindow: () => void
  resizeWindow: (width: number, height: number) => void
  getPreferences: () => Promise<Preferences>
  setPreferences: (prefs: Preferences) => Promise<void>
  onPreferencesUpdate: (callback: (prefs: Preferences) => void) => () => void
  onZoomChanged: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
