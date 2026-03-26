/**
 * Electron Preload Bridge
 *
 * Exposes a secure, typed API to the renderer process via `window.electronAPI`.
 * This acts as the boundary between the isolated web context and Node.js.
 *
 * Security Considerations:
 * - We never expose the raw `ipcRenderer` or Node built-ins to the renderer.
 * - Only explicit, expected IPC channels are permitted.
 * - `contextBridge` ensures contexts are completely isolated, preventing prototype pollution.
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { BossStatus, StatusCallback, Preferences } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Fetches the current BOSS status.
   */
  getStatus: (): Promise<BossStatus> => ipcRenderer.invoke('get-status'),
  /**
   * Subscribes to status updates.
   * @param callback Function called on status change
   * @returns Unsubscribe function
   */
  onStatusUpdate: (callback: StatusCallback): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: BossStatus): void => {
      callback(status)
    }
    ipcRenderer.on('status-update', handler)
    return () => {
      ipcRenderer.removeListener('status-update', handler)
    }
  },
  /**
   * Notifies main process that window dragging started.
   */
  dragStart: (): void => {
    ipcRenderer.send('drag-start')
  },
  /**
   * Notifies main process that window dragging is continuing.
   */
  dragMove: (): void => {
    ipcRenderer.send('drag-move')
  },
  /**
   * Notifies main process that window dragging ended.
   */
  dragEnd: (): void => {
    ipcRenderer.send('drag-end')
  },
  /**
   * Copies text to the system clipboard securely.
   */
  copyToClipboard: (text: string): void => {
    ipcRenderer.send('copy-to-clipboard', text)
  },
  /**
   * Requests the main process to show the application context menu.
   */
  showContextMenu: (): void => {
    ipcRenderer.send('show-context-menu')
  },
  /**
   * Minimizes the application window.
   */
  minimizeWindow: (): void => {
    ipcRenderer.send('minimize-window')
  },
  /**
   * Restores the application window from minimized state.
   */
  restoreWindow: (): void => {
    ipcRenderer.send('restore-window')
  },
  /**
   * Requests a window resize.
   */
  resizeWindow: (width: number, height: number): void => {
    ipcRenderer.send('resize-window', width, height)
  },
  /**
   * Fetches user preferences.
   */
  getPreferences: (): Promise<Preferences> => ipcRenderer.invoke('get-preferences'),
  /**
   * Saves updated user preferences.
   */
  setPreferences: (prefs: Preferences): Promise<void> => ipcRenderer.invoke('set-preferences', prefs),
  /**
   * Subscribes to preference updates.
   * @param callback Function called on preference change
   * @returns Unsubscribe function
   */
  onPreferencesUpdate: (callback: (prefs: Preferences) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, prefs: Preferences): void => {
      callback(prefs)
    }
    ipcRenderer.on('preferences-update', handler)
    return () => {
      ipcRenderer.removeListener('preferences-update', handler)
    }
  },
  /**
   * Subscribes to window zoom level changes.
   * @param callback Function called when zoom changes
   * @returns Unsubscribe function
   */
  onZoomChanged: (callback: () => void): (() => void) => {
    const handler = (): void => { callback() }
    ipcRenderer.on('zoom-changed', handler)
    return () => { ipcRenderer.removeListener('zoom-changed', handler) }
  }
})
