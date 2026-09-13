import { PublicPlayer } from '@foaica/shared'
import { CardBack } from './Card'
import { Point } from '../lib/layout'

interface Props {
  player: PublicPlayer
  position: Point
  isMe: boolean
  isCurrentTurn: boolean
}

export default function PlayerSeat({ player, position, isMe, isCurrentTurn }: Props) {
  const initial = player.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-all duration-300"
      style={{ left: `${position.leftPct}%`, top: `${position.topPct}%` }}
    >
      <div
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg font-bold ${
          isCurrentTurn
            ? 'border-gold bg-gold/20 text-gold shadow-[0_0_14px_rgba(201,162,75,0.7)]'
            : isMe
              ? 'border-good/60 bg-felt-800 text-paper'
              : 'border-felt-600 bg-felt-800 text-paper/80'
        }`}
      >
        {initial}
        {isCurrentTurn && (
          <span className="absolute inset-0 animate-ping rounded-full border-2 border-gold opacity-40" />
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-felt-950 ${
            player.connected ? 'bg-good' : 'bg-bad'
          }`}
        />
      </div>

      <span className="max-w-[5rem] truncate text-center text-[11px] font-medium text-paper">
        {isMe ? 'Tu' : player.name}
      </span>

      <div className="flex -space-x-2">
        {Array.from({ length: Math.min(player.handCount, 4) }).map((_, i) => (
          <CardBack key={i} size="sm" />
        ))}
      </div>

      <div className="flex gap-1 text-[9px] text-paper/50">
        <span>cere: {player.bid === null ? '?' : player.bid === 'PASS' ? 'P' : player.bid}</span>
        <span>·</span>
        <span>luate: {player.tricksWon}</span>
      </div>

      {isCurrentTurn && isMe && (
        <span className="rounded bg-gold px-2 py-0.5 text-[10px] font-bold text-felt-950">RÂNDUL TĂU</span>
      )}
    </div>
  )
}
