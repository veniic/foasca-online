import { isSpecialJack } from '@foaica/shared';
/**
 * Stabilește cozul rundei pe baza cărții întoarse.
 * Regulă specială: dacă J♠ (J de verde) este cartea de coz, nu există coz în
 * acea rundă și cărțile se compară doar după valoare (A > K > Q > J > 10 > 9 > 8 > 7 > 6).
 */
export function determineTrump(trumpCard) {
    if (isSpecialJack(trumpCard)) {
        return { suit: null, noTrump: true };
    }
    return { suit: trumpCard.suit, noTrump: false };
}
