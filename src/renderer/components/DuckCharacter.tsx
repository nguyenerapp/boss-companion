import type { ReactNode } from 'react'
import type { BossState } from '../../shared/types'
import './DuckCharacter.css'

interface DuckCharacterProps {
  state: BossState
  color: string
}

/**
 * CSS-art Call Duck character for each BOSS state.
 * Call ducks: round body, tiny wings, big expressive eyes, short orange bill.
 * Rendered within a ~64x64px area using CSS shapes — no image files.
 */
function DuckCharacter({ state, color }: DuckCharacterProps): ReactNode {
  return (
    <div role="img" aria-label={`Duck character in ${state} state`} className={`duck duck--${state}`} style={{ '--state-color': color } as React.CSSProperties}>
      <div className="duck__body" aria-hidden="true">
        <div className="duck__head">
          <div className="duck__eyes">
            {renderEyes(state)}
          </div>
          <div className="duck__bill">
            {renderBill(state)}
          </div>
        </div>
        <div className="duck__wing duck__wing--left" />
        <div className="duck__wing duck__wing--right" />
      </div>
      <div className="duck__feet" aria-hidden="true">
        <span className="duck__foot duck__foot--left" />
        <span className="duck__foot duck__foot--right" />
      </div>
      <div className="duck__accessory" aria-hidden="true">
        {renderAccessory(state)}
      </div>
    </div>
  )
}

function renderEyes(state: BossState): ReactNode {
  switch (state) {
    case 'thinking':
      return (
        <>
          <span className="duck-eye duck-eye--big duck-eye--look-up" />
          <span className="duck-eye duck-eye--big duck-eye--look-up" />
        </>
      )
    case 'delegating':
      return (
        <>
          <span className="duck-eye duck-eye--big duck-eye--determined" />
          <span className="duck-eye duck-eye--big duck-eye--determined" />
        </>
      )
    case 'reviewing':
      return (
        <>
          <span className="duck-eye duck-eye--big duck-eye--squint" />
          <span className="duck-eye duck-eye--big duck-eye--squint" />
        </>
      )
    case 'waiting':
      return (
        <>
          <span className="duck-eye duck-eye--big duck-eye--blink" />
          <span className="duck-eye duck-eye--big duck-eye--blink" />
        </>
      )
    case 'idle':
      return (
        <>
          <span className="duck-eye duck-eye--closed" />
          <span className="duck-eye duck-eye--closed" />
        </>
      )
    case 'sprinting':
      return (
        <>
          <span className="duck-eye duck-eye--big duck-eye--excited" />
          <span className="duck-eye duck-eye--big duck-eye--excited" />
        </>
      )
    case 'discord':
      return (
        <>
          <span className="duck-eye duck-eye--big" />
          <span className="duck-eye duck-eye--big" />
        </>
      )
    case 'working':
      return (
        <>
          <span className="duck-eye duck-eye--big duck-eye--focused" />
          <span className="duck-eye duck-eye--big duck-eye--focused" />
        </>
      )
    case 'reading':
      return (
        <>
          <span className="duck-eye duck-eye--big duck-eye--down" />
          <span className="duck-eye duck-eye--big duck-eye--down" />
        </>
      )
    case 'done':
      return (
        <>
          <span className="duck-eye duck-eye--big duck-eye--happy" />
          <span className="duck-eye duck-eye--big duck-eye--happy" />
        </>
      )
    case 'error':
      return (
        <>
          <span className="duck-eye duck-eye--x" />
          <span className="duck-eye duck-eye--x" />
        </>
      )
    default:
      return (
        <>
          <span className="duck-eye duck-eye--big" />
          <span className="duck-eye duck-eye--big" />
        </>
      )
  }
}

function renderBill(state: BossState): ReactNode {
  switch (state) {
    case 'discord':
      return <span className="bill bill--open" />
    case 'done':
      return <span className="bill bill--smile" />
    case 'error':
      return <span className="bill bill--frown" />
    case 'idle':
      return <span className="bill bill--sleep" />
    case 'sprinting':
      return <span className="bill bill--open" />
    default:
      return <span className="bill" />
  }
}

function renderAccessory(state: BossState): ReactNode {
  switch (state) {
    case 'thinking':
      return <div className="duck-acc duck-acc--thought">?</div>
    case 'delegating':
      return <div className="duck-acc duck-acc--point">&rarr;</div>
    case 'reviewing':
      return <div className="duck-acc duck-acc--magnifier">&#9906;</div>
    case 'waiting':
      return <div className="duck-acc duck-acc--hourglass">&#9203;</div>
    case 'idle':
      return <div className="duck-acc duck-acc--zzz">z<span>z</span><span>z</span></div>
    case 'sprinting':
      return <div className="duck-acc duck-acc--speed" />
    case 'discord':
      return <div className="duck-acc duck-acc--chat">&#9993;</div>
    case 'working':
      return <div className="duck-acc duck-acc--bolt">&#9889;</div>
    case 'reading':
      return <div className="duck-acc duck-acc--book">&#9776;</div>
    case 'done':
      return <div className="duck-acc duck-acc--check">&#10003;</div>
    case 'error':
      return <div className="duck-acc duck-acc--xmark">&#10007;</div>
    default:
      return null
  }
}

export default DuckCharacter
