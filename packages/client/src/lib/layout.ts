/**
 * Poziționarea jucătorilor în jurul unei mese ovale.
 *
 * Regula: jucătorul local e mereu jos (sud), indiferent de id-ul lui de server —
 * ceilalți sunt distribuiți uniform pe restul cercului, în ordinea de la masă
 * (seatOrder), ca rotația vizuală să corespundă rotației reale a rândului.
 */

export function rotateToFirst<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  const idx = arr.findIndex(predicate)
  if (idx <= 0) return arr.slice()
  return [...arr.slice(idx), ...arr.slice(0, idx)]
}

/**
 * Unghiurile (în grade) pentru N locuri, pornind de la 90° (jos, sud) și
 * mergând în sensul acelor de ceasornic. index 0 = jos = mereu "eu".
 */
export function computeSeatAngles(n: number): number[] {
  if (n <= 0) return []
  const step = 360 / n
  return Array.from({ length: n }, (_, k) => 90 + k * step)
}

export interface Point {
  leftPct: number
  topPct: number
}

/** Convertește un unghi într-o poziție procentuală pe o elipsă centrată la 50/50. */
export function pointOnEllipse(angleDeg: number, rx: number, ry: number): Point {
  const rad = (angleDeg * Math.PI) / 180
  return {
    leftPct: 50 + Math.cos(rad) * rx,
    topPct: 50 + Math.sin(rad) * ry,
  }
}
