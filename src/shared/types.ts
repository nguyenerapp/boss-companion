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
  readonly id: string
  readonly description: string
  readonly state: 'running' | 'completed' | 'failed'
  readonly startedAt: number
}

export interface DiscordStatus {
  readonly pending: number
  readonly lastMessage?: string
}

export interface EventLoopStatus {
  readonly phase: string
  readonly currentSlot?: string
  readonly nextSlotTime?: number
  readonly upcomingSlots?: readonly string[]
}

export interface TokenUsage {
  readonly context: number
  readonly output: number
}

export interface BossStatus {
  readonly state: BossState
  readonly action: string
  readonly agents: readonly AgentStatus[]
  readonly discord: DiscordStatus
  readonly eventLoop: EventLoopStatus
  readonly tokens: TokenUsage
  readonly timestamp: number
}

// Display mode for character rendering
export type DisplayMode = 'css-art' | 'emoji' | 'minimal' | 'call-duck' | 'meme-pack'

export interface Preferences {
  readonly displayMode: DisplayMode
  readonly scale?: number
}

// Callback types for IPC
export type StatusCallback = (status: BossStatus) => void

export interface ElectronAPI {
  readonly getStatus: () => Promise<BossStatus>
  readonly onStatusUpdate: (callback: StatusCallback) => () => void
  readonly dragStart: () => void
  readonly dragMove: () => void
  readonly dragEnd: () => void
  readonly copyToClipboard: (text: string) => void
  readonly showContextMenu: () => void
  readonly minimizeWindow: () => void
  readonly restoreWindow: () => void
  readonly resizeWindow: (width: number, height: number) => void
  readonly getPreferences: () => Promise<Preferences>
  readonly setPreferences: (prefs: Preferences) => Promise<void>
  readonly onPreferencesUpdate: (callback: (prefs: Preferences) => void) => () => void
  readonly onZoomChanged: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
