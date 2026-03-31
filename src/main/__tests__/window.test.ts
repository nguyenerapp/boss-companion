import { describe, it, expect, vi, beforeEach } from 'vitest'
import { app, BrowserWindow, ipcMain } from 'electron'

// Mock dependencies
vi.mock('electron', () => {
  const browserWindowMock = {
    hide: vi.fn(),
    show: vi.fn(),
    setPosition: vi.fn(),
    setContentSize: vi.fn(),
    setIgnoreMouseEvents: vi.fn(),
    setContentProtection: vi.fn(),
    loadFile: vi.fn(),
    loadURL: vi.fn(),
    webContents: {
      on: vi.fn(),
      send: vi.fn(),
      getZoomFactor: vi.fn().mockReturnValue(1),
      toggleDevTools: vi.fn(),
    },
    on: vi.fn(),
  }

  const BrowserWindowConstructor = vi.fn(function() { return browserWindowMock })
  ;(BrowserWindowConstructor as any).fromWebContents = vi.fn()

  let appReadyHandler: () => Promise<void>
  const appMock = {
    whenReady: vi.fn().mockImplementation(() => {
      return {
        then: (cb: () => Promise<void>) => {
          appReadyHandler = cb
          return Promise.resolve()
        }
      }
    }),
    setName: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
    // Expose handler trigger for testing
    emitReady: async () => {
      if (appReadyHandler) await appReadyHandler()
    }
  }

  const ipcHandlers: Record<string, Function> = {}
  const ipcMainMock = {
    on: vi.fn((channel, listener) => {
      ipcHandlers[channel] = listener
    }),
    handle: vi.fn(),
    // Expose trigger
    emit: (channel: string, event: any, ...args: any[]) => {
      if (ipcHandlers[channel]) ipcHandlers[channel](event, ...args)
    }
  }

  const trayMock = {
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    setImage: vi.fn()
  }

  return {
    app: appMock,
    BrowserWindow: BrowserWindowConstructor,
    ipcMain: ipcMainMock,
    screen: {
      getPrimaryDisplay: vi.fn(() => ({
        workAreaSize: { width: 1920, height: 1080 }
      })),
      getCursorScreenPoint: vi.fn(() => ({ x: 0, y: 0 }))
    },
    Menu: {
      buildFromTemplate: vi.fn(() => ({
        popup: vi.fn()
      }))
    },
    Tray: vi.fn(function() { return trayMock }),
    nativeImage: {
      createFromBuffer: vi.fn(() => ({
        setTemplateImage: vi.fn()
      }))
    },
    clipboard: {
      writeText: vi.fn()
    }
  }
})

vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn()
  }))
}))

vi.mock('fs/promises', () => ({ default: { readFile: vi.fn().mockRejectedValue(new Error('ENOENT')), writeFile: vi.fn().mockResolvedValue(undefined), mkdir: vi.fn().mockResolvedValue(undefined) },
  readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('fs', () => ({ default: { existsSync: vi.fn().mockReturnValue(false) },
  existsSync: vi.fn().mockReturnValue(false)
}))

describe('Main Process - Window Management', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('creates window on app ready', async () => {
    // Dynamically import to run index.ts
    await import('../index')

    // Trigger app ready
    await (app as any).emitReady()

    // Verify window creation
    expect(BrowserWindow).toHaveBeenCalledTimes(1)
    expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
      title: 'BOSS Companion',
      width: 280, // Base width * scale 1.0
      height: 400,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      hasShadow: true,
      resizable: true,
    }))
  })

  it('minimizes to tray via ipc', async () => {
    await import('../index')
    await (app as any).emitReady()

    const winMock = vi.mocked(BrowserWindow).mock.results[0].value

    // Trigger minimize
    ;(ipcMain as any).emit('minimize-window', {})

    expect(winMock.hide).toHaveBeenCalledTimes(1)
  })

  it('restores window via ipc', async () => {
    await import('../index')
    await (app as any).emitReady()

    const winMock = vi.mocked(BrowserWindow).mock.results[0].value

    // Minimize first to set isMinimized state
    ;(ipcMain as any).emit('minimize-window', {})

    // Restore
    ;(ipcMain as any).emit('restore-window', {})

    expect(winMock.show).toHaveBeenCalledTimes(1)
  })
})
