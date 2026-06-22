import { describe, expect, it } from 'vitest'
import {
  nextThemePreference,
  normalizeThemePreference,
  resolveTheme,
} from './theme'

describe('theme preference helpers', () => {
  it('normalizes persisted values safely', () => {
    expect(normalizeThemePreference('dark')).toBe('dark')
    expect(normalizeThemePreference('light')).toBe('light')
    expect(normalizeThemePreference('invalid')).toBe('system')
    expect(normalizeThemePreference(null)).toBe('system')
  })

  it('resolves system preference from the media query state', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('cycles system, light and dark in a predictable order', () => {
    expect(nextThemePreference('system')).toBe('light')
    expect(nextThemePreference('light')).toBe('dark')
    expect(nextThemePreference('dark')).toBe('system')
  })
})
