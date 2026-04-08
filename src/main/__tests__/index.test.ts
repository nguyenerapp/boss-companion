import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, clipboard } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { watch } from 'chokidar'
import { existsSync } from 'fs'

// Mock Electron
vi.mock('electron', () => {
  const ipcMainMock = {
    handle: vi.fn(),
    on: vi.fn(),
  }

  const appMock = {
    whenReady: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    setName: vi.fn(),
    quit: vi.fn(),
  }

  const mockWindow = {
    setIgnoreMouseEvents: vi.fn(),
    setContentProtection: vi.fn(),
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    webContents: {
      on: vi.fn(),
      send: vi.fn(),
      toggleDevTools: vi.fn(),
      getZoomFactor: vi.fn().mockReturnValue(1.0),
    },
    hide: vi.fn(),
    show: vi.fn(),
    setContentSize: vi.fn(),
    setPosition: vi.fn(),
    getPosition: vi.fn().mockReturnValue([0, 0]),
    id: 1,
  }

  const BrowserWindowMock = vi.fn(function() {
    return mockWindow
  })

  // Add static method
  Object.assign(BrowserWindowMock, {
    fromWebContents: vi.fn(),
    mockWindow, // helper to access the mock instance in tests
  })

  const electronMock = {
    app: appMock,
    BrowserWindow: BrowserWindowMock,
    ipcMain: ipcMainMock,
    screen: {
      getPrimaryDisplay: vi.fn().mockReturnValue({ workAreaSize: { width: 1920, height: 1080 } }),
      getCursorScreenPoint: vi.fn().mockReturnValue({ x: 100, y: 100 }),
    },
    Menu: {
      buildFromTemplate: vi.fn().mockReturnValue({ popup: vi.fn() }),
    },
    Tray: vi.fn(function() {
      return {
        setContextMenu: vi.fn(),
        setImage: vi.fn(),
        setToolTip: vi.fn(),
      }
    }),
    nativeImage: {
      createFromBuffer: vi.fn().mockReturnValue({
        setTemplateImage: vi.fn(),
      }),
    },
    clipboard: {
      writeText: vi.fn(),
    },
  }
  return { ...electronMock, default: electronMock }
})

// Mock other modules
vi.mock('fs/promises', () => {
  const mock = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  }
  return { ...mock, default: mock }
})

vi.mock('fs', () => {
  const mock = {
    existsSync: vi.fn(),
  }
  return { ...mock, default: mock }
})

vi.mock('chokidar', () => {
  const mock = {
    watch: vi.fn().mockReturnValue({
      on: vi.fn(),
      close: vi.fn(),
    }),
  }
  return { ...mock, default: mock }
})

describe('Main Process', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFile).mockResolvedValue('{}')
    // Load the main process file to register handlers
    await import('../index')
  })

  afterEach(() => {
    vi.resetModules()
  })

  // Helper to extract registered handlers
  const getHandler = (name: string, type: 'on' | 'handle' = 'on') => {
    const calls = vi.mocked(ipcMain[type]).mock.calls
    const call = calls.find(c => c[0] === name)
    if (!call) throw new Error(`Handler ${name} not found`)
    return call[1]
  }

  const getAppEventHandler = (name: string) => {
    const calls = vi.mocked(app.on).mock.calls
    const call = calls.find(c => c[0] === name)
    if (!call) throw new Error(`App event handler ${name} not found`)
    return call[1]
  }

  describe('IPC Message Handlers', () => {
    it('handles get-status', async () => {
      const handler = getHandler('get-status', 'handle')
      const status = { state: 'test' }
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(status))

      const result = await handler({} as any)
      expect(result).toEqual(status)
    })

    it('handles report-error', () => {
      const handler = getHandler('report-error')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      handler({} as any, 'test error', 'error info')
      expect(consoleSpy).toHaveBeenCalledWith('[boss-companion] Renderer error reported:', 'test error', 'error info')
      consoleSpy.mockRestore()
    })

    it('handles copy-to-clipboard', () => {
      const handler = getHandler('copy-to-clipboard')
      handler({} as any, 'test text')
      expect(clipboard.writeText).toHaveBeenCalledWith('test text')
    })

    it('handles minimize-window', () => {
      const handler = getHandler('minimize-window')
      // To test this we need mainWindow to be initialized.
      // app.whenReady() callback creates the window.
      const readyHandler = vi.mocked(app.whenReady).mock.results[0]?.value
      // Actually we just call the handler and verify no crash, or verify tray menu update
      handler({} as any)
    })

    it('handles restore-window', () => {
      const handler = getHandler('restore-window')
      handler({} as any)
    })

    it('handles resize-window', async () => {
      const handler = getHandler('resize-window')
      vi.useFakeTimers()
      handler({} as any, 500, 600)
      vi.runAllTimers()
      vi.useRealTimers()
    })

    it('handles get-preferences', async () => {
      const handler = getHandler('get-preferences', 'handle')
      const prefs = { displayMode: 'emoji', scale: 1.0 }
      vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(prefs))

      const result = await handler({} as any)
      expect(result).toEqual(prefs)
    })

    it('handles set-preferences', async () => {
      const handler = getHandler('set-preferences', 'handle')
      const prefs = { displayMode: 'emoji', scale: 1.0 }

      await handler({} as any, prefs)
      expect(writeFile).toHaveBeenCalled()
    })

    it('handles show-context-menu', () => {
      const handler = getHandler('show-context-menu')
      const win = {}
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValueOnce(win as any)
      handler({ sender: {} } as any)
      expect(Menu.buildFromTemplate).toHaveBeenCalled()
    })

    it('handles drag-start, drag-move, drag-end', () => {
      const startHandler = getHandler('drag-start')
      const moveHandler = getHandler('drag-move')
      const endHandler = getHandler('drag-end')

      startHandler({} as any)
      moveHandler({} as any)
      endHandler({} as any)
    })
  })

  describe('App Lifecycle Events', () => {
    it('handles before-quit', () => {
      const handler = getAppEventHandler('before-quit')
      handler({} as any)
    })

    it('handles window-all-closed on win32', () => {
      const handler = getAppEventHandler('window-all-closed')
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })
      handler()
      expect(app.quit).toHaveBeenCalled()
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('handles window-all-closed on darwin', () => {
      const handler = getAppEventHandler('window-all-closed')
      vi.mocked(app.quit).mockClear()
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      handler()
      expect(app.quit).not.toHaveBeenCalled()
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('handles activate', () => {
      const handler = getAppEventHandler('activate')
      handler()
    })
  })
})
