import { describe, expect, it } from 'vitest'
import { calculateBile, calculateRoundScore } from '../src/scoring'

describe('calculateRoundScore — rundele 1-13', () => {
  it('cerere exactă: scorurile fixe', () => {
    expect(calculateRoundScore(1, 1, 1)).toBe(10)
    expect(calculateRoundScore(2, 2, 2)).toBe(15)
    expect(calculateRoundScore(3, 3, 3)).toBe(20)
    expect(calculateRoundScore(4, 4, 4)).toBe(25)
    expect(calculateRoundScore(5, 5, 5)).toBe(30)
    expect(calculateRoundScore(6, 6, 6)).toBe(35)
  })

  it('cerere neîndeplinită (mai puține câștigate): X = -10, indiferent de cerere', () => {
    expect(calculateRoundScore(2, 2, 1)).toBe(-10)
    expect(calculateRoundScore(6, 6, 3)).toBe(-10)
    expect(calculateRoundScore(1, 1, 0)).toBe(-10)
  })

  it('mai multe câștigate decât cerute: scorul e exact numărul de mâini câștigate', () => {
    expect(calculateRoundScore(2, 2, 3)).toBe(3)
    expect(calculateRoundScore(3, 3, 5)).toBe(5)
    expect(calculateRoundScore(1, 1, 4)).toBe(4)
  })

  it('PASS: +5 la zero mâini, altfel exact numărul de mâini', () => {
    expect(calculateRoundScore(5, 'PASS', 0)).toBe(5)
    expect(calculateRoundScore(5, 'PASS', 1)).toBe(1)
    expect(calculateRoundScore(5, 'PASS', 2)).toBe(2)
  })
})

describe('calculateRoundScore — runda 14', () => {
  it('CER 1 + s-a uitat', () => {
    expect(calculateRoundScore(14, 1, 1, 'peek')).toBe(15)
    expect(calculateRoundScore(14, 1, 0, 'peek')).toBe(-30)
  })

  it('CER 1 + nu s-a uitat', () => {
    expect(calculateRoundScore(14, 1, 1, 'noPeek')).toBe(60)
    expect(calculateRoundScore(14, 1, 0, 'noPeek')).toBe(-60)
  })

  it('PASS + s-a uitat / nu s-a uitat, indiferent de câte mâini a luat efectiv', () => {
    expect(calculateRoundScore(14, 'PASS', 0, 'peek')).toBe(15)
    expect(calculateRoundScore(14, 'PASS', 0, 'noPeek')).toBe(30)
  })

  it('PASS + a luat totuși mâna: scor fix +1, indiferent de peek', () => {
    expect(calculateRoundScore(14, 'PASS', 1, 'peek')).toBe(1)
    expect(calculateRoundScore(14, 'PASS', 1, 'noPeek')).toBe(1)
  })
})

describe('calculateBile', () => {
  it('împarte totalul la 10, fără rotunjire', () => {
    expect(calculateBile(350)).toBe(35)
    expect(calculateBile(175)).toBe(17.5)
    expect(calculateBile(-30)).toBe(-3)
  })
})
