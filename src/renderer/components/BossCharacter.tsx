import type { ReactNode } from 'react'
import type { BossState } from '../../shared/types'
import './BossCharacter.css'

interface BossCharacterProps {
  state: BossState
  color: string
}

/**
 * CSS-art character faces for each BOSS state.
 * Each character is rendered within a ~64x64px area using
 * CSS shapes, gradients, and unicode — no image files.
 */
function BossCharacter({ state, color }: BossCharacterProps): ReactNode {
  return (
    <div
      className={`boss-char boss-char--${state}`}
      style={{ '--state-color': color } as React.CSSProperties}
      role="img"
      aria-label={`Boss character state: ${state}`}
      aria-live="polite"
    >
      <div className="boss-char__face" aria-hidden="true">
        {renderFace(state)}
      </div>
      <div className="boss-char__accessory" aria-hidden="true">
        {renderAccessory(state)}
      </div>
    </div>
  )
}

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
