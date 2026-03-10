import { contextBridge, ipcRenderer } from 'electron'
import type { BossStatus, StatusCallback } from '../shared/types'

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
  dragStart: (x: number, y: number): void => {
    ipcRenderer.send('drag-start', { x, y })
  },
  dragMove: (x: number, y: number): void => {
    ipcRenderer.send('drag-move', { x, y })
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
  }
})
