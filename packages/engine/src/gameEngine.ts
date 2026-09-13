import {
  Bid,
  Card,
  cardId,
  ClientGameState,
  FINAL_ROUND,
  GamePhase,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PeekChoice,
  PlayedCard,
  PublicPlayer,
  ROUND_CARD_COUNTS,
  RoundHistoryEntry,
  Suit,
  TOTAL_ROUNDS,
} from '@foaica/shared'
import { createDeck, shuffleDeck } from './deck'
import { determineTrump } from './trump'
import { getValidCards, determineTrickWinner } from './rules'
import { getBiddingOrder, getValidBidOptions, isBidValid } from './bidding'
import { calculateBile, calculateRoundScore } from './scoring'

export class EngineError extends Error {}

interface PlayerInternal {
  id: string
  name: string
  connected: boolean
  hand: Card[]
  bid: Bid | null
  tricksWon: number
  peekChoice: PeekChoice | null
  hasAnsweredPeek: boolean
  totalScore: number
}

export interface RngLike {
  (): number
}

/**
 * O cameră de joc completă, ca mașină de stări. O instanță = o partidă.
 * Nu are nicio dependență de rețea — poate fi testată complet izolat.
 */
export class GameRoom {
  readonly code: string
  private players = new Map<string, PlayerInternal>()
  private seatOrder: string[] = []
  private hostId: string
  private rng: RngLike

  phase: GamePhase = 'LOBBY'
  round = 0
  trumpSuit: Suit | null = null
  noTrump = false
  trumpCard: Card | null = null
  leadSuit: Suit | null = null
  currentTrick: PlayedCard[] = []
  biddingOrder: string[] = []
  private biddingPointer = 0
  currentTurnPlayerId: string | null = null
  private currentLeaderId: string | null = null
  lastTrickWinnerId: string | null = null
  private tricksPlayedThisRound = 0
  history: RoundHistoryEntry[] = []
  finalRanking: { playerId: string; name: string; total: number; bile: number }[] | null = null

  constructor(code: string, hostId: string, hostName: string, rng: RngLike = Math.random) {
    this.code = code
    this.hostId = hostId
    this.rng = rng
    this.players.set(hostId, {
      id: hostId,
      name: hostName,
      connected: true,
      hand: [],
      bid: null,
      tricksWon: 0,
      peekChoice: null,
      hasAnsweredPeek: false,
      totalScore: 0,
    })
  }

  // ---------------------------------------------------------------------
  // Lobby
  // ---------------------------------------------------------------------

  addPlayer(id: string, name: string): void {
    if (this.phase !== 'LOBBY') throw new EngineError('Jocul a început deja')
    if (this.players.size >= MAX_PLAYERS) throw new EngineError('Camera este plină (maxim 6 jucători)')
    if (this.players.has(id)) return
    this.players.set(id, {
      id,
      name,
      connected: true,
      hand: [],
      bid: null,
      tricksWon: 0,
      peekChoice: null,
      hasAnsweredPeek: false,
      totalScore: 0,
    })
  }

  /** Marchează un jucător ca deconectat. Dacă era host, transferă rolul. */
  markDisconnected(id: string): void {
    const p = this.players.get(id)
    if (!p) return
    if (this.phase === 'LOBBY') {
      this.players.delete(id)
      if (id === this.hostId) this.promoteNextHost()
      return
    }
    p.connected = false
    if (id === this.hostId) this.promoteNextHost()
  }

  reconnect(id: string): void {
    const p = this.players.get(id)
    if (!p) throw new EngineError('Jucătorul nu aparține acestei camere')
    p.connected = true
  }

  kickPlayer(requesterId: string, targetId: string): void {
    if (requesterId !== this.hostId) throw new EngineError('Doar hostul poate elimina jucători')
    if (this.phase !== 'LOBBY') throw new EngineError('Nu se pot elimina jucători după începerea jocului')
    if (targetId === this.hostId) throw new EngineError('Hostul nu se poate elimina pe sine')
    this.players.delete(targetId)
  }

  private promoteNextHost(): void {
    const nextConnected = [...this.players.values()].find((p) => p.connected)
    if (nextConnected) this.hostId = nextConnected.id
  }

  get hostPlayerId(): string {
    return this.hostId
  }

  // ---------------------------------------------------------------------
  // Start joc / dealing
  // ---------------------------------------------------------------------

