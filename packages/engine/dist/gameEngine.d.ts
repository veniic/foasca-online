import { Bid, Card, ClientGameState, GamePhase, PeekChoice, PlayedCard, RoundHistoryEntry, Suit } from '@foaica/shared';
export declare class EngineError extends Error {
}
export interface RngLike {
    (): number;
}
/**
 * O cameră de joc completă, ca mașină de stări. O instanță = o partidă.
 * Nu are nicio dependență de rețea — poate fi testată complet izolat.
 */
export declare class GameRoom {
    readonly code: string;
    private players;
    private seatOrder;
    private hostId;
    private rng;
    phase: GamePhase;
    round: number;
    trumpSuit: Suit | null;
    noTrump: boolean;
    trumpCard: Card | null;
    leadSuit: Suit | null;
    currentTrick: PlayedCard[];
    biddingOrder: string[];
    private biddingPointer;
    currentTurnPlayerId: string | null;
    private currentLeaderId;
    lastTrickWinnerId: string | null;
    private tricksPlayedThisRound;
    history: RoundHistoryEntry[];
    finalRanking: {
        playerId: string;
        name: string;
        total: number;
        bile: number;
    }[] | null;
    constructor(code: string, hostId: string, hostName: string, rng?: RngLike);
    addPlayer(id: string, name: string): void;
    /** Marchează un jucător ca deconectat. Dacă era host, transferă rolul. */
    markDisconnected(id: string): void;
    reconnect(id: string): void;
    kickPlayer(requesterId: string, targetId: string): void;
    private promoteNextHost;
    get hostPlayerId(): string;
    startGame(requesterId: string): void;
    private startRound;
    private get cardsThisRound();
    submitBid(playerId: string, bid: Bid): void;
    submitPeek(playerId: string, choice: PeekChoice): void;
    private beginPlayingPhase;
    private trickTurnOrder;
    getValidCardsFor(playerId: string): Card[];
    playCard(playerId: string, card: Card): void;
    /**
     * Joacă orbește cartea ascunsă a rundei 14 pentru un jucător care a ales
     * "Nu m-am uitat" — clientul nu trimite (și nu cunoaște) valoarea cărții;
     * serverul o joacă direct din mâna internă a jucătorului.
     */
    playHiddenCard(playerId: string): void;
    /** Apelat de server (de obicei după o mică pauză) pentru a continua după afișarea câștigătorului mânii. */
    advanceAfterTrick(): void;
    private finishRound;
    /** Doar hostul poate avansa manual de la ecranul de scor al rundei (dă timp jucătorilor să citească). */
    continueAfterRound(requesterId: string): void;
    private finishGame;
    toClientState(forPlayerId: string): ClientGameState;
    get playerIds(): string[];
    hasPlayer(id: string): boolean;
    get playerCount(): number;
    get everyoneDisconnected(): boolean;
}
