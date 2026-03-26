import type { ReactNode } from 'react'
import type { BossState } from '../../shared/types'

// Import all meme pack images
import thinking from '../assets/meme-pack/thinking.png'
import delegating from '../assets/meme-pack/delegating.png'
import reviewing from '../assets/meme-pack/reviewing.png'
import waiting from '../assets/meme-pack/waiting.png'
import idle from '../assets/meme-pack/idle.png'
import sprinting from '../assets/meme-pack/sprinting.gif'
import discord from '../assets/meme-pack/discord.gif'
import working from '../assets/meme-pack/working.png'
import reading from '../assets/meme-pack/reading.png'
import done from '../assets/meme-pack/done.png'
import error from '../assets/meme-pack/error.png'

const STATE_IMAGES: Record<BossState, string> = {
  thinking,
  delegating,
  reviewing,
  waiting,
  idle,
  sprinting,
  discord,
  working,
  reading,
  done,
  error
}

/**
 * Component properties for the MemePackCharacter.
 */
interface MemePackCharacterProps {
  /** The current state of the BOSS agent, used to determine which meme image to display. */
  state: BossState
  /** The theme color associated with the current state, used for the box shadow glow effect. */
  color: string
}

/**
 * Meme Pack display mode — renders custom reaction images for each BOSS state.
 *
 * Rendering logic:
 * - Maps the current `state` to a specific image import (PNG stills for most states, animated GIFs for sprinting and discord).
 * - Falls back to the 'idle' image if the provided state is not found.
 * - Applies a glowing box-shadow effect using the provided `color` prop with a 40% opacity (hex `40`).
 *
 * @param props - Component properties.
 * @param props.state - The current state of the BOSS agent.
 * @param props.color - The theme color for the glow effect.
 * @returns The rendered meme pack character component.
 */
function MemePackCharacter({ state, color }: MemePackCharacterProps): ReactNode {
  const src = STATE_IMAGES[state] || STATE_IMAGES.idle

  return (
    <div
      className="meme-pack"
      style={{
        width: 64,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        boxShadow: `0 0 8px ${color}40`,
        transition: 'box-shadow 0.3s ease',
        overflow: 'hidden'
      }}
    >
      <img
        src={src}
        alt={state}
        style={{
          width: 64,
          height: 64,
          objectFit: 'contain',
          transition: 'opacity 0.2s ease',
          imageRendering: 'auto'
        }}
      />
    </div>
  )
}

export default MemePackCharacter