  startGame(requesterId: string): void {
    if (requesterId !== this.hostId) throw new EngineError('Doar hostul poate porni jocul')
    if (this.phase !== 'LOBBY') throw new EngineError('Jocul a fost deja pornit')
    if (this.players.size < MIN_PLAYERS) throw new EngineError(`Sunt necesari minim ${MIN_PLAYERS} jucători`)
    this.seatOrder = [...this.players.keys()]
    for (const p of this.players.values()) p.totalScore = 0
    this.round = 0
    this.history = []
    this.startRound()
  }

  private startRound(): void {
    this.round += 1
    if (this.round > TOTAL_ROUNDS) {
      this.finishGame()
      return
    }

    const cardsThisRound = ROUND_CARD_COUNTS[this.round - 1]
    let deck = shuffleDeck(createDeck(), this.rng)

    for (const seat of this.seatOrder) {
      const player = this.players.get(seat)!
      player.hand = deck.splice(0, cardsThisRound)
      player.bid = null
      player.tricksWon = 0
      player.peekChoice = null
      player.hasAnsweredPeek = false
    }

    this.trumpCard = deck.splice(0, 1)[0] ?? null
    if (!this.trumpCard) {
      // Pachetul nu are suficiente cărți pentru coz (poate apărea doar cu 6
      // jucători x 6 cărți = 36, exact tot pachetul). În acest caz, prin
      // definiție, cartea de coz e ultima distribuită global — presupunere
      // documentată: dacă pachetul se epuizează complet la distribuire,
      // NU există coz în acea rundă (fallback sigur, situație rară cu 6
      // jucători în rundele de 6 cărți).
      this.trumpSuit = null
      this.noTrump = true
    } else {
      const t = determineTrump(this.trumpCard)
      this.trumpSuit = t.suit
      this.noTrump = t.noTrump
    }

    this.biddingOrder = getBiddingOrder(this.hostId, this.seatOrder, this.round)
    this.biddingPointer = 0
    this.currentTurnPlayerId = this.biddingOrder[0]
    this.currentTrick = []
    this.leadSuit = null
    this.tricksPlayedThisRound = 0
    this.lastTrickWinnerId = null
    this.phase = 'BIDDING'
  }

  // ---------------------------------------------------------------------
  // Bidding
  // ---------------------------------------------------------------------

  private get cardsThisRound(): number {
    return ROUND_CARD_COUNTS[this.round - 1] ?? 0
  }

  submitBid(playerId: string, bid: Bid): void {
    if (this.phase !== 'BIDDING') throw new EngineError('Nu este faza de cereri')
    if (this.currentTurnPlayerId !== playerId) throw new EngineError('Nu este rândul tău să ceri')

    if (!isBidValid(bid, this.cardsThisRound)) {
      throw new EngineError(`Cererea nu este validă (valorile permise sunt PASS sau 1-${this.cardsThisRound})`)
    }

    this.players.get(playerId)!.bid = bid
    this.biddingPointer += 1

    if (this.biddingPointer >= this.biddingOrder.length) {
      this.currentTurnPlayerId = null
      if (this.round === FINAL_ROUND) {
        this.phase = 'ROUND_14_LOOK_PHASE'
      } else {
        this.beginPlayingPhase()
      }
    } else {
      this.currentTurnPlayerId = this.biddingOrder[this.biddingPointer]
    }
  }

  // ---------------------------------------------------------------------
  // Runda 14 — "te-ai uitat la carte?"
  // ---------------------------------------------------------------------

  submitPeek(playerId: string, choice: PeekChoice): void {
    if (this.phase !== 'ROUND_14_LOOK_PHASE') throw new EngineError('Nu este faza de răspuns pentru runda 14')
    const p = this.players.get(playerId)
    if (!p) throw new EngineError('Jucător necunoscut')
    if (p.hasAnsweredPeek) throw new EngineError('Ai răspuns deja')
    p.peekChoice = choice
    p.hasAnsweredPeek = true

    const allAnswered = this.seatOrder.every((id) => this.players.get(id)!.hasAnsweredPeek)
    if (allAnswered) {
      this.beginPlayingPhase()
    }
  }

  private beginPlayingPhase(): void {
    this.currentLeaderId = this.biddingOrder[0]
    this.currentTurnPlayerId = this.currentLeaderId
    this.leadSuit = null
    this.currentTrick = []
    this.phase = 'PLAYING_TRICK'
  }

