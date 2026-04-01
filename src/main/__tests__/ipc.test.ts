import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain, clipboard, BrowserWindow } from 'electron'

// Mock Electron modules
vi.mock('electron', () => {
  const ipcMainMock = {
    on: vi.fn(),
    handle: vi.fn(),
  }

  return {
    app: {
      whenReady: vi.fn().mockResolvedValue(undefined),
      setName: vi.fn(),
      on: vi.fn(),
    },
    BrowserWindow: vi.fn(function() {
      return {
        webContents: {
          send: vi.fn(),
          getZoomFactor: vi.fn(() => 1.0),
          on: vi.fn(),
          toggleDevTools: vi.fn(),
          setWindowOpenHandler: vi.fn(),
        },
        setContentSize: vi.fn(),
        setPosition: vi.fn(),
        getPosition: vi.fn(() => [0, 0]),
        hide: vi.fn(),
        show: vi.fn(),
        on: vi.fn(),
        loadFile: vi.fn(),
        loadURL: vi.fn(),
        setIgnoreMouseEvents: vi.fn(),
        setContentProtection: vi.fn(),
      }
    }),
    ipcMain: ipcMainMock,
    screen: {
      getPrimaryDisplay: vi.fn(() => ({ workAreaSize: { width: 1920, height: 1080 } })),
      getCursorScreenPoint: vi.fn(() => ({ x: 100, y: 100 })),
    },
    Menu: {
      buildFromTemplate: vi.fn(),
    },
    Tray: vi.fn(function() {
      return {
        setToolTip: vi.fn(),
        setContextMenu: vi.fn(),
        setImage: vi.fn(),
      }
    }),
    nativeImage: {
      createEmpty: vi.fn(),
      createFromPath: vi.fn(),
      createFromBuffer: vi.fn(() => ({
        setTemplateImage: vi.fn(),
      })),
    },
    clipboard: {
      writeText: vi.fn(),
    },
  }
})

// Add static fromWebContents
vi.mocked(BrowserWindow).fromWebContents = vi.fn()

// Mock fs/promises
vi.mock('fs/promises', () => {
  const mock = {
    readFile: vi.fn().mockResolvedValue('{}'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  }
  return { ...mock, default: mock }
})

// Mock fs
vi.mock('fs', () => {
  const mock = {
    existsSync: vi.fn().mockReturnValue(true),
  }
  return { ...mock, default: mock }
})

// Mock chokidar
vi.mock('chokidar', () => {
  return {
    watch: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(),
    })),
  }
})

describe('IPC Message Handling', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    // Import main to trigger handler registration
    await import('../index')
  })

  it('should register all required IPC handlers', () => {
    expect(ipcMain.on).toHaveBeenCalledWith('report-error', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('copy-to-clipboard', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('minimize-window', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('restore-window', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('resize-window', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('show-context-menu', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('drag-start', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('drag-move', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('drag-end', expect.any(Function))

    expect(ipcMain.handle).toHaveBeenCalledWith('get-status', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('get-preferences', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('set-preferences', expect.any(Function))
  })

  it('should handle copy-to-clipboard', () => {
    const call = vi.mocked(ipcMain.on).mock.calls.find(c => c[0] === 'copy-to-clipboard')
    expect(call).toBeDefined()
    const handler = call![1]

    handler({}, 'test text')
    expect(clipboard.writeText).toHaveBeenCalledWith('test text')
  })

  it('should handle report-error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const call = vi.mocked(ipcMain.on).mock.calls.find(c => c[0] === 'report-error')
    expect(call).toBeDefined()
    const handler = call![1]

    handler({}, 'test error', 'test info')
    expect(consoleSpy).toHaveBeenCalledWith('[boss-companion] Renderer error reported:', 'test error', 'test info')

    consoleSpy.mockRestore()
  })

  it('should handle minimize-window and restore-window', () => {
    const minimizeCall = vi.mocked(ipcMain.on).mock.calls.find(c => c[0] === 'minimize-window')
    const restoreCall = vi.mocked(ipcMain.on).mock.calls.find(c => c[0] === 'restore-window')
    expect(minimizeCall).toBeDefined()
    expect(restoreCall).toBeDefined()

    const minimizeHandler = minimizeCall![1]
    const restoreHandler = restoreCall![1]

    minimizeHandler({})
    restoreHandler({})
  })

  it('should handle resize-window', () => {
    vi.useFakeTimers()
    const resizeCall = vi.mocked(ipcMain.on).mock.calls.find(c => c[0] === 'resize-window')
    expect(resizeCall).toBeDefined()
    const handler = resizeCall![1]

    handler({}, 800, 600)
    vi.runAllTimers()
    vi.useRealTimers()
  })

  it('should handle get-status', async () => {
    const getStatusCall = vi.mocked(ipcMain.handle).mock.calls.find(c => c[0] === 'get-status')
    expect(getStatusCall).toBeDefined()
    const handler = getStatusCall![1]

    const status = await handler({})
    expect(status).toBeDefined()
  })

  it('should handle drag-start, drag-move, drag-end', () => {
    const dragStartCall = vi.mocked(ipcMain.on).mock.calls.find(c => c[0] === 'drag-start')
    const dragMoveCall = vi.mocked(ipcMain.on).mock.calls.find(c => c[0] === 'drag-move')
    const dragEndCall = vi.mocked(ipcMain.on).mock.calls.find(c => c[0] === 'drag-end')

    expect(dragStartCall).toBeDefined()
    expect(dragMoveCall).toBeDefined()
    expect(dragEndCall).toBeDefined()

    const dragStartHandler = dragStartCall![1]
    const dragMoveHandler = dragMoveCall![1]
    const dragEndHandler = dragEndCall![1]

    dragStartHandler({})
    dragMoveHandler({})
    dragEndHandler({})
  })
})
