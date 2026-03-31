import { describe, it, expect, vi, beforeEach } from 'vitest'
import { app, BrowserWindow, Menu, Tray, screen, nativeImage } from 'electron'

vi.mock('fs/promises', () => {
  return {
    readFile: vi.fn().mockResolvedValue(JSON.stringify({
      state: 'active',
      action: 'Testing',
      agents: [],
      discord: { pending: 5 },
      eventLoop: { phase: 'idle' },
      tokens: { context: 0, output: 0 },
      timestamp: Date.now()
    })),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    default: {
      readFile: vi.fn().mockResolvedValue(JSON.stringify({
        state: 'active',
        action: 'Testing',
        agents: [],
        discord: { pending: 5 },
        eventLoop: { phase: 'idle' },
        tokens: { context: 0, output: 0 },
        timestamp: Date.now()
      })),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined)
    }
  }
})

vi.mock('fs', () => {
  return {
    existsSync: vi.fn().mockReturnValue(true),
    default: {
      existsSync: vi.fn().mockReturnValue(true)
    }
  }
})

class MockTray {
  setToolTip = vi.fn()
  setContextMenu = vi.fn()
  setImage = vi.fn()
}

class MockBrowserWindow {
  show = vi.fn()
  hide = vi.fn()
  setPosition = vi.fn()
  webContents = {
    on: vi.fn(),
    send: vi.fn(),
    getZoomFactor: vi.fn().mockReturnValue(1.0)
  }
  setIgnoreMouseEvents = vi.fn()
  setContentProtection = vi.fn()
  loadURL = vi.fn()
  loadFile = vi.fn()
  on = vi.fn()
  setContentSize = vi.fn()
}

vi.mock('electron', () => {
  const mockApp = {
    whenReady: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn(),
    setName: vi.fn(),
    on: vi.fn()
  }

  const mockMenu = {
    buildFromTemplate: vi.fn().mockReturnValue('mock-menu'),
    popup: vi.fn()
  }

  const mockNativeImage = {
    createFromBuffer: vi.fn().mockReturnValue({ setTemplateImage: vi.fn() })
  }

  return {
    app: mockApp,
    BrowserWindow: vi.fn(function() { return new MockBrowserWindow() }),
    Menu: mockMenu,
    Tray: vi.fn(function() { return new MockTray() }),
    screen: {
      getPrimaryDisplay: vi.fn().mockReturnValue({
        workAreaSize: { width: 1920, height: 1080 }
      }),
      getCursorScreenPoint: vi.fn().mockReturnValue({ x: 0, y: 0 })
    },
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn()
    },
    nativeImage: mockNativeImage,
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

describe('Companion Tray Menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useFakeTimers()
  })

  it('creates menu items, handles clicks, and updates icon state', async () => {
    await import('../../main/index')

    const readyCallback = app.whenReady.mock.results[0].value
    await readyCallback

    // Advance fake timers just enough to trigger setTimeout(sendStatus, 1000)
    // without triggering setInterval(..., 60000) forever
    await vi.advanceTimersByTimeAsync(1100)
    // Clear the interval so it doesn't run infinitely
    vi.clearAllTimers()

    expect(Tray).toHaveBeenCalled()
    const trayInstance = vi.mocked(Tray).mock.results[0].value

    expect(Menu.buildFromTemplate).toHaveBeenCalled()

    // We expect the menu to be built multiple times. The last one should have the populated state.
    const lastCallArgs = vi.mocked(Menu.buildFromTemplate).mock.calls.at(-1)!
    const menuTemplate = lastCallArgs[0] as any[]

    expect(menuTemplate[0].label).toBe('ACTIVE: Testing')
    expect(menuTemplate[2].label).toBe('Hide Window')
    expect(menuTemplate[4].label).toBe('Reset Position')
    expect(menuTemplate[6].label).toBe('Quit')

    menuTemplate[4].click()
    const browserWindowInstance = vi.mocked(BrowserWindow).mock.results[0].value
    expect(browserWindowInstance.setPosition).toHaveBeenCalledWith(1920 - 300, 1080 - 420)

    menuTemplate[6].click()
    expect(app.quit).toHaveBeenCalled()

    menuTemplate[2].click()
    expect(browserWindowInstance.hide).toHaveBeenCalled()

    // After hiding, the menu is updated, fetch the latest
    const updatedCallArgs = vi.mocked(Menu.buildFromTemplate).mock.calls.at(-1)!
    const updatedMenuTemplate = updatedCallArgs[0] as any[]
    expect(updatedMenuTemplate[2].label).toBe('Show Window')

    updatedMenuTemplate[2].click()
    expect(browserWindowInstance.show).toHaveBeenCalled()

    // It should update tray image multiple times, the last one with discord.pending=5
    expect(trayInstance.setImage).toHaveBeenCalled()
    expect(nativeImage.createFromBuffer).toHaveBeenCalled()
    // Verify badge parameter is updated. Badge = 5, createTrayIcon modifies canvas with red dot.
    // nativeImage.createFromBuffer is called. We can't easily inspect canvas bytes in mock but it is called.
  })
})
