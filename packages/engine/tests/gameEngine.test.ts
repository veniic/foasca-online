import { describe, expect, it } from 'vitest'
import { ROUND_CARD_COUNTS, TOTAL_ROUNDS } from '@foaica/shared'
import { GameRoom } from '../src/gameEngine'

function makeRoom(playerCount: number, rng?: () => number) {
  const room = new GameRoom('ABCD1', 'p0', 'Host', rng)
  for (let i = 1; i < playerCount; i++) room.addPlayer(`p${i}`, `Player${i}`)
  return room
}

/** Joacă automat un joc întreg, alegând mereu prima opțiune validă, până la finalul partidei. */
function autoPlayFullGame(room: GameRoom, maxSteps = 20000) {
  let steps = 0
  while (room.phase !== 'FINAL_RESULT') {
    steps++
    if (steps > maxSteps) throw new Error('Prea mulți pași — posibil blocaj infinit')

    if (room.phase === 'BIDDING') {
      const turn = room.currentTurnPlayerId!
      const options = room.toClientState(turn).validBidOptions
      room.submitBid(turn, options[0])
    } else if (room.phase === 'ROUND_14_LOOK_PHASE') {
      for (const id of room.playerIds) {
        const state = room.toClientState(id)
        if (state.awaitingMyPeekAnswer) room.submitPeek(id, 'noPeek')
      }
    } else if (room.phase === 'PLAYING_TRICK') {
      const turn = room.currentTurnPlayerId!
      const validCards = room.getValidCardsFor(turn)
      room.playCard(turn, validCards[0])
    } else if (room.phase === 'TRICK_RESULT') {
      room.advanceAfterTrick()
    } else if (room.phase === 'ROUND_RESULT') {
      room.continueAfterRound(room.hostPlayerId)
    } else {
      throw new Error(`Fază neașteptată: ${room.phase}`)
    }
  }
}

describe('GameRoom — distribuirea cărților', () => {
  for (const count of [2, 3, 4, 5, 6]) {
    it(`distribuie corect cărțile pentru ${count} jucători, runda 1`, () => {
      const room = makeRoom(count)
      room.startGame('p0')
      const state = room.toClientState('p0')
      expect(state.phase).toBe('BIDDING')
      expect(state.myHand.length).toBe(ROUND_CARD_COUNTS[0])
      for (const p of state.players) {
        if (p.id !== 'p0') expect(p.handCount).toBe(ROUND_CARD_COUNTS[0])
      }
    })
  }

  it('respinge pornirea jocului cu mai puțin de 2 jucători', () => {
    const room = new GameRoom('X', 'p0', 'Host')
    expect(() => room.startGame('p0')).toThrow()
  })

  it('respinge un al 7-lea jucător', () => {
    const room = makeRoom(6)
    expect(() => room.addPlayer('p6', 'Extra')).toThrow()
  })
})

describe('GameRoom — confidențialitatea cărților', () => {
  it('un jucător nu vede cărțile altuia, doar numărul lor', () => {
    const room = makeRoom(3)
    room.startGame('p0')
    const stateForP0 = room.toClientState('p0')
    const serialized = JSON.stringify(stateForP0)
    // Cărțile altor jucători nu trebuie să apară nicăieri în state-ul lui p0.
    expect(stateForP0.players.find((p) => p.id === 'p1')).not.toHaveProperty('hand')
    expect(serialized).not.toContain('"myHand":[]') // el chiar are cărți
    // Nu putem verifica direct conținutul cărților lui p1 fără să-l expunem —
    // testul de tip verifică doar forma structurii (fără câmp "hand" pe alți jucători).
  })
})

