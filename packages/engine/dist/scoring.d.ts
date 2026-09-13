import { Bid, PeekChoice } from '@foaica/shared';
export declare function scoreForExactBid(bid: number): number;
export declare const FAILED_BID_SCORE = -10;
export declare const PASS_NO_TRICK_SCORE = 5;
export declare const FINAL_BID_PEEK_SUCCESS = 15;
export declare const FINAL_BID_PEEK_FAIL = -30;
export declare const FINAL_BID_NO_PEEK_SUCCESS = 60;
export declare const FINAL_BID_NO_PEEK_FAIL = -60;
export declare const FINAL_PASS_PEEK = 15;
export declare const FINAL_PASS_NO_PEEK = 30;
/**
 * Calculează scorul unui jucător pentru o rundă, date fiind cererea lui,
 * numărul de mâini câștigate efectiv și — doar pentru runda 14 — dacă s-a
 * uitat la carte.
 */
export declare function calculateRoundScore(roundNumber: number, bid: Bid, tricksWon: number, peek?: PeekChoice): number;
export declare function calculateBile(total: number): number;
