import { Card, Suit } from '@foaica/shared';
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
export declare function getValidCards(hand: Card[], leadSuit: Suit | null, trumpSuit: Suit | null, noTrump: boolean): Card[];
export interface Play {
    playerId: string;
    card: Card;
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
export declare function determineTrickWinner(plays: Play[], leadSuit: Suit, trumpSuit: Suit | null, noTrump: boolean): string;
