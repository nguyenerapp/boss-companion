// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BossCharacter from '../BossCharacter'
import React from 'react'

describe('BossCharacter Accessibility', () => {
  it('should have required aria attributes', () => {
    const { container } = render(<BossCharacter state="thinking" color="#fff" />)
    const root = container.firstChild as HTMLElement

    expect(root.getAttribute('role')).toBe('img')
    expect(root.getAttribute('aria-label')).toBe('Boss character state: thinking')
    expect(root.getAttribute('aria-live')).toBe('polite')

    const face = container.querySelector('.boss-char__face')
    expect(face?.getAttribute('aria-hidden')).toBe('true')

    const accessory = container.querySelector('.boss-char__accessory')
    expect(accessory?.getAttribute('aria-hidden')).toBe('true')
  })
})
