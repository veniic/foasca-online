// ============================================================================
// Foașca Online — tipuri partajate între engine, server și client.
// ============================================================================
export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
export const SUIT_SYMBOL = {
    clubs: '♣',
    diamonds: '♦',
    hearts: '♥',
    spades: '♠',
};
export const RANKS = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
/** Puterea cărții după valoare, folosită doar când NU există coz (cazul J♣-coz). */
export const RANK_POWER = {
    '6': 0,
    '7': 1,
    '8': 2,
    '9': 3,
    '10': 4,
    J: 5,
    Q: 6,
    K: 7,
    A: 8,
};
export function cardId(c) {
    return `${c.rank}-${c.suit}`;
}
/**
 * Cartea specială a jocului ("J de verde"): J♠ (Jack of Spades/Pică).
 * IMPORTANT: în această variantă a jocului, verde = Pică (Spades), NU Trefla/Clubs.
 */
export function isSpecialJack(c) {
    return c.suit === 'spades' && c.rank === 'J';
}
/** Numărul de cărți distribuite fiecărui jucător, pentru rundele 1-14. */
export const ROUND_CARD_COUNTS = [1, 2, 3, 4, 5, 6, 6, 6, 5, 4, 3, 2, 1, 1];
export const TOTAL_ROUNDS = ROUND_CARD_COUNTS.length;
export const FINAL_ROUND = TOTAL_ROUNDS;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
