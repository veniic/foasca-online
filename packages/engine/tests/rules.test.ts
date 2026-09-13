import { describe, expect, it } from 'vitest'
import { Card, cardId } from '@foaica/shared'
import { getValidCards, determineTrickWinner } from '../src/rules'

function ids(cards: Card[]): string[] {
  return cards.map(cardId).sort()
}

describe('getValidCards', () => {
  it('cel care deschide mâna poate juca orice carte', () => {
    const hand: Card[] = [
      { suit: 'hearts', rank: '8' },
      { suit: 'clubs', rank: 'K' },
    ]
    const valid = getValidCards(hand, null, 'spades', false)
    expect(ids(valid)).toEqual(ids(hand))
  })

  it('trebuie să respecte forma cerută dacă o are', () => {
    const hand: Card[] = [
      { suit: 'hearts', rank: '8' },
      { suit: 'spades', rank: 'K' },
    ]
    const valid = getValidCards(hand, 'hearts', 'diamonds', false)
    expect(ids(valid)).toEqual([cardId({ suit: 'hearts', rank: '8' })])
  })

  it('J♠ (J de verde) poate fi jucat oricând, chiar dacă are forma cerută (exemplul din secțiunea 3)', () => {
    const hand: Card[] = [
      { suit: 'hearts', rank: '6' },
      { suit: 'spades', rank: 'J' },
    ]
    const valid = getValidCards(hand, 'hearts', 'diamonds', false)
    expect(ids(valid)).toEqual(
      ids([
        { suit: 'hearts', rank: '6' },
        { suit: 'spades', rank: 'J' },
      ])
    )
  })

  it('dacă nu are forma cerută dar are coz, e obligat să joace cozul (secțiunea 13)', () => {
    const hand: Card[] = [
      { suit: 'hearts', rank: '8' },
      { suit: 'hearts', rank: 'K' },
      { suit: 'diamonds', rank: 'A' },
      { suit: 'spades', rank: '7' },
    ]
    const valid = getValidCards(hand, 'clubs', 'hearts', false)
    expect(ids(valid)).toEqual(
      ids([
        { suit: 'hearts', rank: '8' },
        { suit: 'hearts', rank: 'K' },
      ])
    )
  })

  it('dacă nu are nici forma cerută, nici coz, poate juca orice', () => {
    const hand: Card[] = [
      { suit: 'diamonds', rank: 'A' },
      { suit: 'spades', rank: '7' },
    ]
    const valid = getValidCards(hand, 'clubs', 'hearts', false)
    expect(ids(valid)).toEqual(ids(hand))
  })

  it('dacă prima carte jucată e chiar coz, ceilalți cu coz sunt obligați să-l joace (secțiunea 14)', () => {
    const hand: Card[] = [
      { suit: 'hearts', rank: '9' },
      { suit: 'clubs', rank: 'A' },
    ]
    // Cineva a deschis cu coz (♥7) => leadSuit = 'hearts' = cozul
    const valid = getValidCards(hand, 'hearts', 'hearts', false)
    expect(ids(valid)).toEqual([cardId({ suit: 'hearts', rank: '9' })])
  })

  it('în runda "noTrump" (J♠ verde e coz), J♠ din mână e o carte normală, fără puteri speciale', () => {
    const hand: Card[] = [
      { suit: 'hearts', rank: '6' },
      { suit: 'spades', rank: 'J' },
    ]
    const valid = getValidCards(hand, 'hearts', null, true)
    // Trebuie să respecte forma cerută (hearts); J♠ nu are voie să sară peste regulă aici.
    expect(ids(valid)).toEqual([cardId({ suit: 'hearts', rank: '6' })])
  })
})

describe('determineTrickWinner', () => {
  it('câștigă cea mai mare carte din forma cerută dacă nu s-a jucat coz (exemplul secțiunii 16)', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'p1', card: { suit: 'spades', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'spades', rank: 'K' } },
        { playerId: 'p3', card: { suit: 'clubs', rank: 'A' } },
        { playerId: 'p4', card: { suit: 'diamonds', rank: 'Q' } },
      ],
      'spades',
      'hearts',
      false
    )
    expect(winner).toBe('p1')
  })

  it('cozul bate orice altă formă, chiar dacă nu e cel mai mare (exemplul secțiunii 4/16)', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'p1', card: { suit: 'clubs', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'hearts', rank: '7' } },
        { playerId: 'p3', card: { suit: 'clubs', rank: 'K' } },
        { playerId: 'p4', card: { suit: 'hearts', rank: 'Q' } },
      ],
      'clubs',
      'hearts',
      false
    )
    expect(winner).toBe('p4') // ♥Q, cel mai mare coz
  })

  it('dintre mai mulți coji câștigă cel mai mare', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'p1', card: { suit: 'hearts', rank: '6' } },
        { playerId: 'p2', card: { suit: 'hearts', rank: 'K' } },
        { playerId: 'p3', card: { suit: 'hearts', rank: '9' } },
      ],
      'hearts',
      'hearts',
      false
    )
    expect(winner).toBe('p2')
  })

  it('J♠ (J de verde) câștigă întotdeauna dacă e jucat (secțiunea 3)', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'p1', card: { suit: 'hearts', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'hearts', rank: 'K' } },
        { playerId: 'p3', card: { suit: 'spades', rank: 'J' } },
      ],
      'hearts',
      'hearts',
      false
    )
    expect(winner).toBe('p3')
  })

  it('în runda "noTrump", câștigă cea mai mare valoare indiferent de culoare (exemplul secțiunii 5)', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'p1', card: { suit: 'spades', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'hearts', rank: 'K' } },
        { playerId: 'p3', card: { suit: 'diamonds', rank: 'Q' } },
        { playerId: 'p4', card: { suit: 'clubs', rank: 'J' } }, // J normal (nu e de pică), fără puteri speciale în noTrump
      ],
      'spades',
      null,
      true
    )
    expect(winner).toBe('p1')
  })
})

