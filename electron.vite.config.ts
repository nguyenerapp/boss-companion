import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/**
 * Global configuration for electron-vite.
 * Defines separate build configurations for the main process, preload scripts, and the renderer.
 */
export default defineConfig({
  /**
   * Main process configuration.
   * Specifies the entry point for the Electron main process which handles system-level operations.
   */
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  /**
   * Preload script configuration.
   * Bundles scripts that act as a bridge between the main process and the renderer (IPC).
   */
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/preload/index.ts'),
        formats: ['cjs'],
        fileName: () => 'index.js'
      },
      rollupOptions: {
        output: {
          entryFileNames: 'index.js'
        }
      }
    }
  },
  /**
   * Renderer process configuration.
   * Defines build settings for the React frontend, including the root directory and plugins.
   */
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    plugins: [react()]
  }
})
