import { describe, expect, it } from 'vitest'
import { overrideDescription, firstFilled } from './quote-content'

describe('overrideDescription', () => {
  it('reads the column matching the proposal language', () => {
    const snap = { description_en: 'English copy', description_ar: 'نص عربي' }
    expect(overrideDescription(snap, false)).toBe('English copy')
    expect(overrideDescription(snap, true)).toBe('نص عربي')
  })

  it('does not fall back to the other language', () => {
    // An Arabic proposal must not silently print English copy just because the
    // Arabic override is missing — the library entry gets that chance instead.
    expect(overrideDescription({ description_en: 'only english' }, true)).toBeNull()
  })

  it('treats blank and whitespace-only overrides as absent', () => {
    expect(overrideDescription({ description_en: '' }, false)).toBeNull()
    expect(overrideDescription({ description_en: '   \n ' }, false)).toBeNull()
  })

  it('tolerates snapshots that hold unrelated builder keys', () => {
    expect(overrideDescription({ moment: 'morning', optional: true }, false)).toBeNull()
    expect(overrideDescription({ description_en: 42 }, false)).toBeNull()
  })

  it('tolerates a missing or non-object snapshot', () => {
    expect(overrideDescription(null, false)).toBeNull()
    expect(overrideDescription(undefined, false)).toBeNull()
    expect(overrideDescription('nope', false)).toBeNull()
  })
})

describe('firstFilled', () => {
  it('returns the first non-empty candidate in priority order', () => {
    expect(firstFilled(null, 'override', 'library')).toBe('override')
    expect(firstFilled('', '   ', 'library')).toBe('library')
  })

  it('returns null when nothing is written anywhere', () => {
    expect(firstFilled(null, undefined, '', '  ')).toBeNull()
  })

  it('lets a per-proposal override outrank the library and the day text', () => {
    // The precedence the proposal renders: a description written for this
    // proposal only → the destination's Content library entry → the day's own
    // text. Only the override is new; the library still beats the day text as
    // it always has.
    expect(firstFilled('per-proposal', 'library', 'day text')).toBe('per-proposal')
    expect(firstFilled(null, 'library', 'day text')).toBe('library')
    expect(firstFilled(null, null, 'day text')).toBe('day text')
  })
})
