import { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, clipboard } from 'electron'
import { join } from 'path'
import { watch } from 'chokidar'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { homedir } from 'os'
import type { BossStatus, DisplayMode, Preferences } from '../shared/types'

const STATUS_DIR = join(homedir(), '.boss-companion')
const STATUS_FILE = join(STATUS_DIR, 'status.json')
const PREFS_FILE = join(STATUS_DIR, 'preferences.json')
const debug = !!process.env.COMPANION_DEBUG

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let lastStatus: BossStatus | null = null
let isMinimized = false
let currentDisplayMode: DisplayMode = 'css-art'
let currentScale: number = 1.0

const BASE_WIDTH = 280

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

const DEFAULT_PREFS: Preferences = { displayMode: 'css-art', scale: 1.0 }

async function readPreferences(): Promise<Preferences> {
  try {
    const content = await readFile(PREFS_FILE, 'utf-8')
    const prefs = JSON.parse(content) as Preferences
    // Validate displayMode
    if (!['css-art', 'emoji', 'minimal', 'call-duck', 'meme-pack'].includes(prefs.displayMode)) {
      return { ...DEFAULT_PREFS }
    }
    // Validate scale
    if (prefs.scale == null || ![0.8, 1.0, 1.3].includes(prefs.scale)) {
      prefs.scale = 1.0
    }
    return prefs
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

async function writePreferences(prefs: Preferences): Promise<void> {
  await ensureStatusDir()
  await writeFile(PREFS_FILE, JSON.stringify(prefs, null, 2), 'utf-8')
  currentDisplayMode = prefs.displayMode
  const newScale = prefs.scale ?? 1.0
  currentScale = newScale
  // Notify renderer of preference change
  if (mainWindow) {
    mainWindow.webContents.send('preferences-update', prefs)
  }
  // Rebuild context menu to reflect new selection
  updateTrayMenu()
}

/**
 * Returns a snapshot of current preferences for partial updates
 */
function currentPrefsSnapshot(): Preferences {
  return { displayMode: currentDisplayMode, scale: currentScale }
}

/**
 * Create a simple text-based tray icon using NativeImage
 */
function createTrayIcon(badge: number = 0): Electron.NativeImage {
  // 22x22 is the standard macOS tray icon size
  const size = 22
  const canvas = Buffer.alloc(size * size * 4, 0) // RGBA

  // Draw a simple "B" shape in white pixels
  // Using a basic 5x7 bitmap pattern for "B", centered in 22x22
  const bPattern = [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ]

  const offsetX = 4
  const offsetY = 4
  const scale = 2

  for (let row = 0; row < bPattern.length; row++) {
    for (let col = 0; col < bPattern[row].length; col++) {
      if (bPattern[row][col]) {
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = offsetX + col * scale + sx
            const py = offsetY + row * scale + sy
            if (px < size && py < size) {
              const idx = (py * size + px) * 4
              canvas[idx] = 255     // R
              canvas[idx + 1] = 255 // G
              canvas[idx + 2] = 255 // B
              canvas[idx + 3] = 255 // A
            }
          }
        }
      }
    }
  }

  // Draw badge dot (red) in top-right corner if badge > 0
  if (badge > 0) {
    const dotRadius = 3
    const dotCenterX = size - dotRadius - 1
    const dotCenterY = dotRadius + 1
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - dotCenterX
        const dy = y - dotCenterY
        if (dx * dx + dy * dy <= dotRadius * dotRadius) {
          const idx = (y * size + x) * 4
          canvas[idx] = 239     // R (red)
          canvas[idx + 1] = 68  // G
          canvas[idx + 2] = 68  // B
          canvas[idx + 3] = 255 // A
        }
      }
    }
  }

  const img = nativeImage.createFromBuffer(canvas, { width: size, height: size })
  img.setTemplateImage(true)
  return img
}

function setupTray(): void {
  tray = new Tray(createTrayIcon(0))
  updateTrayMenu()
  tray.setToolTip('BOSS Companion - Idle')
}

