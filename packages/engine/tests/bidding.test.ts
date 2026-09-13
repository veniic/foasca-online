import { describe, expect, it } from 'vitest'
import { getBiddingOrder, getValidBidOptions, isBidValid } from '../src/bidding'

describe('getBiddingOrder', () => {
  const seats = ['H', 'J2', 'J3', 'J4'] // H = host

  it('runda 1: începe cu jucătorul de după host', () => {
    expect(getBiddingOrder('H', seats, 1)).toEqual(['J2', 'J3', 'J4', 'H'])
  })

  it('runda 2: începe cu următorul jucător', () => {
    expect(getBiddingOrder('H', seats, 2)).toEqual(['J3', 'J4', 'H', 'J2'])
  })

  it('runda 3: rotația continuă', () => {
    expect(getBiddingOrder('H', seats, 3)).toEqual(['J4', 'H', 'J2', 'J3'])
  })

  it('runda 4: revine aproape la ordinea inițială (rotație completă la 4 jucători)', () => {
    expect(getBiddingOrder('H', seats, 4)).toEqual(['H', 'J2', 'J3', 'J4'])
  })

  it('funcționează pentru 2 jucători', () => {
    expect(getBiddingOrder('H', ['H', 'J2'], 1)).toEqual(['J2', 'H'])
  })

  it('funcționează pentru 6 jucători', () => {
    const six = ['H', 'A', 'B', 'C', 'D', 'E']
    expect(getBiddingOrder('H', six, 1)).toEqual(['A', 'B', 'C', 'D', 'E', 'H'])
  })
})

describe('getValidBidOptions / isBidValid — regulă corectată', () => {
  // IMPORTANT: nu mai există restricția "suma tuturor cererilor nu poate fi
  // egală cu numărul de cărți". Opțiunile fiecărui jucător depind DOAR de
  // câte cărți sunt disponibile în rundă, niciodată de ce au ales ceilalți.

  it('opțiunile sunt mereu PASS + 1..cardsThisRound, indiferent de poziția în ordine', () => {
    expect(getValidBidOptions(4)).toEqual(['PASS', 1, 2, 3, 4])
    expect(getValidBidOptions(1)).toEqual(['PASS', 1])
    expect(getValidBidOptions(6)).toEqual(['PASS', 1, 2, 3, 4, 5, 6])
  })

  it('Test A: dacă A a cerut 1, B poate cere și el 1 dacă e valid pentru B', () => {
    const optionsForA = getValidBidOptions(3)
    const optionsForB = getValidBidOptions(3) // opțiunile lui B nu depind de alegerea lui A
    expect(optionsForA).toContain(1)
    expect(optionsForB).toContain(1)
  })

  it('Test B: dacă A a cerut 2, B poate cere și el 2 dacă e valid pentru B', () => {
    const optionsForB = getValidBidOptions(3)
    expect(optionsForB).toContain(2)
  })

  it('Test C: dacă A a pus PASS, B poate pune și el PASS', () => {
    const optionsForB = getValidBidOptions(3)
    expect(optionsForB).toContain('PASS')
  })

  it('Test D: isBidValid nu respinge o valoare doar pentru că a mai fost folosită', () => {
    // Simulăm 3 jucători cerând toți aceeași valoare, într-o rundă cu 3 cărți.
    expect(isBidValid(1, 3)).toBe(true) // A cere 1
    expect(isBidValid(1, 3)).toBe(true) // B cere tot 1 — trebuie să rămână valid
    expect(isBidValid(1, 3)).toBe(true) // C cere tot 1 — trebuie să rămână valid
  })

  it('Test E: o cerere mai mare decât numărul de cărți disponibile e respinsă', () => {
    expect(isBidValid(3, 2)).toBe(false) // doar 2 cărți disponibile, 3 nu e valid
    expect(getValidBidOptions(2)).not.toContain(3)
  })

  it('PASS este mereu valid, indiferent de câte cărți sunt în rundă', () => {
    expect(isBidValid('PASS', 1)).toBe(true)
    expect(isBidValid('PASS', 6)).toBe(true)
  })

  it('0 sau valori negative nu sunt cereri valide (trebuie folosit PASS pentru "0")', () => {
    expect(isBidValid(0 as any, 4)).toBe(false)
    expect(isBidValid(-1 as any, 4)).toBe(false)
  })
})
