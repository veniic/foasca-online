import { Card } from '@foaica/shared';
/** Creează pachetul standard de 36 de cărți (4 culori x 9 valori), fără amestecare. */
export declare function createDeck(): Card[];
/**
 * Amestecă un pachet folosind Fisher–Yates.
 * `rng` este injectabil pentru teste deterministe; implicit foloseşte Math.random.
 */
export declare function shuffleDeck(deck: Card[], rng?: () => number): Card[];
