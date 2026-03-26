import type { ReactNode } from 'react'
import type { BossState } from '../../shared/types'
import './BossCharacter.css'

/**
 * Props for the BossCharacter component.
 */
interface BossCharacterProps {
  /** The current state of the BOSS agent, dictating the facial expression and accessory. */
  state: BossState
  /** The hex or rgb color string applied to the component's CSS variables. */
  color: string
}

/**
 * CSS-art character faces for each BOSS state.
 *
 * Component Purpose:
 * Renders a CSS-based character representation of the current BOSS state.
 * Each character is rendered within a ~64x64px area using CSS shapes, gradients,
 * and unicode characters — without relying on external image files.
 *
 * Animation Logic:
 * The component relies on external CSS for styling and animation. It dynamically
 * applies a top-level class `boss-char--${state}` based on the current state.
 * The `color` prop is passed to the root element as the `--state-color` CSS variable,
 * which the stylesheet uses to colorize parts of the character.
 *
 * Props:
 * - `state`: Determines the active CSS class, face render, and accessory render.
 * - `color`: Sets the `--state-color` CSS custom property.
 *
 * State Management:
 * This is a purely stateless, presentational component. It maintains no internal
 * React state and derives its entire rendering output directly from the provided props.
 *
 * @param props - Component properties.
 * @param props.state - The active state of the BOSS agent.
 * @param props.color - The theme color for the active state.
 * @returns The rendered character component.
 */
function BossCharacter({ state, color }: BossCharacterProps): ReactNode {
  return (
    <div className={`boss-char boss-char--${state}`} style={{ '--state-color': color } as React.CSSProperties}>
      <div className="boss-char__face">
        {renderFace(state)}
      </div>
      <div className="boss-char__accessory">
        {renderAccessory(state)}
      </div>
    </div>
  )
}

/**
 * Maps the current BOSS state to the corresponding CSS-art face elements.
 *
 * @param state - The active state of the BOSS agent.
 * @returns A React node containing the specific eye and mouth elements for the state.
 */
function renderFace(state: BossState): ReactNode {
  switch (state) {
    case 'thinking':
      return (
        <div className="face face--thinking">
          <div className="face__eyes">
            <span className="eye eye--up-left" />
            <span className="eye eye--up-right" />
          </div>
          <div className="face__mouth face__mouth--hmm" />
        </div>
      )
    case 'delegating':
      return (
        <div className="face face--delegating">
          <div className="face__eyes">
            <span className="eye eye--determined" />
            <span className="eye eye--determined" />
          </div>
          <div className="face__mouth face__mouth--firm" />
        </div>
      )
    case 'reviewing':
      return (
        <div className="face face--reviewing">
          <div className="face__eyes">
            <span className="eye eye--squint" />
            <span className="eye eye--squint" />
          </div>
          <div className="face__mouth face__mouth--flat" />
        </div>
      )
    case 'waiting':
      return (
        <div className="face face--waiting">
          <div className="face__eyes">
            <span className="eye eye--blink" />
            <span className="eye eye--blink" />
          </div>
          <div className="face__mouth face__mouth--neutral" />
        </div>
      )
    case 'idle':
      return (
        <div className="face face--idle">
          <div className="face__eyes">
            <span className="eye eye--closed" />
            <span className="eye eye--closed" />
          </div>
          <div className="face__mouth face__mouth--sleep" />
        </div>
      )
    case 'sprinting':
      return (
        <div className="face face--sprinting">
          <div className="face__eyes">
            <span className="eye eye--wide" />
            <span className="eye eye--wide" />
          </div>
          <div className="face__mouth face__mouth--grin" />
        </div>
      )
    case 'discord':
      return (
        <div className="face face--discord">
          <div className="face__eyes">
            <span className="eye eye--normal" />
            <span className="eye eye--normal" />
          </div>
          <div className="face__mouth face__mouth--talk" />
        </div>
      )
    case 'working':
      return (
        <div className="face face--working">
          <div className="face__eyes">
            <span className="eye eye--focused" />
            <span className="eye eye--focused" />
          </div>
          <div className="face__mouth face__mouth--firm" />
        </div>
      )
    case 'reading':
      return (
        <div className="face face--reading">
          <div className="face__eyes">
            <span className="eye eye--down" />
            <span className="eye eye--down" />
          </div>
          <div className="face__mouth face__mouth--neutral" />
        </div>
      )
    case 'done':
      return (
        <div className="face face--done">
          <div className="face__eyes">
            <span className="eye eye--happy" />
            <span className="eye eye--happy" />
          </div>
          <div className="face__mouth face__mouth--smile" />
        </div>
      )
    case 'error':
      return (
        <div className="face face--error">
          <div className="face__eyes">
            <span className="eye eye--x" />
            <span className="eye eye--x" />
          </div>
          <div className="face__mouth face__mouth--frown" />
        </div>
      )
    default:
      return (
        <div className="face">
          <div className="face__eyes">
            <span className="eye eye--normal" />
            <span className="eye eye--normal" />
          </div>
          <div className="face__mouth face__mouth--neutral" />
        </div>
      )
  }
}

/**
 * Maps the current BOSS state to the corresponding CSS-art accessory element.
 *
 * @param state - The active state of the BOSS agent.
 * @returns A React node containing the specific accessory for the state, or null.
 */
function renderAccessory(state: BossState): ReactNode {
  switch (state) {
    case 'thinking':
      return <div className="accessory accessory--thought-bubble">?</div>
    case 'delegating':
      return <div className="accessory accessory--arrow">&rarr;</div>
    case 'reviewing':
      return <div className="accessory accessory--magnifier">&#9906;</div>
    case 'waiting':
      return <div className="accessory accessory--hourglass">&#9203;</div>
    case 'idle':
      return <div className="accessory accessory--zzz">z<span>z</span><span>z</span></div>
    case 'sprinting':
      return <div className="accessory accessory--speed-lines" />
    case 'discord':
      return <div className="accessory accessory--chat-bubble">&#9993;</div>
    case 'working':
      return <div className="accessory accessory--bolt">&#9889;</div>
    case 'reading':
      return <div className="accessory accessory--book">&#9776;</div>
    case 'done':
      return <div className="accessory accessory--check">&#10003;</div>
    case 'error':
      return <div className="accessory accessory--x-mark">&#10007;</div>
    default:
      return null
  }
}

export default BossCharacter
