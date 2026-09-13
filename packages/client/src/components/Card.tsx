import { Card as CardType, SUIT_SYMBOL, isSpecialJack } from '@foaica/shared'

interface FaceUpProps {
  card: CardType
  size?: 'sm' | 'md' | 'lg'
  selectable?: boolean
  disabled?: boolean
  highlight?: boolean
  onClick?: () => void
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'w-9 text-xs',
  md: 'w-14 text-sm',
  lg: 'w-20 text-lg',
}

export function PlayingCard({ card, size = 'md', selectable, disabled, highlight, onClick }: FaceUpProps) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
  const special = isSpecialJack(card)
  return (
    <button
      type="button"
      disabled={!selectable || disabled}
      onClick={onClick}
      className={`playing-card relative ${isRed ? 'red' : ''} ${SIZE_CLASSES[size]} ${
        selectable && !disabled ? 'active:scale-95 active:-translate-y-1 transition-transform' : ''
      } ${disabled ? 'opacity-40 grayscale' : ''} ${highlight ? 'ring-2 ring-gold -translate-y-2' : ''}`}
      style={{ transition: 'transform 120ms ease' }}
    >
      <span>{card.rank}</span>
      <span className={`self-center ${size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-sm'}`}>
        {SUIT_SYMBOL[card.suit]}
      </span>
      <span className="self-end rotate-180">{card.rank}</span>
      {special && <span className="absolute top-0 right-0 -mt-1 -mr-1 text-[8px]">★</span>}
    </button>
  )
}

export function CardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <div className={`playing-card-back ${SIZE_CLASSES[size]}`} />
}
