// BOSS-specific pet states (superset of agent-paperclip states)
export type BossState =
  | 'thinking'
  | 'delegating'
  | 'reviewing'
  | 'waiting'
  | 'idle'
  | 'sprinting'
  | 'discord'
  | 'working'
  | 'reading'
  | 'done'
  | 'error'

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
export type DisplayMode = 'css-art' | 'emoji' | 'minimal'

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
