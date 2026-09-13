// ============================================================================
// Foașca Online — tipuri partajate între engine, server și client.
// ============================================================================

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades'
export const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']
export const SUIT_SYMBOL: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
export const RANKS: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
/** Puterea cărții după valoare, folosită doar când NU există coz (cazul J♣-coz). */
export const RANK_POWER: Record<Rank, number> = {
  '6': 0,
  '7': 1,
  '8': 2,
  '9': 3,
  '10': 4,
  J: 5,
  Q: 6,
  K: 7,
  A: 8,
}

export interface Card {
  suit: Suit
  rank: Rank
}

export function cardId(c: Card): string {
  return `${c.rank}-${c.suit}`
}

export function isJackOfClubs(c: Card): boolean {
  return c.suit === 'clubs' && c.rank === 'J'
}

/** Numărul de cărți distribuite fiecărui jucător, pentru rundele 1-14. */
export const ROUND_CARD_COUNTS: number[] = [1, 2, 3, 4, 5, 6, 6, 6, 5, 4, 3, 2, 1, 1]
export const TOTAL_ROUNDS = ROUND_CARD_COUNTS.length
export const FINAL_ROUND = TOTAL_ROUNDS

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6

export type Bid = number | 'PASS'
export type PeekChoice = 'peek' | 'noPeek'

// ---------------------------------------------------------------------------
// Faze ale mașinii de stări a unei runde/camere
// ---------------------------------------------------------------------------
export type GamePhase =
  | 'LOBBY'
  | 'DEALING'
  | 'TRUMP_REVEAL'
  | 'BIDDING'
  | 'ROUND_14_LOOK_PHASE'
  | 'PLAYING_TRICK'
  | 'TRICK_RESULT'
  | 'ROUND_RESULT'
  | 'FINAL_RESULT'

// ---------------------------------------------------------------------------
// Reprezentarea publică (filtrată) a stării jocului, trimisă către un client.
// Fiecare client primește propriile cărți, dar doar NUMĂRUL de cărți al
// celorlalți jucători — niciodată conținutul mâinilor lor.
// ---------------------------------------------------------------------------
export interface PublicPlayer {
  id: string
  name: string
  isHost: boolean
  connected: boolean
  handCount: number
  bid: Bid | null
  tricksWon: number
  /** Doar pentru runda 14: dacă jucătorul a răspuns deja la "te-ai uitat?" (fără a arăta răspunsul). */
  hasAnsweredPeek: boolean
  totalScore: number
}

export interface PlayedCard {
  playerId: string
  card: Card
}

export interface RoundHistoryEntry {
  round: number
  scores: Record<string, number> // playerId -> scor rundă
}

export interface ClientGameState {
  roomCode: string
  phase: GamePhase
  players: PublicPlayer[]
  myId: string
  myHand: Card[]
  round: number
  cardsThisRound: number
  trickNumber: number
  trumpSuit: Suit | null
  noTrump: boolean // adevărat dacă J♣ a fost cartea de coz (nu există coz în rundă)
  trumpCard: Card | null
  leadSuit: Suit | null
  currentTurnPlayerId: string | null
  hostId: string
  biddingOrder: string[]
  currentTrick: PlayedCard[]
  lastTrickWinnerId: string | null
  history: RoundHistoryEntry[]
  totals: Record<string, number>
  biles: Record<string, number>
  finalRanking: { playerId: string; name: string; total: number; bile: number }[] | null
  /** Dacă runda curentă e 14 și e rândul meu să răspund la "te-ai uitat?". */
  awaitingMyPeekAnswer: boolean
  /**
   * Adevărat dacă am o carte "ascunsă" în runda 14 (nu am ales să mă uit, sau
   * încă nu am decis) — în acest caz `myHand` NU conține acea carte deloc.
   * Serverul nu trimite niciodată valoarea unei cărți ascunse către client.
   */
  hiddenCardPending: boolean
  /** Valorile de cerere valide pentru MINE acum (gol dacă nu e rândul meu). */
  validBidOptions: Bid[]
  /** id-urile cărților mele care pot fi jucate acum (gol dacă nu e rândul meu). */
  validCardIds: string[]
  errorMessage: string | null
}

// ---------------------------------------------------------------------------
// Evenimente Socket.IO — client -> server
// ---------------------------------------------------------------------------
export interface ClientToServerEvents {
  createRoom: (payload: { playerName: string }, cb: (res: { ok: true; roomCode: string; sessionToken: string } | { ok: false; error: string }) => void) => void
  joinRoom: (payload: { roomCode: string; playerName: string }, cb: (res: { ok: true; sessionToken: string } | { ok: false; error: string }) => void) => void
  rejoinRoom: (payload: { roomCode: string; sessionToken: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void
  startGame: (payload: { roomCode: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void
  kickPlayer: (payload: { roomCode: string; playerId: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void
  submitBid: (payload: { roomCode: string; bid: Bid }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void
  submitPeek: (payload: { roomCode: string; choice: PeekChoice }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void
  playCard: (payload: { roomCode: string; card: Card }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void
  /** Joacă orbește cartea ascunsă a rundei 14 (jucătorul a ales să NU se uite). */
  playHiddenCard: (payload: { roomCode: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void
  continueAfterTrick: (payload: { roomCode: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void
  continueAfterRound: (payload: { roomCode: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void
}

// ---------------------------------------------------------------------------
// Evenimente Socket.IO — server -> client
// ---------------------------------------------------------------------------
export interface ServerToClientEvents {
  state: (state: ClientGameState) => void
  errorToast: (message: string) => void
}
