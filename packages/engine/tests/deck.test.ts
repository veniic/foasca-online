import { describe, expect, it } from 'vitest'
import { cardId } from '@foaica/shared'
import { createDeck, shuffleDeck } from '../src/deck'

describe('createDeck', () => {
  it('creează exact 36 de cărți', () => {
    expect(createDeck().length).toBe(36)
  })

  it('nu are cărți duplicate', () => {
    const ids = createDeck().map(cardId)
    expect(new Set(ids).size).toBe(36)
  })

  it('are 4 culori x 9 valori', () => {
    const deck = createDeck()
    const bySuit = new Map<string, number>()
    for (const c of deck) bySuit.set(c.suit, (bySuit.get(c.suit) ?? 0) + 1)
    expect(bySuit.size).toBe(4)
    for (const count of bySuit.values()) expect(count).toBe(9)
  })
})

describe('shuffleDeck', () => {
  it('păstrează toate cele 36 de cărți (doar reordonează)', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    expect(shuffled.length).toBe(deck.length)
    expect(new Set(shuffled.map(cardId))).toEqual(new Set(deck.map(cardId)))
  })

  it('nu modifică pachetul original', () => {
    const deck = createDeck()
    const before = deck.map(cardId).join(',')
    shuffleDeck(deck)
    expect(deck.map(cardId).join(',')).toBe(before)
  })

  it('cu un RNG determinist produce mereu același rezultat', () => {
    let seed = 42
    const rng = () => {
      // generator liniar simplu, determinist
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    const a = shuffleDeck(createDeck(), rng)
    seed = 42
    const b = shuffleDeck(createDeck(), rng)
    expect(a.map(cardId)).toEqual(b.map(cardId))
  })

  it('cu Math.random produce (aproape sigur) o ordine diferită de original', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    expect(shuffled.map(cardId).join(',')).not.toBe(deck.map(cardId).join(','))
  })
})
