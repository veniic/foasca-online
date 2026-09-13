import { Card, cardId, isSpecialJack, RANK_POWER, Suit } from '@foaica/shared'

function dedupeById(cards: Card[]): Card[] {
  const seen = new Set<string>()
  const out: Card[] = []
  for (const c of cards) {
    const id = cardId(c)
    if (!seen.has(id)) {
      seen.add(id)
      out.push(c)
    }
  }
  return out
}

/**
 * Cărțile pe care un jucător le poate juca valid, date fiind:
 * - mâna lui curentă
 * - forma cerută a mânii (null dacă el este cel care deschide mâna)
 * - cozul rundei (null dacă `noTrump` e adevărat)
 * - `noTrump`: adevărat dacă J♠ (J de verde) a fost cartea de coz (nicio culoare nu e coz)
 *
 * Reguli (secțiunile 12-15 din specificație):
 * - J♠ (J de verde) poate fi jucat oricând, DAR doar cât timp există un coz în rundă
 *   (dacă runda e "noTrump", J♠ (J de verde) e o carte normală, fără puteri speciale).
 * - Dacă cel care deschide, poate juca orice carte.
 * - Altfel, dacă are cartea din forma cerută, trebuie să joace acea formă.
 * - Altfel, dacă are coz, trebuie să joace cozul.
 * - Altfel, poate juca orice carte.
 */
export function getValidCards(
  hand: Card[],
  leadSuit: Suit | null,
  trumpSuit: Suit | null,
  noTrump: boolean
): Card[] {
  const specialJack = !noTrump ? hand.find(isSpecialJack) : undefined

  // Cel care deschide mâna poate juca orice carte.
  if (leadSuit === null) {
    return hand.slice()
  }

  const leadSuitCards = hand.filter((c) => c.suit === leadSuit)
  if (leadSuitCards.length > 0) {
    return specialJack ? dedupeById([...leadSuitCards, specialJack]) : leadSuitCards
  }

  if (!noTrump && trumpSuit) {
    const trumpCards = hand.filter((c) => c.suit === trumpSuit)
    if (trumpCards.length > 0) {
      return specialJack ? dedupeById([...trumpCards, specialJack]) : trumpCards
    }
  }

  // Nu are nici forma cerută, nici coz (sau nu există coz în rundă): orice carte.
  return hand.slice()
}

export interface Play {
  playerId: string
  card: Card
}

/**
 * Stabilește câștigătorul unei mâini.
 *
 * Cazul normal (există coz în rundă):
 *   1. J♠ (J de verde), dacă a fost jucat, câștigă întotdeauna.
 *   2. Altfel, dacă există cărți de coz jucate, câștigă cea mai mare dintre ele.
 *   3. Altfel, câștigă cea mai mare carte din forma cerută.
 *
 * Cazul special "noTrump" (J♠ (J de verde) a fost cartea de coz, deci nu există coz):
 *   Se compară TOATE cărțile jucate doar după valoare, indiferent de culoare
 *   (A > K > Q > J > 10 > 9 > 8 > 7 > 6). J♠ (J de verde) e o carte normală în acest caz.
 *   Presupunere documentată: la egalitate de valoare (culori diferite, aceeași
 *   valoare), câștigă cartea jucată prima — regulă neacoperită explicit în cerințe.
 */
export function determineTrickWinner(
  plays: Play[],
  leadSuit: Suit,
  trumpSuit: Suit | null,
  noTrump: boolean
): string {
  if (plays.length === 0) {
    throw new Error('Nu există cărți jucate în această mână')
  }

  if (noTrump) {
    return bestByRankPower(plays)
  }

  const specialJackPlay = plays.find((p) => isSpecialJack(p.card))
  if (specialJackPlay) return specialJackPlay.playerId

  if (trumpSuit) {
    const trumpPlays = plays.filter((p) => p.card.suit === trumpSuit)
    if (trumpPlays.length > 0) return bestByRankPower(trumpPlays)
  }

  const leadPlays = plays.filter((p) => p.card.suit === leadSuit)
  return bestByRankPower(leadPlays)
}

function bestByRankPower(plays: Play[]): string {
  let best = plays[0]
  for (const p of plays.slice(1)) {
    if (RANK_POWER[p.card.rank] > RANK_POWER[best.card.rank]) {
      best = p
    }
  }
  return best.playerId
}
