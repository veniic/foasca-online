import { FINAL_ROUND } from '@foaica/shared';
export function scoreForExactBid(bid) {
    return 10 + (bid - 1) * 5;
}
export const FAILED_BID_SCORE = -10;
export const PASS_NO_TRICK_SCORE = 5;
export const FINAL_BID_PEEK_SUCCESS = 15;
export const FINAL_BID_PEEK_FAIL = -30;
export const FINAL_BID_NO_PEEK_SUCCESS = 60;
export const FINAL_BID_NO_PEEK_FAIL = -60;
export const FINAL_PASS_PEEK = 15;
export const FINAL_PASS_NO_PEEK = 30;
/**
 * Calculează scorul unui jucător pentru o rundă, date fiind cererea lui,
 * numărul de mâini câștigate efectiv și — doar pentru runda 14 — dacă s-a
 * uitat la carte.
 */
export function calculateRoundScore(roundNumber, bid, tricksWon, peek) {
    if (roundNumber === FINAL_ROUND && peek) {
        if (bid === 'PASS') {
            if (tricksWon >= 1)
                return 1;
            return peek === 'peek' ? FINAL_PASS_PEEK : FINAL_PASS_NO_PEEK;
        }
        // bid === 1 (singura cerere posibilă în runda 14, care are o singură carte)
        const took = tricksWon >= 1;
        if (peek === 'peek')
            return took ? FINAL_BID_PEEK_SUCCESS : FINAL_BID_PEEK_FAIL;
        return took ? FINAL_BID_NO_PEEK_SUCCESS : FINAL_BID_NO_PEEK_FAIL;
    }
    if (bid === 'PASS') {
        if (tricksWon === 0)
            return PASS_NO_TRICK_SCORE;
        return tricksWon;
    }
    if (tricksWon === bid)
        return scoreForExactBid(bid);
    if (tricksWon < bid)
        return FAILED_BID_SCORE;
    return tricksWon;
}
export function calculateBile(total) {
    return total / 10;
}
