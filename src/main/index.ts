import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { watch } from 'chokidar'
import { readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { homedir } from 'os'
import type { BossStatus } from '../shared/types'

const STATUS_DIR = join(homedir(), '.boss-companion')
const STATUS_FILE = join(STATUS_DIR, 'status.json')
const debug = !!process.env.COMPANION_DEBUG

let mainWindow: BrowserWindow | null = null

const DEFAULT_STATUS: BossStatus = {
  state: 'idle',
  action: 'Waiting for BOSS...',
  agents: [],
  discord: { pending: 0 },
  eventLoop: { phase: 'idle' },
  tokens: { context: 0, output: 0 },
  timestamp: Date.now()
}

async function ensureStatusDir(): Promise<void> {
  if (!existsSync(STATUS_DIR)) {
    await mkdir(STATUS_DIR, { recursive: true })
  }
}

async function readStatus(): Promise<BossStatus> {
  try {
    const content = await readFile(STATUS_FILE, 'utf-8')
    return JSON.parse(content) as BossStatus
  } catch {
    return { ...DEFAULT_STATUS, timestamp: Date.now() }
  }
}

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: 280,
    height: 400,
    x: width - 300,
    y: height - 420,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.setIgnoreMouseEvents(false)

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function setupStatusWatcher(): void {
  if (debug) console.log(`[boss-companion] watching ${STATUS_FILE}`)

  const watcher = watch(STATUS_FILE, {
    persistent: true,
    ignoreInitial: false
  })

  watcher.on('add', () => sendStatus())
  watcher.on('change', () => sendStatus())
  watcher.on('error', (err) => {
    console.error('[boss-companion] watcher error:', err)
  })
}

async function sendStatus(): Promise<void> {
  if (!mainWindow) return
  const status = await readStatus()
  if (debug) console.log(`[boss-companion] state=${status.state} action="${status.action}" agents=${status.agents.length}`)
  mainWindow.webContents.send('status-update', status)
}

// IPC handlers
ipcMain.handle('get-status', async () => {
  return await readStatus()
})

// Drag support
let dragState: { startX: number; startY: number; winX: number; winY: number } | null = null

ipcMain.on('drag-start', (_event, { x, y }: { x: number; y: number }) => {
  if (!mainWindow) return
  const [winX, winY] = mainWindow.getPosition()
  dragState = { startX: x, startY: y, winX, winY }
})

ipcMain.on('drag-move', (_event, { x, y }: { x: number; y: number }) => {
  if (!mainWindow || !dragState) return
  const newX = dragState.winX + (x - dragState.startX)
  const newY = dragState.winY + (y - dragState.startY)
  mainWindow.setPosition(newX, newY)
})

ipcMain.on('drag-end', () => {
  dragState = null
})

app.whenReady().then(async () => {
  app.setName('BOSS Companion')
  await ensureStatusDir()
  createWindow()
  setupStatusWatcher()

  // Send initial status after window loads
  setTimeout(sendStatus, 1000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