describe('GameRoom — cererea (regulă corectată: independentă între jucători)', () => {
  it('Test E: nu permite o cerere mai mare decât numărul de cărți din rundă', () => {
    const room = makeRoom(3) // runda 1 are 1 carte
    room.startGame('p0')
    const order = room.toClientState('p0').biddingOrder
    expect(() => room.submitBid(order[0], 2)).toThrow()
    expect(() => room.submitBid(order[0], 1)).not.toThrow()
  })

  it('Test A/D: dacă A cere 1, B (chiar fiind ultimul licitator) poate cere tot 1', () => {
    // Runda cu 2 cărți (runda 2), 2 jucători — cazul exact reclamat: A cere 1,
    // apoi B (ultimul din ordine) TREBUIE să poată cere tot 1.
    const room = makeRoom(2)
    room.startGame('p0')
    // terminăm runda 1 (1 carte) ca să ajungem la runda 2 (2 cărți)
    let order = room.toClientState('p0').biddingOrder
    room.submitBid(order[0], 'PASS')
    room.submitBid(order[1], 'PASS')
    while (room.phase === 'PLAYING_TRICK' || room.phase === 'TRICK_RESULT') {
      if (room.phase === 'PLAYING_TRICK') {
        const turn = room.currentTurnPlayerId!
        room.playCard(turn, room.getValidCardsFor(turn)[0])
      } else {
        room.advanceAfterTrick()
      }
    }
    room.continueAfterRound('p0')
    expect(room.round).toBe(2)

    order = room.toClientState('p0').biddingOrder
    room.submitBid(order[0], 1)
    // ÎNAINTE de corecție, B nu putea cere 1 aici (suma ar fi devenit 2 = cardsThisRound).
    // Acum trebuie să poată.
    expect(() => room.submitBid(order[1], 1)).not.toThrow()
  })

  it('Test B: dacă A cere 2, B poate cere tot 2', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    let order = room.toClientState('p0').biddingOrder
    room.submitBid(order[0], 'PASS')
    room.submitBid(order[1], 'PASS')
    while (room.phase !== 'ROUND_RESULT') {
      if (room.phase === 'PLAYING_TRICK') {
        const turn = room.currentTurnPlayerId!
        room.playCard(turn, room.getValidCardsFor(turn)[0])
      } else if (room.phase === 'TRICK_RESULT') {
        room.advanceAfterTrick()
      }
    }
    room.continueAfterRound('p0') // runda 2 (2 cărți)

    order = room.toClientState('p0').biddingOrder
    room.submitBid(order[0], 2)
    expect(() => room.submitBid(order[1], 2)).not.toThrow()
  })

  it('Test C: dacă A pune PASS, B poate pune tot PASS', () => {
    const room = makeRoom(3)
    room.startGame('p0')
    const order = room.toClientState('p0').biddingOrder
    room.submitBid(order[0], 'PASS')
    expect(() => room.submitBid(order[1], 'PASS')).not.toThrow()
    expect(() => room.submitBid(order[2], 'PASS')).not.toThrow()
  })

  it('Test F: state-ul trimis clientului conține exact opțiunile legale pentru jucătorul curent', () => {
    const room = makeRoom(3) // runda 1, 1 carte
    room.startGame('p0')
    const order = room.toClientState('p0').biddingOrder
    const stateForCurrent = room.toClientState(order[0])
    expect(stateForCurrent.validBidOptions).toEqual(['PASS', 1])
    // Pentru un jucător care NU e la rând, lista trebuie să fie goală.
    const stateForOther = room.toClientState(order[1])
    expect(stateForOther.validBidOptions).toEqual([])
  })
})

describe('GameRoom — reconectare și transfer de host', () => {
  it('păstrează mâna jucătorului la reconectare', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    const handBefore = room.toClientState('p1').myHand
    room.markDisconnected('p1')
    expect(room.toClientState('p1').players.find((p) => p.id === 'p1')!.connected).toBe(false)
    room.reconnect('p1')
    const handAfter = room.toClientState('p1').myHand
    expect(handAfter).toEqual(handBefore)
    expect(room.toClientState('p1').players.find((p) => p.id === 'p1')!.connected).toBe(true)
  })

  it('transferă rolul de host dacă hostul se deconectează în timpul jocului', () => {
    const room = makeRoom(3)
    room.startGame('p0')
    expect(room.hostPlayerId).toBe('p0')
    room.markDisconnected('p0')
    expect(room.hostPlayerId).not.toBe('p0')
    expect(['p1', 'p2']).toContain(room.hostPlayerId)
  })

  it('elimină jucătorul din lobby dacă se deconectează înainte de start', () => {
    const room = makeRoom(3)
    room.markDisconnected('p2')
    expect(room.hasPlayer('p2')).toBe(false)
    expect(room.playerCount).toBe(2)
  })
})

