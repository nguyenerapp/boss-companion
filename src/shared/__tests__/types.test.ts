import { describe, it, expect } from 'vitest'
import {
  BOSS_STATES,
  isBossState,
  DISPLAY_MODES,
  isDisplayMode
} from '../types'

describe('types runtime utilities', () => {
  describe('BossState', () => {
    it('should have all valid BOSS_STATES defined', () => {
      expect(BOSS_STATES).toEqual([
        'thinking',
        'delegating',
        'reviewing',
        'waiting',
        'idle',
        'sprinting',
        'discord',
        'working',
        'reading',
        'done',
        'error'
      ])
    })

    describe('isBossState', () => {
      it('should return true for valid boss states', () => {
        BOSS_STATES.forEach((state) => {
          expect(isBossState(state)).toBe(true)
        })
      })

      it('should return false for invalid boss states', () => {
        expect(isBossState('invalid-state')).toBe(false)
        expect(isBossState('')).toBe(false)
        expect(isBossState(null)).toBe(false)
        expect(isBossState(undefined)).toBe(false)
        expect(isBossState(123)).toBe(false)
        expect(isBossState({})).toBe(false)
      })
    })
  })

  describe('DisplayMode', () => {
    it('should have all valid DISPLAY_MODES defined', () => {
      expect(DISPLAY_MODES).toEqual([
        'css-art',
        'emoji',
        'minimal',
        'call-duck',
        'meme-pack'
      ])
    })

    describe('isDisplayMode', () => {
      it('should return true for valid display modes', () => {
        DISPLAY_MODES.forEach((mode) => {
          expect(isDisplayMode(mode)).toBe(true)
        })
      })

      it('should return false for invalid display modes', () => {
        expect(isDisplayMode('invalid-mode')).toBe(false)
        expect(isDisplayMode('')).toBe(false)
        expect(isDisplayMode(null)).toBe(false)
        expect(isDisplayMode(undefined)).toBe(false)
        expect(isDisplayMode(123)).toBe(false)
        expect(isDisplayMode({})).toBe(false)
      })
    })
  })
})