function updateTrayMenu(): void {
  if (!tray) return

  const stateLabel = lastStatus ? `${lastStatus.state.toUpperCase()}: ${lastStatus.action}` : 'Idle'

  const contextMenu = Menu.buildFromTemplate([
    { label: stateLabel, enabled: false },
    { type: 'separator' },
    {
      label: isMinimized ? 'Show Window' : 'Hide Window',
      click: (): void => {
        if (isMinimized) {
          mainWindow?.show()
          isMinimized = false
        } else {
          mainWindow?.hide()
          isMinimized = true
        }
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: 'Reset Position',
      click: (): void => {
        if (!mainWindow) return
        const { width, height } = screen.getPrimaryDisplay().workAreaSize
        mainWindow.setPosition(width - 300, height - 420)
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: (): void => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // Update tray icon badge and tooltip
  const badge = lastStatus?.discord.pending ?? 0
  tray.setImage(createTrayIcon(badge))
  tray.setToolTip(`BOSS Companion - ${lastStatus?.state ?? 'idle'}: ${lastStatus?.action ?? 'Waiting...'}`)
}

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  const scaledWidth = Math.round(BASE_WIDTH * currentScale)

  // Discord screen share detection: skipTaskbar removed because on macOS it sets
  // NSWindow.collectionBehavior to .transient, which excludes the window from
  // CGWindowListCopyWindowInfo / ScreenCaptureKit enumeration. The title property
  // ensures the window has an identifiable name in the picker.
  mainWindow = new BrowserWindow({
    title: 'BOSS Companion',
    width: scaledWidth,
    height: Math.round(400 * currentScale),
    x: width - 300,
    y: height - 420,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.setIgnoreMouseEvents(false)

  // Ensure the window is shareable for Discord/OBS screen capture.
  // setContentProtection(false) sets NSWindow.sharingType = .readOnly on macOS,
  // making the window visible to ScreenCaptureKit / CGWindowListCopyWindowInfo.
  mainWindow.setContentProtection(false)

  // Sync window size when Electron zoom level changes (CMD+/-)
  mainWindow.webContents.on('zoom-changed', () => {
    if (!mainWindow) return
    // Notify renderer to re-measure and send new dimensions
    mainWindow.webContents.send('zoom-changed')
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

let statusWatcher: ReturnType<typeof watch> | null = null
let pollingInterval: ReturnType<typeof setInterval> | null = null

function setupStatusWatcher(): void {
  // P1 fix: Watch the DIRECTORY instead of the file.
  // On macOS, atomic writes (temp file + rename) can cause chokidar to lose
  // track of a watched file. Watching the directory catches rename events.
  if (debug) console.log(`[boss-companion] watching directory ${STATUS_DIR} for status.json changes`)

  statusWatcher = watch(STATUS_DIR, {
    persistent: true,
    ignoreInitial: false,
    depth: 0
  })

  const handleFileEvent = (filePath: string): void => {
    // Only react to status.json changes
    if (!filePath.endsWith('status.json')) return
    sendStatus()
  }

  statusWatcher.on('add', handleFileEvent)
  statusWatcher.on('change', handleFileEvent)
  statusWatcher.on('unlink', (filePath: string) => {
    if (!filePath.endsWith('status.json')) return
    if (debug) console.log('[boss-companion] status.json deleted — resetting to default')
    lastStatus = null
    if (mainWindow) {
      mainWindow.webContents.send('status-update', { ...DEFAULT_STATUS, timestamp: Date.now() })
    }
    updateTrayMenu()
  })
  statusWatcher.on('error', (err) => {
    console.error('[boss-companion] watcher error:', err)
  })

  // P1 fix: 60-second polling fallback in case the file watcher misses an update
  pollingInterval = setInterval(() => {
    if (debug) console.log('[boss-companion] polling fallback — re-reading status.json')
    sendStatus()
  }, 60_000)
}

async function sendStatus(): Promise<void> {
  const status = await readStatus()
  lastStatus = status

  if (debug) console.log(`[boss-companion] state=${status.state} action="${status.action}" agents=${status.agents.length}`)

  if (mainWindow) {
    mainWindow.webContents.send('status-update', status)
  }

  // Update tray
  updateTrayMenu()
}

// IPC handlers
ipcMain.handle('get-status', async () => {
  return await readStatus()
})

ipcMain.on('report-error', (_event, error: string, errorInfo: string) => {
  console.error('[boss-companion] Renderer error reported:', error, errorInfo)
})

ipcMain.on('copy-to-clipboard', (_event, text: string) => {
  clipboard.writeText(text)
})

ipcMain.on('minimize-window', () => {
  mainWindow?.hide()
  isMinimized = true
  updateTrayMenu()
})

ipcMain.on('restore-window', () => {
  mainWindow?.show()
  isMinimized = false
  updateTrayMenu()
})

let resizeTimer: ReturnType<typeof setTimeout> | null = null

ipcMain.on('resize-window', (_event, width: number, height: number) => {
  if (!mainWindow) return
  // Debounce to prevent rapid resize calls during zoom
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (!mainWindow) return
    try {
      const zoomFactor = mainWindow.webContents.getZoomFactor()
      const scaledWidth = Math.max(100, Math.min(1200, Math.round(width * zoomFactor)))
      const scaledHeight = Math.max(100, Math.min(1200, Math.round(height * zoomFactor)))
      mainWindow.setContentSize(scaledWidth, scaledHeight)
    } catch {
      // Window may have been destroyed during timeout
    }
  }, 50)
})

// Preference IPC handlers
ipcMain.handle('get-preferences', async () => {
  return await readPreferences()
})

ipcMain.handle('set-preferences', async (_event, prefs: Preferences) => {
  await writePreferences(prefs)
})

// Context menu
ipcMain.on('show-context-menu', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return

  const displayModes: { label: string; value: DisplayMode }[] = [
    { label: 'CSS Art', value: 'css-art' },
    { label: 'Call Duck', value: 'call-duck' },
    { label: 'Emoji', value: 'emoji' },
    { label: 'Meme Pack', value: 'meme-pack' },
    { label: 'Minimal', value: 'minimal' }
  ]

  const sizeOptions: { label: string; value: number }[] = [
    { label: 'Small (0.8x)', value: 0.8 },
    { label: 'Normal (1.0x)', value: 1.0 },
    { label: 'Large (1.3x)', value: 1.3 }
  ]

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Character Style',
      submenu: displayModes.map(({ label, value }) => ({
        label,
        type: 'radio' as const,
        checked: currentDisplayMode === value,
        click: (): void => {
          writePreferences({ ...currentPrefsSnapshot(), displayMode: value })
        }
      }))
    },
    {
      label: 'Size',
      submenu: sizeOptions.map(({ label, value }) => ({
        label,
        type: 'radio' as const,
        checked: currentScale === value,
        click: (): void => {
          writePreferences({ ...currentPrefsSnapshot(), scale: value })
        }
      }))
    },
    { type: 'separator' },
    {
      label: 'Reset Position',
      click: (): void => {
        const { width, height } = screen.getPrimaryDisplay().workAreaSize
        win.setPosition(width - 300, height - 420)
      }
    },
    {
      label: debug ? 'Debug: ON' : 'Toggle Debug',
      click: (): void => {
        if (mainWindow) {
          mainWindow.webContents.toggleDevTools()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: (): void => {
        app.quit()
      }
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  menu.popup({ window: win })
})

// Drag support — uses screen coordinates from the main process
let dragState: { startX: number; startY: number; winX: number; winY: number } | null = null

ipcMain.on('drag-start', () => {
  if (!mainWindow) return
  const { x, y } = screen.getCursorScreenPoint()
  const [winX, winY] = mainWindow.getPosition()
  dragState = { startX: x, startY: y, winX, winY }
})

ipcMain.on('drag-move', () => {
  if (!mainWindow || !dragState) return
  const { x, y } = screen.getCursorScreenPoint()
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

  // Load saved preferences
  const prefs = await readPreferences()
  currentDisplayMode = prefs.displayMode
  currentScale = prefs.scale ?? 1.0

  createWindow()
  setupTray()
  setupStatusWatcher()

  // Send initial status after window loads
  setTimeout(sendStatus, 1000)
})

app.on('before-quit', () => {
  if (statusWatcher) {
    statusWatcher.close()
    statusWatcher = null
  }
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  } else if (isMinimized) {
    mainWindow.show()
    isMinimized = false
    updateTrayMenu()
  }
})