describe('GameRoom — flux complet, toate cele 14 runde', () => {
  for (const count of [2, 3, 4, 6]) {
    it(`joacă o partidă completă cu ${count} jucători până la rezultatul final`, () => {
      const room = makeRoom(count)
      room.startGame('p0')
      autoPlayFullGame(room)

      expect(room.phase).toBe('FINAL_RESULT')
      expect(room.history.length).toBe(TOTAL_ROUNDS)
      expect(room.finalRanking).not.toBeNull()
      expect(room.finalRanking!.length).toBe(count)

      // clasamentul e sortat descrescător
      const totals = room.finalRanking!.map((r) => r.total)
      for (let i = 1; i < totals.length; i++) expect(totals[i - 1]).toBeGreaterThanOrEqual(totals[i])

      // bilele corespund exact totalului / 10 pentru fiecare jucător
      for (const entry of room.finalRanking!) {
        expect(entry.bile).toBeCloseTo(entry.total / 10, 10)
      }

      // fiecare mână de fiecare rundă a fost înregistrată cu un scor per jucător
      for (const roundEntry of room.history) {
        expect(Object.keys(roundEntry.scores).length).toBe(count)
      }
    })
  }

  it('la finalul jocului, toate mâinile sunt goale', () => {
    const room = makeRoom(4)
    room.startGame('p0')
    autoPlayFullGame(room)
    for (const id of room.playerIds) {
      expect(room.toClientState(id).myHand.length).toBe(0)
    }
  })
})

