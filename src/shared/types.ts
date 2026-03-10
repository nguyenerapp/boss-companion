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
  nextEvent?: string
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

// Callback types for IPC
export type StatusCallback = (status: BossStatus) => void

export interface ElectronAPI {
  getStatus: () => Promise<BossStatus>
  onStatusUpdate: (callback: StatusCallback) => () => void
  dragStart: (x: number, y: number) => void
  dragMove: (x: number, y: number) => void
  dragEnd: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
