import { Card, isSpecialJack, Suit } from '@foaica/shared'

export interface TrumpResult {
  /** Culoarea de coz, sau null dacă nu există coz în această rundă. */
  suit: Suit | null
  /** Adevărat dacă J♠ (J de verde) a fost cartea întoarsă — atunci NU există coz în rundă. */
  noTrump: boolean
}

/**
 * Stabilește cozul rundei pe baza cărții întoarse.
 * Regulă specială: dacă J♠ (J de verde) este cartea de coz, nu există coz în
 * acea rundă și cărțile se compară doar după valoare (A > K > Q > J > 10 > 9 > 8 > 7 > 6).
 */
export function determineTrump(trumpCard: Card): TrumpResult {
  if (isSpecialJack(trumpCard)) {
    return { suit: null, noTrump: true }
  }
  return { suit: trumpCard.suit, noTrump: false }
}