describe('GameRoom — validarea mutărilor pe server', () => {
  it('nu permite jucarea unei cărți care nu e în mâna jucătorului', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    const order = room.toClientState('p0').biddingOrder
    room.submitBid(order[0], 'PASS')
    room.submitBid(order[1], 'PASS') // al doilea jucător, PASS e mereu o opțiune validă
    const player = order[0]
    const fakeCard = { suit: 'clubs' as const, rank: '6' as const }
    const realHand = room.toClientState(player).myHand
    if (realHand.some((c) => c.suit === fakeCard.suit && c.rank === fakeCard.rank)) {
      // Coincidență posibilă (pachet mic): alegem o carte garantat absentă din mână.
      fakeCard.rank = realHand[0].rank === 'A' ? '6' : 'A'
      fakeCard.suit = realHand[0].suit === 'clubs' ? 'diamonds' : 'clubs'
    }
    expect(() => room.playCard(player, fakeCard)).toThrow()
  })

  it('nu permite jucarea în afara rândului', () => {
    const room = makeRoom(3)
    room.startGame('p0')
    const order = room.toClientState('p0').biddingOrder
    for (const id of order) room.submitBid(id, room.toClientState(id).validBidOptions[0])
    const notMyTurn = room.playerIds.find((id) => id !== room.currentTurnPlayerId)!
    const someCard = room.toClientState(notMyTurn).myHand[0]
    expect(() => room.playCard(notMyTurn, someCard)).toThrow()
  })

  it('nu permite cereri în afara fazei de cereri', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    const order = room.toClientState('p0').biddingOrder
    room.submitBid(order[0], 'PASS')
    room.submitBid(order[1], 'PASS')
    // acum suntem în PLAYING_TRICK
    expect(() => room.submitBid(order[0], 'PASS')).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Runda 14 — ordinea corectă: LOOK/DON'T LOOK ÎNAINTE de cerere (PASS/1)
// ---------------------------------------------------------------------------

function driveToFinalRound(room: GameRoom) {
  while (room.round < 14 || room.phase === 'ROUND_RESULT') {
    if (room.phase === 'BIDDING') {
      const turn = room.currentTurnPlayerId!
      room.submitBid(turn, room.toClientState(turn).validBidOptions[0])
    } else if (room.phase === 'PLAYING_TRICK') {
      const turn = room.currentTurnPlayerId!
      room.playCard(turn, room.getValidCardsFor(turn)[0])
    } else if (room.phase === 'TRICK_RESULT') {
      room.advanceAfterTrick()
    } else if (room.phase === 'ROUND_RESULT') {
      if (room.round >= 14) break
      room.continueAfterRound(room.hostPlayerId)
    }
  }
}

describe("GameRoom — runda 14, ordinea LOOK/DON'T LOOK înainte de cerere", () => {
  it('Test: runda 14 pornește DIRECT în ROUND_14_LOOK_PHASE, nu în BIDDING', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    expect(room.round).toBe(14)
    expect(room.phase).toBe('ROUND_14_LOOK_PHASE')
  })

  it('Test: PASS/CERE 1 nu pot fi alese înainte de decizia LOOK/DON\'T LOOK', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder
    // faza curentă e ROUND_14_LOOK_PHASE, nu BIDDING — o cerere trebuie respinsă
    expect(() => room.submitBid(order[0], 'PASS')).toThrow()
    expect(() => room.submitBid(order[0], 1)).toThrow()
  })

  it('Test A: la începutul rundei 14, cartea există dar e ascunsă și decizia nu a fost luată', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    expect(room.round).toBe(14)
    for (const id of room.playerIds) {
      const publicPlayer = room.toClientState(id).players.find((p) => p.id === id)!
      expect(publicPlayer.hasAnsweredPeek).toBe(false) // decizia nu a fost luată încă
      expect(publicPlayer.handCount).toBe(1) // cartea există (a fost distribuită)
      expect(room.toClientState(id).hiddenCardPending).toBe(true)
      expect(room.toClientState(id).myHand).toEqual([])
    }
  })

  it('Test B: alegerea LOOK (peek) revelează cartea DOAR acelui jucător, ÎNAINTE de cerere', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder
    expect(room.phase).toBe('ROUND_14_LOOK_PHASE')

    const beforeLook = room.toClientState(order[0])
    expect(beforeLook.hiddenCardPending).toBe(true)
    expect(beforeLook.myHand).toEqual([])

    room.submitPeek(order[0], 'peek')
    const afterLook = room.toClientState(order[0])
    expect(afterLook.hiddenCardPending).toBe(false)
    expect(afterLook.myHand.length).toBe(1) // acum vede cartea, înainte să declare

    // celălalt jucător, care încă n-a răspuns, rămâne cu cartea ascunsă
    const otherStillHidden = room.toClientState(order[1])
    expect(otherStillHidden.hiddenCardPending).toBe(true)
    expect(otherStillHidden.myHand).toEqual([])
    // și faza rămâne ROUND_14_LOOK_PHASE până răspunde și el
    expect(room.phase).toBe('ROUND_14_LOOK_PHASE')
  })

  it("Test C: alegerea DON'T LOOK (noPeek) păstrează cartea ascunsă, inclusiv în timpul cererii", () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder

    room.submitPeek(order[0], 'noPeek')
    const state = room.toClientState(order[0])
    expect(state.hiddenCardPending).toBe(true)
    expect(state.myHand).toEqual([])

    room.submitPeek(order[1], 'peek')
    expect(room.phase).toBe('BIDDING') // acum, DUPĂ decizie, începe faza de cereri

    const duringBid = room.toClientState(order[0])
    expect(duringBid.hiddenCardPending).toBe(true)
    expect(duringBid.myHand).toEqual([])
  })

  it("Test D: nu poți schimba decizia (LOOK apoi DON'T LOOK, sau invers) — a doua încercare e respinsă", () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder

    room.submitPeek(order[0], 'peek')
    expect(() => room.submitPeek(order[0], 'noPeek')).toThrow()
    expect(() => room.submitPeek(order[0], 'peek')).toThrow()
  })

  it('Test E: un jucător care nu s-a uitat NU primește niciodată valoarea cărții, nici prin validCardIds', () => {
    const room = makeRoom(3)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder
    for (const id of order) room.submitPeek(id, 'noPeek')
    expect(room.phase).toBe('BIDDING')
    for (const id of order) room.submitBid(id, 'PASS')
    expect(room.phase).toBe('PLAYING_TRICK')
    for (const id of order) {
      const s = room.toClientState(id)
      expect(s.myHand).toEqual([])
      expect(s.validCardIds).toEqual([])
    }
  })

  it('Test F: alegerea unui jucător nu scurge cartea altui jucător (confidențialitate multiplayer)', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder
    room.submitPeek(order[0], 'peek')

    const stateForOpponent = room.toClientState(order[1])
    const serialized = JSON.stringify(stateForOpponent)
    const myRevealedCard = room.toClientState(order[0]).myHand[0]
    expect(serialized.includes(`"${myRevealedCard.rank}"`) && serialized.includes(`"${myRevealedCard.suit}"`)).toBe(
      false
    )
  })

  it('PASS funcționează după LOOK', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder
    room.submitPeek(order[0], 'peek')
    room.submitPeek(order[1], 'peek')
    expect(room.phase).toBe('BIDDING')
    expect(() => room.submitBid(order[0], 'PASS')).not.toThrow()
  })

  it('CERE 1 funcționează după LOOK', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder
    room.submitPeek(order[0], 'peek')
    room.submitPeek(order[1], 'peek')
    expect(() => room.submitBid(order[0], 1)).not.toThrow()
  })

  it("PASS funcționează după DON'T LOOK", () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder
    room.submitPeek(order[0], 'noPeek')
    room.submitPeek(order[1], 'noPeek')
    expect(() => room.submitBid(order[0], 'PASS')).not.toThrow()
  })

  it("CERE 1 funcționează după DON'T LOOK (joc orb ulterior)", () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder
    room.submitPeek(order[0], 'noPeek')
    room.submitPeek(order[1], 'noPeek')
    expect(() => room.submitBid(order[0], 1)).not.toThrow()
  })

  it("Test G: scorul corect se aplică pentru LOOK vs DON'T LOOK (regulile existente, secțiunile 22-23)", () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder
    room.submitPeek(order[0], 'noPeek') // acest jucător nu se uită
    room.submitPeek(order[1], 'peek') // acesta se uită
    expect(room.phase).toBe('BIDDING')
    room.submitBid(order[0], 'PASS')
    room.submitBid(order[1], 'PASS')
    expect(room.phase).toBe('PLAYING_TRICK')

    while (room.phase === 'PLAYING_TRICK' || room.phase === 'TRICK_RESULT') {
      if (room.phase === 'PLAYING_TRICK') {
        const turn = room.currentTurnPlayerId!
        if (turn === order[0]) room.playHiddenCard(turn)
        else room.playCard(turn, room.getValidCardsFor(turn)[0])
      } else {
        room.advanceAfterTrick()
      }
    }
    expect(room.phase).toBe('ROUND_RESULT')
    const roundScores = room.history.find((h) => h.round === 14)!.scores
    const scoreP0 = roundScores[order[0]]
    const scoreP1 = roundScores[order[1]]
    // PASS + nu s-a uitat + nu a luat => +30 ; PASS + nu s-a uitat + a luat => +1
    expect([30, 1]).toContain(scoreP0)
    // PASS + s-a uitat + nu a luat => +15 ; PASS + s-a uitat + a luat => +1
    expect([15, 1]).toContain(scoreP1)
  })
})

describe('GameRoom — playHiddenCard, validare', () => {
  it('respinge playHiddenCard dacă jucătorul a ales deja "m-am uitat"', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    driveToFinalRound(room)
    const order = room.toClientState('p0').biddingOrder
    room.submitPeek(order[0], 'peek')
    room.submitPeek(order[1], 'peek')
    room.submitBid(order[0], 'PASS')
    room.submitBid(order[1], 'PASS')
    expect(() => room.playHiddenCard(order[0])).toThrow()
  })

  it('respinge playHiddenCard în afara rundei 14', () => {
    const room = makeRoom(2)
    room.startGame('p0')
    expect(() => room.playHiddenCard('p0')).toThrow()
  })
})
