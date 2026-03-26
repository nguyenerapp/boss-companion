/**
 * @module src/renderer/main
 * @description Entry point for the React renderer process.
 * Sets up the React root, global ErrorBoundary, and strict mode.
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * State shape for the ErrorBoundary component.
 */
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Global ErrorBoundary to catch unhandled errors in the React component tree.
 * Prevents the application from crashing completely and provides a fallback UI.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  /**
   * Initializes the ErrorBoundary state.
   * @param props - Component props containing the children to render.
   */
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  /**
   * Updates state to show the fallback UI after an error has been thrown.
   * @param error - The error that was thrown.
   * @returns The updated state indicating an error occurred.
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  /**
   * Logs error information and component stack trace for debugging.
   * @param error - The error that was thrown.
   * @param info - Error boundary information including the component stack.
   */
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[boss-companion] React error:', error, info.componentStack)
  }

  /**
   * Renders the children normally or a fallback UI if an error occurred.
   * @returns The React node to render.
   */
  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px',
          background: 'rgba(0,0,0,0.8)',
          color: '#ef4444',
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>BOSS Companion Error</div>
          <div style={{ color: '#d1d5db', fontSize: '10px' }}>
            {this.state.error?.message ?? 'Unknown error'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '8px',
              padding: '4px 12px',
              background: '#374151',
              color: '#e5e7eb',
              border: '1px solid #4b5563',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * React root render setup.
 * Mounts the `<App />` component into the `#root` element.
 * Wrapped in `React.StrictMode` for development warnings and `ErrorBoundary` for global error handling.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
