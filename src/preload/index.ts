import { contextBridge, ipcRenderer } from 'electron'
import type { BossStatus, StatusCallback, Preferences } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: (): Promise<BossStatus> => ipcRenderer.invoke('get-status'),
  onStatusUpdate: (callback: StatusCallback): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: BossStatus): void => {
      callback(status)
    }
    ipcRenderer.on('status-update', handler)
    return () => {
      ipcRenderer.removeListener('status-update', handler)
    }
  },
  dragStart: (): void => {
    ipcRenderer.send('drag-start')
  },
  dragMove: (): void => {
    ipcRenderer.send('drag-move')
  },
  dragEnd: (): void => {
    ipcRenderer.send('drag-end')
  },
  copyToClipboard: (text: string): void => {
    ipcRenderer.send('copy-to-clipboard', text)
  },
  showContextMenu: (): void => {
    ipcRenderer.send('show-context-menu')
  },
  minimizeWindow: (): void => {
    ipcRenderer.send('minimize-window')
  },
  restoreWindow: (): void => {
    ipcRenderer.send('restore-window')
  },
  getPreferences: (): Promise<Preferences> => ipcRenderer.invoke('get-preferences'),
  setPreferences: (prefs: Preferences): Promise<void> => ipcRenderer.invoke('set-preferences', prefs),
  onPreferencesUpdate: (callback: (prefs: Preferences) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, prefs: Preferences): void => {
      callback(prefs)
    }
    ipcRenderer.on('preferences-update', handler)
    return () => {
      ipcRenderer.removeListener('preferences-update', handler)
    }
  }
})