  // ---------------------------------------------------------------------
  // Joc — mâinile
  // ---------------------------------------------------------------------

  private trickTurnOrder(): string[] {
    const n = this.seatOrder.length
    const leaderIndex = this.seatOrder.indexOf(this.currentLeaderId!)
    const order: string[] = []
    for (let i = 0; i < n; i++) order.push(this.seatOrder[(leaderIndex + i) % n])
    return order
  }

  getValidCardsFor(playerId: string): Card[] {
    const p = this.players.get(playerId)
    if (!p) return []
    return getValidCards(p.hand, this.leadSuit, this.trumpSuit, this.noTrump)
  }

  playCard(playerId: string, card: Card): void {
    if (this.phase !== 'PLAYING_TRICK') throw new EngineError('Nu este faza de joc a cărților')
    if (this.currentTurnPlayerId !== playerId) throw new EngineError('Nu este rândul tău')

    const player = this.players.get(playerId)!
    const idx = player.hand.findIndex((c) => cardId(c) === cardId(card))
    if (idx === -1) throw new EngineError('Nu ai această carte în mână')

    const valid = getValidCards(player.hand, this.leadSuit, this.trumpSuit, this.noTrump)
    if (!valid.some((c) => cardId(c) === cardId(card))) {
      throw new EngineError('Această carte nu poate fi jucată acum (regula formei/cozii)')
    }

    player.hand.splice(idx, 1)
    this.currentTrick.push({ playerId, card })
    if (this.currentTrick.length === 1) this.leadSuit = card.suit

    const order = this.trickTurnOrder()
    const posInTrick = this.currentTrick.length
    if (posInTrick < order.length) {
      this.currentTurnPlayerId = order[posInTrick]
      return
    }

    // Mâna s-a încheiat
    const winnerId = determineTrickWinner(this.currentTrick, this.leadSuit!, this.trumpSuit, this.noTrump)
    this.players.get(winnerId)!.tricksWon += 1
    this.lastTrickWinnerId = winnerId
    this.tricksPlayedThisRound += 1
    this.currentTurnPlayerId = null
    this.phase = 'TRICK_RESULT'
  }

  /**
   * Joacă orbește cartea ascunsă a rundei 14 pentru un jucător care a ales
   * "Nu m-am uitat" — clientul nu trimite (și nu cunoaște) valoarea cărții;
   * serverul o joacă direct din mâna internă a jucătorului.
   */
  playHiddenCard(playerId: string): void {
    if (this.round !== FINAL_ROUND) throw new EngineError('Jocul orb e disponibil doar în runda 14')
    const player = this.players.get(playerId)
    if (!player) throw new EngineError('Jucător necunoscut')
    if (player.peekChoice === 'peek') {
      throw new EngineError('Te-ai uitat la carte — joac-o normal, cu playCard')
    }
    if (player.hand.length !== 1) {
      throw new EngineError('Cartea ascunsă nu mai este disponibilă')
    }
    this.playCard(playerId, player.hand[0])
  }

  /** Apelat de server (de obicei după o mică pauză) pentru a continua după afișarea câștigătorului mânii. */
  advanceAfterTrick(): void {
    if (this.phase !== 'TRICK_RESULT') throw new EngineError('Nu este momentul potrivit')
    if (this.tricksPlayedThisRound >= this.cardsThisRound) {
      this.finishRound()
      return
    }
    this.currentLeaderId = this.lastTrickWinnerId
    this.currentTurnPlayerId = this.currentLeaderId
    this.leadSuit = null
    this.currentTrick = []
    this.phase = 'PLAYING_TRICK'
  }

  private finishRound(): void {
    const scores: Record<string, number> = {}
    for (const id of this.seatOrder) {
      const p = this.players.get(id)!
      const score = calculateRoundScore(this.round, p.bid as Bid, p.tricksWon, p.peekChoice ?? undefined)
      p.totalScore += score
      scores[id] = score
    }
    this.history.push({ round: this.round, scores })
    this.phase = 'ROUND_RESULT'
  }

  /** Doar hostul poate avansa manual de la ecranul de scor al rundei (dă timp jucătorilor să citească). */
  continueAfterRound(requesterId: string): void {
    if (requesterId !== this.hostId) throw new EngineError('Doar hostul poate continua')
    if (this.phase !== 'ROUND_RESULT') throw new EngineError('Nu este momentul potrivit')
    if (this.round >= TOTAL_ROUNDS) {
      this.finishGame()
    } else {
      this.startRound()
    }
  }