// ---------------------------------------------------------------------------
// "J de verde" = J♠ (Pică/Spades), cartea specială a jocului.
// IMPORTANT: verde = Pică (Spades) în această variantă, NU Trefla/Clubs.
// Testele de mai jos confirmă explicit ierarhia și comportamentul cerut:
// J de verde > A > K > Q > J > 10 > ..., joc liber (nu respectă obligația de
// formă/coz), și victorie asupra oricărei cărți normale, inclusiv Asul.
// ---------------------------------------------------------------------------
describe('J de verde (J♠ / Pică) — carte specială', () => {
  it('Test A: J de verde e mai puternic decât Asul', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'p1', card: { suit: 'hearts', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'spades', rank: 'J' } },
      ],
      'hearts',
      'diamonds',
      false
    )
    expect(winner).toBe('p2')
  })

  it('Test B: J de verde bate orice altă carte normală (K, Q, J, 10, 9, 8, 7, 6)', () => {
    const normalRanks: Card['rank'][] = ['K', 'Q', 'J', '10', '9', '8', '7', '6']
    for (const rank of normalRanks) {
      const winner = determineTrickWinner(
        [
          { playerId: 'opponent', card: { suit: 'hearts', rank } },
          { playerId: 'jdeverde', card: { suit: 'spades', rank: 'J' } },
        ],
        'hearts',
        'diamonds',
        false
      )
      expect(winner).toBe('jdeverde')
    }
  })

  it('Test (regresie): J♣ (Trefla) NU este cartea specială — nu câștigă automat', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'aceWins', card: { suit: 'hearts', rank: 'A' } },
        { playerId: 'clubsJack', card: { suit: 'clubs', rank: 'J' } },
      ],
      'hearts',
      'diamonds',
      false
    )
    // J♣ e doar un J normal (poziția lui în RANK_POWER), nu câștigă mâna.
    expect(winner).toBe('aceWins')
  })

  it('Test C: J de verde poate fi jucat oricând, chiar dacă jucătorul are forma cerută', () => {
    const hand: Card[] = [
      { suit: 'hearts', rank: 'A' }, // are forma cerută (hearts)
      { suit: 'spades', rank: 'J' }, // J de verde
    ]
    const valid = getValidCards(hand, 'hearts', 'diamonds', false)
    expect(valid.some((c) => c.suit === 'spades' && c.rank === 'J')).toBe(true)
  })

  it('Test C (variantă): J de verde poate fi jucat chiar dacă jucătorul are cozul', () => {
    const hand: Card[] = [
      { suit: 'diamonds', rank: 'K' }, // are cozul (diamonds)
      { suit: 'spades', rank: 'J' },
    ]
    // Nu are forma cerută (hearts), dar are cozul (diamonds) — normal ar fi
    // obligat să joace cozul; J de verde rămâne totuși o opțiune validă.
    const valid = getValidCards(hand, 'hearts', 'diamonds', false)
    expect(valid.some((c) => c.suit === 'spades' && c.rank === 'J')).toBe(true)
  })

  it('Test D: într-o mână reală, J de verde câștigă împotriva unui As jucat de alt jucător', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'A', card: { suit: 'diamonds', rank: 'A' } },
        { playerId: 'B', card: { suit: 'spades', rank: 'J' } },
        { playerId: 'C', card: { suit: 'diamonds', rank: 'K' } },
      ],
      'diamonds',
      'hearts',
      false
    )
    expect(winner).toBe('B')
  })

  it('Test G: obligația de a urma forma cerută NU se aplică dacă jucătorul alege J de verde', () => {
    const hand: Card[] = [
      { suit: 'hearts', rank: 'Q' },
      { suit: 'hearts', rank: '9' },
      { suit: 'spades', rank: 'J' },
    ]
    const valid = getValidCards(hand, 'hearts', 'diamonds', false)
    const suits = valid.map((c) => `${c.rank}-${c.suit}`)
    expect(suits).toContain('Q-hearts')
    expect(suits).toContain('9-hearts')
    expect(suits).toContain('J-spades') // J de verde rămâne disponibil, pe lângă forma cerută
  })

  it('Test F: ordinea completă plasează J de verde deasupra lui A și a tuturor celorlalte cărți', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'trumpAce', card: { suit: 'hearts', rank: 'A' } }, // As de coz — normal ar câștiga tot
        { playerId: 'jdeverde', card: { suit: 'spades', rank: 'J' } },
      ],
      'diamonds',
      'hearts',
      false
    )
    expect(winner).toBe('jdeverde')
  })

  it('Test E: J de verde rămâne cea mai puternică chiar când Pică (verde) este chiar cozul rundei', () => {
    // Cerința curentă: "regula specială trebuie să funcționeze și când verde
    // e culoarea de coz". Testăm exact asta — trumpSuit = 'spades', J♠ jucat
    // dintr-o mână trebuie să câștige necondiționat, la fel ca în orice altă
    // rundă cu coz. (NOTĂ: acest test NU acoperă cazul separat, nerezolvat
    // încă, în care J♠ este chiar cartea întoarsă pentru coz — vezi trump.ts,
    // unde regula inițială "no-trump dacă J-ul special e cartea de coz" a fost
    // păstrată neschimbată, pentru că nu a fost cerută explicit modificarea ei
    // în această tură.)
    const winner = determineTrickWinner(
      [
        { playerId: 'p1', card: { suit: 'diamonds', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'spades', rank: 'J' } },
      ],
      'diamonds',
      'spades', // verde (pică) e cozul rundei
      false
    )
    expect(winner).toBe('p2')
  })
})
