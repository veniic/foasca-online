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

  it('J♣ poate fi jucat oricând, chiar dacă are forma cerută (exemplul din secțiunea 3)', () => {
    const hand: Card[] = [
      { suit: 'hearts', rank: '6' },
      { suit: 'clubs', rank: 'J' },
    ]
    const valid = getValidCards(hand, 'hearts', 'diamonds', false)
    expect(ids(valid)).toEqual(
      ids([
        { suit: 'hearts', rank: '6' },
        { suit: 'clubs', rank: 'J' },
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

  it('în runda "noTrump" (J♣ e coz), J♣ din mână e o carte normală, fără puteri speciale', () => {
    const hand: Card[] = [
      { suit: 'hearts', rank: '6' },
      { suit: 'clubs', rank: 'J' },
    ]
    const valid = getValidCards(hand, 'hearts', null, true)
    // Trebuie să respecte forma cerută (hearts); J♣ nu are voie să sară peste regulă.
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

  it('J♣ câștigă întotdeauna dacă e jucat (secțiunea 3)', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'p1', card: { suit: 'hearts', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'hearts', rank: 'K' } },
        { playerId: 'p3', card: { suit: 'clubs', rank: 'J' } },
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
        { playerId: 'p4', card: { suit: 'clubs', rank: 'J' } },
      ],
      'spades',
      null,
      true
    )
    expect(winner).toBe('p1')
  })
})

// ---------------------------------------------------------------------------
// "J de verde" = J♣ (Trefla/Verde), cartea specială. Testele de mai jos
// confirmă explicit ierarhia și comportamentul cerut: J de verde > A > K > Q >
// J > 10 > ... , joc liber (nu respectă obligația de formă/coz), și victorie
// asupra oricărei cărți normale, inclusiv Asul.
// ---------------------------------------------------------------------------
describe('J de verde (J♣) — carte specială', () => {
  it('Test A: J de verde e mai puternic decât Asul', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'p1', card: { suit: 'hearts', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'clubs', rank: 'J' } },
      ],
      'hearts',
      'spades',
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
          { playerId: 'jdeverde', card: { suit: 'clubs', rank: 'J' } },
        ],
        'hearts',
        'diamonds',
        false
      )
      expect(winner).toBe('jdeverde')
    }
  })

  it('Test C: J de verde poate fi jucat oricând, chiar dacă jucătorul are forma cerută', () => {
    const hand: Card[] = [
      { suit: 'hearts', rank: 'A' }, // are forma cerută (hearts)
      { suit: 'clubs', rank: 'J' }, // J de verde
    ]
    const valid = getValidCards(hand, 'hearts', 'spades', false)
    expect(valid.some((c) => c.suit === 'clubs' && c.rank === 'J')).toBe(true)
  })

  it('Test C (variantă): J de verde poate fi jucat chiar dacă jucătorul are cozul', () => {
    const hand: Card[] = [
      { suit: 'spades', rank: 'K' }, // are cozul (spades)
      { suit: 'clubs', rank: 'J' },
    ]
    // Nu are forma cerută (hearts), dar are cozul (spades) — normal ar fi obligat
    // să joace cozul; J de verde rămâne totuși o opțiune validă.
    const valid = getValidCards(hand, 'hearts', 'spades', false)
    expect(valid.some((c) => c.suit === 'clubs' && c.rank === 'J')).toBe(true)
  })

  it('Test D: într-o mână reală, J de verde câștigă împotriva unui As jucat de alt jucător', () => {
    const winner = determineTrickWinner(
      [
        { playerId: 'A', card: { suit: 'diamonds', rank: 'A' } },
        { playerId: 'B', card: { suit: 'clubs', rank: 'J' } },
        { playerId: 'C', card: { suit: 'diamonds', rank: 'K' } },
      ],
      'diamonds',
      'spades',
      false
    )
    expect(winner).toBe('B')
  })

  it('Test G: obligația de a urma forma cerută NU se aplică dacă jucătorul alege J de verde', () => {
    // Jucătorul ARE forma cerută (poate fi obligat normal să o joace), dar
    // getValidCards trebuie să includă și J de verde ca alternativă validă —
    // motorul nu trebuie să forțeze alegerea formei cerute în locul lui J♣.
    const hand: Card[] = [
      { suit: 'spades', rank: 'Q' },
      { suit: 'spades', rank: '9' },
      { suit: 'clubs', rank: 'J' },
    ]
    const valid = getValidCards(hand, 'spades', 'hearts', false)
    const suits = valid.map((c) => `${c.rank}-${c.suit}`)
    expect(suits).toContain('Q-spades')
    expect(suits).toContain('9-spades')
    expect(suits).toContain('J-clubs') // J de verde rămâne disponibil, pe lângă forma cerută
  })

  it('Test F: ordinea completă plasează J de verde deasupra lui A și a tuturor celorlalte cărți', () => {
    // J de verde nu se compară prin RANK_POWER (e un caz special separat), dar
    // efectiv câștigă mereu — testăm asta direct împotriva celei mai mari cărți
    // posibile din ierarhia normală (Asul de coz, care altfel ar câștiga orice).
    const winner = determineTrickWinner(
      [
        { playerId: 'trumpAce', card: { suit: 'hearts', rank: 'A' } }, // As de coz — normal ar câștiga tot
        { playerId: 'jdeverde', card: { suit: 'clubs', rank: 'J' } },
      ],
      'spades',
      'hearts',
      false
    )
    expect(winner).toBe('jdeverde')
  })

  it('Test E: când J de verde este cartea de coz (revelată), NU există coz în rundă (regulă originală, secțiunea 5)', () => {
    // Această regulă a fost specificată explicit și exemplificată în cerințele
    // inițiale ale jocului: dacă J♣ e cartea întoarsă pentru coz, nu există coz
    // în acea rundă, iar dacă J♣ ajunge ulterior în mâna unui jucător, e un J
    // OBIȘNUIT (fără puteri speciale), pentru că regula specială a lui J♣ se
    // aplică DOAR când e jucat dintr-o mână, nu când e cartea de coz. Test de
    // regresie: NU schimbăm această regulă fără confirmare explicită, pentru
    // că cerințele mai noi ("J de verde păstrează mereu puterea maximă, chiar
    // și ca și coz") par să o contrazică — vezi raportul final al acestei ture.
    const winner = determineTrickWinner(
      [
        { playerId: 'p1', card: { suit: 'spades', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'hearts', rank: 'K' } },
        { playerId: 'p3', card: { suit: 'diamonds', rank: 'Q' } },
        { playerId: 'p4', card: { suit: 'clubs', rank: 'J' } }, // J normal, NU J de verde, în runda fără coz
      ],
      'spades',
      null,
      true // noTrump = true, pentru că J♣ a fost cartea de coz revelată
    )
    expect(winner).toBe('p1') // câștigă Asul, nu J-ul de clubs — el nu mai e special aici
  })
})