  private finishGame(): void {
    const ranking = this.seatOrder
      .map((id) => {
        const p = this.players.get(id)!
        return { playerId: id, name: p.name, total: p.totalScore, bile: calculateBile(p.totalScore) }
      })
      .sort((a, b) => b.total - a.total)
    this.finalRanking = ranking
    this.phase = 'FINAL_RESULT'
  }

  // ---------------------------------------------------------------------
  // Proiecția stării pentru un client (filtrată — fără cărțile altora)
  // ---------------------------------------------------------------------

  toClientState(forPlayerId: string): ClientGameState {
    const totals: Record<string, number> = {}
    const biles: Record<string, number> = {}
    for (const id of this.seatOrder) {
      const p = this.players.get(id)
      totals[id] = p?.totalScore ?? 0
      biles[id] = calculateBile(totals[id])
    }

    const publicPlayers: PublicPlayer[] = (this.seatOrder.length ? this.seatOrder : [...this.players.keys()]).map(
      (id) => {
        const p = this.players.get(id)!
        return {
          id: p.id,
          name: p.name,
          isHost: p.id === this.hostId,
          connected: p.connected,
          handCount: p.hand.length,
          bid: p.bid,
          tricksWon: p.tricksWon,
          hasAnsweredPeek: p.hasAnsweredPeek,
          totalScore: p.totalScore,
        }
      }
    )

    const me = this.players.get(forPlayerId)
    const isMyBidTurn = this.phase === 'BIDDING' && this.currentTurnPlayerId === forPlayerId
    const isMyPlayTurn = this.phase === 'PLAYING_TRICK' && this.currentTurnPlayerId === forPlayerId

    let validBidOptions: Bid[] = []
    if (isMyBidTurn) {
      validBidOptions = getValidBidOptions(this.cardsThisRound)
    }

    // Runda 14: cartea rămâne ascunsă (NU e trimisă către client) până când
    // jucătorul alege explicit "M-am uitat". Dacă a ales "Nu m-am uitat" (sau
    // încă nu a răspuns), `myHand` nu conține deloc cartea — confidențialitatea
    // se aplică pe server, nu doar vizual în UI.
    const hiddenCardPending = !!me && this.round === FINAL_ROUND && me.hand.length > 0 && me.peekChoice !== 'peek'
    const myHand = me ? (hiddenCardPending ? [] : me.hand.slice()) : []
    // IMPORTANT: id-ul unei cărți conține rangul și culoarea ei (ex: "A-hearts"),
    // deci trimiterea lui ar scurge exact valoarea cărții ascunse. Când cartea
    // e ascunsă, clientul joacă orbește via evenimentul `playHiddenCard`, nu
    // are nevoie de validCardIds.
    const validCardIds = hiddenCardPending ? [] : isMyPlayTurn && me ? this.getValidCardsFor(forPlayerId).map((c) => cardId(c)) : []

    return {
      roomCode: this.code,
      phase: this.phase,
      players: publicPlayers,
      myId: forPlayerId,
      myHand,
      round: this.round,
      cardsThisRound: this.cardsThisRound,
      trickNumber: this.tricksPlayedThisRound + (this.phase === 'PLAYING_TRICK' || this.phase === 'TRICK_RESULT' ? 1 : 0),
      trumpSuit: this.trumpSuit,
      noTrump: this.noTrump,
      trumpCard: this.trumpCard,
      leadSuit: this.leadSuit,
      currentTurnPlayerId: this.currentTurnPlayerId,
      hostId: this.hostId,
      biddingOrder: this.biddingOrder,
      currentTrick: this.currentTrick,
      lastTrickWinnerId: this.lastTrickWinnerId,
      history: this.history,
      totals,
      biles,
      finalRanking: this.finalRanking,
      awaitingMyPeekAnswer: this.phase === 'ROUND_14_LOOK_PHASE' && !!me && !me.hasAnsweredPeek,
      validBidOptions,
      validCardIds,
      hiddenCardPending,
      errorMessage: null,
    }
  }

  get playerIds(): string[] {
    return [...this.players.keys()]
  }

  hasPlayer(id: string): boolean {
    return this.players.has(id)
  }

  get playerCount(): number {
    return this.players.size
  }

  get everyoneDisconnected(): boolean {
    return [...this.players.values()].every((p) => !p.connected)
  }
}
