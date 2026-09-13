import { Bid } from '@foaica/shared';
/**
 * Ordinea de cerere pentru o rundă.
 *
 * Runda 1: jucătorul de după HOST cere primul, apoi rotația continuă.
 * Runda 2: pornește cu următorul jucător (host + 2), etc.
 * În general: pornește de la poziția (indexul hostului + numărul rundei) în lista
 * de locuri fixă (seatOrder), apoi rotește prin toți jucătorii, în ordine.
 *
 * Presupunere documentată: aceeași ordine de rotație (host + numărul rundei)
 * este folosită și pentru a stabili cine deschide PRIMA mână a fiecărei runde;
 * cerințele specifică explicit doar runda 1 ("începe jucătorul de după HOST în
 * prima rundă"), dar generalizarea e cea mai logică variantă pentru rundele următoare
 * (după prima mână a rundei, câștigătorul mânii precedente conduce mâna următoare,
 * conform secțiunii 10).
 */
export declare function getBiddingOrder(hostId: string, seatOrder: string[], roundNumber: number): string[];
/**
 * Opțiunile de cerere valide pentru un jucător într-o rundă cu `cardsThisRound` cărți.
 *
 * IMPORTANT — corecție de regulă (nu mai există restricția "suma cererilor nu
 * poate fi egală cu numărul de cărți"): fiecare jucător poate cere PASS sau
 * orice valoare între 1 și `cardsThisRound`, INDEPENDENT de ce au cerut ceilalți
 * jucători înaintea lui. Faptul că un alt jucător a ales deja o valoare NU o
 * elimină din opțiunile disponibile pentru jucătorul curent. Singura limită este
 * numărul de cărți disponibile în rundă (nu poți cere mai mult decât ai cărți).
 */
export declare function getValidBidOptions(cardsThisRound: number): Bid[];
export declare function isBidValid(bid: Bid, cardsThisRound: number): boolean;
