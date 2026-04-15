import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockApp = {
  whenReady: vi.fn().mockResolvedValue(undefined),
  setName: vi.fn(),
  on: vi.fn(),
  quit: vi.fn()
}

const mockWebContents = {
  send: vi.fn(),
  on: vi.fn(),
  getZoomFactor: vi.fn().mockReturnValue(1),
  toggleDevTools: vi.fn()
}

const mockWindow = {
  setPosition: vi.fn(),
  getPosition: vi.fn().mockReturnValue([0, 0]),
  hide: vi.fn(),
  show: vi.fn(),
  setContentSize: vi.fn(),
  setContentProtection: vi.fn(),
  setIgnoreMouseEvents: vi.fn(),
  loadFile: vi.fn(),
  loadURL: vi.fn(),
  webContents: mockWebContents,
  on: vi.fn()
}

const MockBrowserWindow = vi.fn(function() { return mockWindow })

const mockIpcMain = {
  handle: vi.fn(),
  on: vi.fn()
}

vi.mock('electron', () => {
  return {
    app: mockApp,
    BrowserWindow: Object.assign(MockBrowserWindow, {
      fromWebContents: vi.fn().mockReturnValue(mockWindow)
    }),
    ipcMain: mockIpcMain,
    screen: {
      getPrimaryDisplay: vi.fn().mockReturnValue({ workAreaSize: { width: 1920, height: 1080 } }),
      getCursorScreenPoint: vi.fn().mockReturnValue({ x: 100, y: 100 })
    },
    Menu: {
      buildFromTemplate: vi.fn()
    },
    Tray: vi.fn(function() { return {
      setToolTip: vi.fn(),
      setContextMenu: vi.fn(),
      setImage: vi.fn()
    } }),
    nativeImage: {
      createEmpty: vi.fn().mockReturnValue({}),
      createFromBuffer: vi.fn().mockReturnValue({ setTemplateImage: vi.fn() })
    },
    clipboard: {
      writeText: vi.fn()
    }
  }
})

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  const mock = {
    ...actual,
    readFile: vi.fn().mockResolvedValue('{}'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined)
  }
  return { ...mock, default: mock }
})

describe('Main Process', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('registers ipcMain handlers', async () => {
    await import('../index')

    // Check IPC handlers registration
    expect(mockIpcMain.handle).toHaveBeenCalledWith('get-status', expect.any(Function))
    expect(mockIpcMain.handle).toHaveBeenCalledWith('get-preferences', expect.any(Function))
    expect(mockIpcMain.handle).toHaveBeenCalledWith('set-preferences', expect.any(Function))

    expect(mockIpcMain.on).toHaveBeenCalledWith('report-error', expect.any(Function))
    expect(mockIpcMain.on).toHaveBeenCalledWith('copy-to-clipboard', expect.any(Function))
    expect(mockIpcMain.on).toHaveBeenCalledWith('minimize-window', expect.any(Function))
    expect(mockIpcMain.on).toHaveBeenCalledWith('restore-window', expect.any(Function))
    expect(mockIpcMain.on).toHaveBeenCalledWith('resize-window', expect.any(Function))
    expect(mockIpcMain.on).toHaveBeenCalledWith('show-context-menu', expect.any(Function))
    expect(mockIpcMain.on).toHaveBeenCalledWith('drag-start', expect.any(Function))
    expect(mockIpcMain.on).toHaveBeenCalledWith('drag-move', expect.any(Function))
    expect(mockIpcMain.on).toHaveBeenCalledWith('drag-end', expect.any(Function))
  })

  it('registers window management handlers', async () => {
    await import('../index')
    expect(mockApp.on).toHaveBeenCalledWith('activate', expect.any(Function))
    expect(mockApp.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function))
  })

  it('handles window management events correctly', async () => {
    await import('../index')

    // Test activate event
    const activateHandler = mockApp.on.mock.calls.find(c => c[0] === 'activate')![1]
    activateHandler()
    // By default, create window should be called if it was null
    expect(MockBrowserWindow).toHaveBeenCalled()

    // Test window-all-closed event
    const windowAllClosedHandler = mockApp.on.mock.calls.find(c => c[0] === 'window-all-closed')![1]

    // Mock process.platform
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32' })

    windowAllClosedHandler()
    expect(mockApp.quit).toHaveBeenCalled()

    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  it('handles IPC methods logic', async () => {
    await import('../index')

    const minimizeHandler = mockIpcMain.on.mock.calls.find(c => c[0] === 'minimize-window')![1]
    minimizeHandler(new Event('minimize'))
    expect(mockWindow.hide).toHaveBeenCalled()

    const restoreHandler = mockIpcMain.on.mock.calls.find(c => c[0] === 'restore-window')![1]
    restoreHandler(new Event('restore'))
    expect(mockWindow.show).toHaveBeenCalled()

    const copyHandler = mockIpcMain.on.mock.calls.find(c => c[0] === 'copy-to-clipboard')![1]
    copyHandler(new Event('copy'), 'test text')
    const { clipboard } = await import('electron')
    expect(clipboard.writeText).toHaveBeenCalledWith('test text')
  })

  it('handles ready event correctly', async () => {
    await import('../index')

    // Trigger whenReady
    const whenReadyHandler = await mockApp.whenReady()

    expect(mockApp.setName).toHaveBeenCalledWith('BOSS Companion')
    // Ensure window is created
    expect(MockBrowserWindow).toHaveBeenCalled()
  })
})
