import { Card, RANKS, SUITS } from '@foaica/shared'

/** Creează pachetul standard de 36 de cărți (4 culori x 9 valori), fără amestecare. */
export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  return deck
}

/**
 * Amestecă un pachet folosind Fisher–Yates.
 * `rng` este injectabil pentru teste deterministe; implicit foloseşte Math.random.
 */
export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const result = deck.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
