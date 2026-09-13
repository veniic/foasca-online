import { ClientGameState } from '@foaica/shared'
import { computeSeatAngles, pointOnEllipse, rotateToFirst } from '../lib/layout'
import PlayerSeat from './PlayerSeat'
import { PlayingCard } from './Card'
import TrumpCard from './TrumpCard'

interface Props {
  state: ClientGameState
}

// Raza scaunelor (aproape de marginea ovalului) vs. raza cărților jucate
// (mai aproape de centru, dar păstrând aceeași direcție unghiulară).
const SEAT_RX = 40
const SEAT_RY = 38
const CARD_RX = 19
const CARD_RY = 17

export default function RoundTable({ state }: Props) {
  const rotated = rotateToFirst(state.players, (p) => p.id === state.myId)
  const angles = computeSeatAngles(rotated.length)
  const angleByPlayerId = new Map(rotated.map((p, i) => [p.id, angles[i]]))

  const turnPlayerName = state.players.find((p) => p.id === state.currentTurnPlayerId)?.name

  return (
    <div className="relative mx-auto aspect-[10/9] w-full max-w-md">
      {/* Ovalul mesei */}
      <div className="absolute inset-[6%] rounded-[50%] border-4 border-felt-600/60 bg-gradient-to-br from-felt-700 to-felt-900 shadow-inner" />

      {/* Cozul — poziționat logic, în colțul din dreapta-sus al mesei */}
      <div className="absolute right-[10%] top-[8%] z-20">
        <TrumpCard state={state} />
      </div>

      {/* Statusul central, când nu sunt cărți pe masă */}
      {state.currentTrick.length === 0 && (
        <div className="absolute left-1/2 top-1/2 z-10 w-40 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-xs leading-snug text-paper/40">
            {state.phase === 'BIDDING'
              ? turnPlayerName
                ? `${turnPlayerName} declară`
                : 'Se așteaptă cererile…'
              : state.phase === 'ROUND_14_LOOK_PHASE'
                ? 'Runda 14 — decizii…'
                : 'Masă goală'}
          </p>
        </div>
      )}

      {/* Cărțile jucate în mâna curentă, aliniate spre centru pe direcția jucătorului */}
      {state.currentTrick.map((pc) => {
        const angle = angleByPlayerId.get(pc.playerId) ?? 90
        const pos = pointOnEllipse(angle, CARD_RX, CARD_RY)
        const isWinner = state.phase === 'TRICK_RESULT' && state.lastTrickWinnerId === pc.playerId
        const playerName = state.players.find((p) => p.id === pc.playerId)?.name ?? '?'
        return (
          <div
            key={pc.playerId}
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
            style={{ left: `${pos.leftPct}%`, top: `${pos.topPct}%` }}
          >
            <PlayingCard card={pc.card} size="sm" highlight={isWinner} />
            {isWinner && <span className="text-[9px] font-bold text-gold">{playerName} ✓</span>}
          </div>
        )
      })}

      {/* Locurile jucătorilor, în jurul ovalului */}
      {rotated.map((player, i) => (
        <PlayerSeat
          key={player.id}
          player={player}
          position={pointOnEllipse(angles[i], SEAT_RX, SEAT_RY)}
          isMe={player.id === state.myId}
          isCurrentTurn={player.id === state.currentTurnPlayerId}
        />
      ))}
    </div>
  )
}
