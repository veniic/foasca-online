import { useState } from 'react'
import { Bid, Card, ClientGameState } from '@foaica/shared'
import { PlayingCard, CardBack } from '../components/Card'
import PeekModal from '../components/PeekModal'
import RoundTable from '../components/RoundTable'
import ScoreSheet from './ScoreSheet'

interface Props {
  state: ClientGameState
  onSubmitBid: (bid: Bid) => void
  onSubmitPeek: (choice: 'peek' | 'noPeek') => void
  onPlayCard: (card: Card) => void
  onPlayHiddenCard: () => void
  onContinueAfterRound: () => void
}

export default function GameTable({
  state,
  onSubmitBid,
  onSubmitPeek,
  onPlayCard,
  onPlayHiddenCard,
  onContinueAfterRound,
}: Props) {
  const [showSheet, setShowSheet] = useState(false)

  const me = state.players.find((p) => p.id === state.myId)
  const isMyTurn = state.currentTurnPlayerId === state.myId
  const isHost = state.myId === state.hostId

  return (
    <div className="flex min-h-screen flex-col pb-4">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-felt-700 px-4 py-2">
        <p className="text-xs text-paper/50">
          Runda {state.round}/14 · mâna {Math.min(state.trickNumber, state.cardsThisRound)}/{state.cardsThisRound}
        </p>
        <button onClick={() => setShowSheet(true)} className="rounded-md border border-felt-600 px-2 py-1 text-xs text-paper">
          Scor
        </button>
      </header>

      {/* Masa rotundă, cu jucătorii în jur */}
      <div className="px-3 py-4">
        <RoundTable state={state} />
      </div>

      {/* Bidding declarations so far */}
      {state.phase === 'BIDDING' && (
        <div className="mx-4 mb-2 flex flex-wrap justify-center gap-2 text-xs text-paper/60">
          {state.biddingOrder.map((id) => {
            const p = state.players.find((pl) => pl.id === id)!
            return (
              <span key={id} className="rounded bg-felt-800 px-2 py-1">
                {p.name}: {p.bid === null ? '?' : p.bid === 'PASS' ? 'PASS' : p.bid}
              </span>
            )
          })}
        </div>
      )}

      {/* Bidding controls — opțiunile depind DOAR de câte cărți sunt în rundă,
          niciodată de ce au ales ceilalți jucători */}
      {isMyTurn && state.phase === 'BIDDING' && (
        <div className="mb-3 flex flex-wrap justify-center gap-2 px-4">
          {state.validBidOptions.map((opt) => (
            <button
              key={String(opt)}
              onClick={() => onSubmitBid(opt)}
              className="min-w-[3rem] rounded-md border border-gold bg-gold/10 px-3 py-3 font-bold text-gold active:bg-gold active:text-felt-950"
            >
              {opt === 'PASS' ? 'PASS' : opt}
            </button>
          ))}
        </div>
      )}

      {/* Round result panel */}
      {state.phase === 'ROUND_RESULT' && (
        <div className="mx-4 mb-3 rounded-md border border-gold/40 bg-felt-900 p-4 text-center">
          <p className="mb-2 text-sm font-bold text-gold">Runda {state.round} — scoruri</p>
          <div className="mb-3 flex flex-wrap justify-center gap-3 text-sm">
            {state.players.map((p) => {
              const entry = state.history.find((h) => h.round === state.round)
              const score = entry?.scores[p.id] ?? 0
              return (
                <span key={p.id} className={score < 0 ? 'text-bad' : 'text-good'}>
                  {p.name}: {score < 0 ? `X (${score})` : `+${score}`}
                </span>
              )
            })}
          </div>
          {isHost ? (
            <button onClick={onContinueAfterRound} className="rounded-md bg-good px-6 py-2 font-bold text-felt-950">
              Continuă
            </button>
          ) : (
            <p className="text-xs text-paper/40">Se așteaptă hostul…</p>
          )}
        </div>
      )}

      {/* Cartea ascunsă a rundei 14 (jucătorul a ales "nu m-am uitat") */}
      {me && state.hiddenCardPending && state.phase === 'PLAYING_TRICK' && (
        <div className="mx-auto mb-3 flex flex-col items-center gap-2">
          <CardBack size="lg" />
          <p className="text-xs text-paper/50">Nu te-ai uitat la carte — o joci orbește.</p>
          {isMyTurn && (
            <button
              onClick={onPlayHiddenCard}
              className="rounded-md bg-gold px-5 py-3 font-bold text-felt-950 active:opacity-80"
            >
              JOACĂ ORB
            </button>
          )}
        </div>
      )}

      {/* My hand */}
      {me &&
        !state.hiddenCardPending &&
        state.phase !== 'ROUND_RESULT' &&
        state.phase !== 'FINAL_RESULT' && (
          <div className="mt-auto px-3 pt-2">
            <p className="mb-1 text-center text-xs text-paper/40">
              Cărțile mele
              {state.round === 14 && state.myHand.length > 0 ? ' (te-ai uitat la carte)' : ''}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {state.myHand.map((c) => {
                const id = `${c.rank}-${c.suit}`
                const playable = state.phase === 'PLAYING_TRICK' && isMyTurn && state.validCardIds.includes(id)
                return (
                  <PlayingCard
                    key={id}
                    card={c}
                    size="lg"
                    selectable={playable}
                    disabled={state.phase === 'PLAYING_TRICK' && isMyTurn && !playable}
                    onClick={() => playable && onPlayCard(c)}
                  />
                )
              })}
            </div>
          </div>
        )}

      {isMyTurn && (state.phase === 'BIDDING' || (state.phase === 'PLAYING_TRICK' && !state.hiddenCardPending)) && (
        <p className="mb-1 mt-2 text-center text-sm font-bold text-gold">ESTE RÂNDUL TĂU</p>
      )}

      {state.awaitingMyPeekAnswer && <PeekModal onAnswer={onSubmitPeek} />}
      {showSheet && <ScoreSheet state={state} onClose={() => setShowSheet(false)} />}
    </div>
  )
}
