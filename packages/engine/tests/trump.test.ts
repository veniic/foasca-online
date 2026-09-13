import { describe, expect, it } from 'vitest'
import { determineTrump } from '../src/trump'

describe('determineTrump', () => {
  it('stabilește cozul normal după culoarea cărții întoarse', () => {
    const result = determineTrump({ suit: 'hearts', rank: '9' })
    expect(result.suit).toBe('hearts')
    expect(result.noTrump).toBe(false)
  })

  it('dacă J♣ este cartea de coz, nu există coz în rundă', () => {
    const result = determineTrump({ suit: 'clubs', rank: 'J' })
    expect(result.suit).toBeNull()
    expect(result.noTrump).toBe(true)
  })

  it('J-ul de altă culoare NU declanșează regula specială', () => {
    const result = determineTrump({ suit: 'hearts', rank: 'J' })
    expect(result.suit).toBe('hearts')
    expect(result.noTrump).toBe(false)
  })
})
